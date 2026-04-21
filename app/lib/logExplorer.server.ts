import { type Env, parseEnv } from "./env.server";
import { buildSelect, safeIdent, escapeSqlString } from "./sql";
import { MAX_RAYID_CHUNK } from "./constants";

/**
 * Log Explorer SQL API client
 * Queries http_requests and firewall_events datasets via Cloudflare's Log Explorer SQL API
 */

export interface HttpRequestRow {
  EdgeStartTimestamp: string;
  ClientRequestMethod: string;
  ClientRequestPath: string;
  ClientRequestURI: string;
  EdgeResponseStatus: number;
  OriginResponseStatus?: number;
  RayID: string;
  ClientRequestHost: string;

  // New geo/network fields
  ClientCountry?: string;
  ClientRegionCode?: string;
  ClientCity?: string;
  ClientASN?: number;
  ClientIP?: string;

  // New device/UA/bot fields
  ClientDeviceType?: string;
  ClientRequestUserAgent?: string;
  BotScore?: number;
  VerifiedBotCategory?: string;

  // New host/referer/cache fields
  ClientRequestReferer?: string;
  CacheCacheStatus?: string;

  // New security fields
  WAFAttackScore?: number;
  WAFSQLiAttackScore?: number;
  WAFXSSAttackScore?: number;
  WAFRCEAttackScore?: number;
  SecurityAction?: string;
  SecurityRuleID?: string;
  SecurityRuleDescription?: string;
}

export interface FirewallEventRow {
  Datetime: string;
  Action: string;
  Source: string;
  RuleID?: string;
  RuleMessage?: string;
  RayID: string;
  ClientRequestPath: string;

  // New fields
  Description?: string;
  Kind?: string;
  Ref?: string;
  MatchIndex?: number;
  Metadata?: string; // Often JSON
  ClientRequestQuery?: string;
  EdgeResponseStatus?: number;
  OriginResponseStatus?: number;
}

export interface LogExplorerResult {
  httpRequests: HttpRequestRow[];
  firewallEvents: FirewallEventRow[];
  truncated: boolean;
}

export class ReportError extends Error {
  public status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.name = "ReportError";
  }
}

async function runSqlQuery(
  envData: Env,
  sql: string,
  columns?: string[],
): Promise<{ rows: unknown[]; truncated: boolean }> {
  const url = `https://api.cloudflare.com/client/v4/zones/${envData.CF_ZONE_ID}/logs/explorer/query/sql?query=${encodeURIComponent(sql.trim())}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${envData.CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Log Explorer API error (${response.status}):`, text);
    throw new ReportError(
      `Failed to fetch data from Cloudflare Log Explorer.`,
      response.status === 401 || response.status === 403 ? 401 : 500,
    );
  }

  const data = (await response.json()) as {
    success: boolean;
    result?: unknown[];
    errors?: Array<{ code: number; message: string }>;
    messages?: string[];
  };

  if (!data.success) {
    const errorMsg =
      data.errors?.map((e) => e.message).join(", ") ?? "Unknown error";
    console.error("Log Explorer query failed:", errorMsg);
    throw new ReportError(
      `Log Explorer query failed. Please check query syntax and permissions.`,
    );
  }

  const rows = Array.isArray(data.result) ? data.result : [];
  let mappedRows = rows;
  if (columns) {
    const colMap = new Map<string, string>();
    for (const c of columns) {
      const parts = c.split(/ as /i);
      const key = parts.length > 1 ? parts[1].trim() : c.trim();
      colMap.set(key.toLowerCase(), key);
    }
    mappedRows = rows.map((r: any) => {
      const obj: any = {};
      for (const [k, v] of Object.entries(r)) {
        const correctKey = colMap.get(k.toLowerCase()) || k;
        obj[correctKey] = v;
      }
      return obj;
    });
  }
  const truncated = rows.length >= envData.MAX_ROWS;

  return { rows: mappedRows, truncated };
}

export async function fetchStudentLogs(
  rawEnv: unknown,
  studentId: string,
  startTime: Date,
  endTime: Date,
): Promise<LogExplorerResult> {
  const envData = parseEnv(rawEnv);
  const startIso = startTime.toISOString();
  const endIso = endTime.toISOString();

  const studentIdHeader = safeIdent(envData.STUDENT_ID_HEADER);
  const httpTimeCol = safeIdent(envData.HTTP_TIME_COL);
  const fwTimeCol = safeIdent(envData.FW_TIME_COL);
  const maxRows = envData.MAX_ROWS;

  // 1. Query http_requests
  const httpCols = [
    httpTimeCol,
    "ClientRequestMethod",
    "ClientRequestPath",
    "ClientRequestURI",
    "EdgeResponseStatus",
    "OriginResponseStatus",
    "RayID",
    "ClientRequestHost",
    "ClientCountry",
    "ClientRegionCode",
    "ClientCity",
    "ClientASN",
    "ClientIP",
    "ClientDeviceType",
    "ClientRequestUserAgent",
    "BotScore",
    "VerifiedBotCategory",
    "ClientRequestReferer",
    "CacheCacheStatus",
    "WAFAttackScore",
    "WAFSQLiAttackScore",
    "WAFXSSAttackScore",
    "WAFRCEAttackScore",
    "SecurityAction",
    "SecurityRuleID",
    "SecurityRuleDescription",
    `requestheaders.'${studentIdHeader}' as StudentId`,
  ];

  const httpSql = buildSelect({
    from: "http_requests",
    columns: httpCols,
    where: [
      `requestheaders.'${studentIdHeader}' == '${escapeSqlString(studentId)}'`,
      `${httpTimeCol} >= '${escapeSqlString(startIso)}'`,
      `${httpTimeCol} <= '${escapeSqlString(endIso)}'`,
    ],
    orderBy: `${httpTimeCol} ASC`,
    limit: maxRows,
  });

  const httpResult = await runSqlQuery(envData, httpSql, httpCols);
  const httpRequests = httpResult.rows as HttpRequestRow[];

  // Extract distinct RayIDs
  const rayIds = Array.from(
    new Set(httpRequests.map((r) => r.RayID).filter(Boolean)),
  );

  if (rayIds.length === 0) {
    return {
      httpRequests,
      firewallEvents: [],
      truncated: httpResult.truncated,
    };
  }

  // 2. Query firewall_events chunked by RayID
  const fwCols = [
    fwTimeCol,
    "Action",
    "Source",
    "RuleID",
    "RayID",
    "ClientRequestPath",
    "Description",
    "Kind",
    "Ref",
    "MatchIndex",
    "Metadata",
    "ClientRequestQuery",
    "EdgeResponseStatus",
    "OriginResponseStatus",
  ];

  const firewallEvents: FirewallEventRow[] = [];
  let fwTruncated = false;

  // Chunk RayIDs and run in parallel (concurrency bounded implicitly by chunk count, could add explicit limit if huge)
  const chunks = [];
  for (let i = 0; i < rayIds.length; i += MAX_RAYID_CHUNK) {
    chunks.push(rayIds.slice(i, i + MAX_RAYID_CHUNK));
  }

  const concurrencyLimit = 4;
  for (let i = 0; i < chunks.length; i += concurrencyLimit) {
    const batch = chunks.slice(i, i + concurrencyLimit);
    const promises = batch.map(async (chunk) => {
      const rayIdList = chunk.map((r) => `'${escapeSqlString(r)}'`).join(", ");
      const fwSql = buildSelect({
        from: "firewall_events",
        columns: fwCols,
        where: [
          `${fwTimeCol} >= '${escapeSqlString(startIso)}'`,
          `${fwTimeCol} <= '${escapeSqlString(endIso)}'`,
          `RayID IN (${rayIdList})`,
        ],
        orderBy: `${fwTimeCol} ASC`,
        limit: maxRows,
      });
      return runSqlQuery(envData, fwSql, fwCols);
    });

    const results = await Promise.all(promises);
    for (const res of results) {
      firewallEvents.push(...(res.rows as FirewallEventRow[]));
      if (res.truncated) fwTruncated = true;
    }
  }

  // Re-sort firewall events by time just in case chunks returned out of order
  firewallEvents.sort(
    (a, b) => new Date(a.Datetime).getTime() - new Date(b.Datetime).getTime(),
  );

  return {
    httpRequests,
    firewallEvents,
    truncated: httpResult.truncated || fwTruncated,
  };
}

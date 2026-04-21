/**
 * Report aggregation logic
 * Joins http_requests and firewall_events data to produce user-facing statistics
 */

import type {
  HttpRequestRow,
  FirewallEventRow,
  LogExplorerResult,
} from "./logExplorer.server";
import { MAX_TIMELINE_SLICE } from "./constants";

export interface RuleMatch {
  ruleId?: string;
  description?: string;
  action: string;
  source: string;
  kind?: string;
}

export interface TimelineEntry {
  ts: string;
  path: string;
  query: string;
  edgeStatus: number;
  originStatus?: number;
  action?: string;
  ruleId?: string;
  source?: string;
  rayId: string;
  method: string;
  host: string;

  country?: string;
  ip?: string;
  userAgent?: string;
  deviceType?: string;
  referrer?: string;
  cacheStatus?: string;
  botScore?: number;
  attackScore?: number;
  ruleMatches: RuleMatch[];
}

export interface ActionBreakdown {
  block: number;
  managed_challenge: number;
  challenge: number;
  js_challenge: number;
  log: number;
  allow: number;
  skip: number;
  other: number;
}

export interface SourceBreakdown {
  managed: number;
  waf: number;
  firewallrules: number;
  ratelimit: number;
  bic: number;
  hot: number;
  l7ddos: number;
  uablock: number;
  country: number;
  ip: number;
  zonlockdown: number;
  other: number;
}

export interface HourlySeries {
  hour: string;
  requests: number;
  blocked: number;
  challenged: number;
  logged: number;
}

export interface TopPath {
  path: string;
  count: number;
}

export interface TopQueryParam {
  key: string;
  count: number;
}

export interface ReportData {
  studentId: string;
  startTime: string;
  endTime: string;
  totals: {
    totalRequests: number;
    wafTriggered: number;
    wafBlocked: number;
    managedChallenges: number;
    distinctIps: number;
    distinctCountries: number;
    distinctHosts: number;
    distinctRules: number;
  };
  actionBreakdown: ActionBreakdown;
  sourceBreakdown: SourceBreakdown;
  geo: {
    topCountries: { code: string; count: number }[];
    topASNs: { asn: number; count: number }[];
  };
  devices: {
    deviceTypes: { type: string; count: number }[];
    topUserAgents: { ua: string; count: number }[];
    botSummary: {
      likelyBots: number;
      verifiedBots: number;
      avgScore: number | null;
    };
  };
  hosts: {
    topHosts: { host: string; count: number }[];
    topReferrers: { referrer: string; count: number }[];
    cacheStatus: { status: string; count: number }[];
  };
  triggeredRules: {
    ruleId: string;
    description: string;
    kind: string;
    source: string;
    action: string;
    ref: string;
    hits: number;
    exampleRayId: string;
  }[];
  attackScoreBuckets: {
    overall: number[];
    sqli: number[];
    xss: number[];
    rce: number[];
  };
  errorSummary: { path: string; status: number; count: number }[];
  timeline: TimelineEntry[];
  topPaths: TopPath[];
  topQueryParams: TopQueryParam[];
  hourlySeries: HourlySeries[];
  truncated: boolean;
  timelineHasMore: boolean;
}

function parseQueryString(uri: string): string {
  try {
    const url = new URL(uri, "http://localhost");
    return url.search;
  } catch {
    return "";
  }
}

function extractQueryParams(uri: string): Map<string, number> {
  const counts = new Map<string, number>();
  try {
    const url = new URL(uri, "http://localhost");
    for (const [key] of url.searchParams) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  } catch {
    // Ignore invalid URIs
  }
  return counts;
}

function normalizeAction(action: string): keyof ActionBreakdown {
  if (!action) return "other";
  const a = action.toLowerCase().replace(/\s+/g, "_");
  if (a === "block") return "block";
  if (a === "managed_challenge") return "managed_challenge";
  if (a === "challenge") return "challenge";
  if (a === "js_challenge") return "js_challenge";
  if (a === "log") return "log";
  if (a === "allow") return "allow";
  if (a === "skip") return "skip";
  return "other";
}

function normalizeSource(source: string): keyof SourceBreakdown {
  if (!source) return "other";
  const s = source.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
  if (s === "managed") return "managed";
  if (s === "waf") return "waf";
  if (s === "firewallrules" || s === "firewall_rules") return "firewallrules";
  if (s === "ratelimit" || s === "rate_limit") return "ratelimit";
  if (s === "bic") return "bic";
  if (s === "hot") return "hot";
  if (s === "l7ddos" || s === "layer7ddos") return "l7ddos";
  if (s === "uablock" || s === "ua_block") return "uablock";
  if (s === "country") return "country";
  if (s === "ip") return "ip";
  if (s === "zonlockdown" || s === "zone_lockdown") return "zonlockdown";
  return "other";
}

function getBucketIndex(score?: number): number {
  if (score === undefined || score === null) return -1;
  if (score < 20) return 0; // Very likely attack
  if (score < 80) return 1; // Likely attack
  return 2; // Clean
}

export function aggregateReport(
  studentId: string,
  startTime: Date,
  endTime: Date,
  data: LogExplorerResult,
  fullTimeline = false,
): ReportData {
  const httpRequests = data?.httpRequests ?? [];
  const firewallEvents = data?.firewallEvents ?? [];
  const truncated = data?.truncated ?? false;

  // Build a map of RayID -> firewall events for joining
  const fwByRayId = new Map<string, FirewallEventRow[]>();
  for (const fw of firewallEvents) {
    const list = fwByRayId.get(fw.RayID) ?? [];
    list.push(fw);
    fwByRayId.set(fw.RayID, list);
  }

  const timeline: TimelineEntry[] = [];
  const pathCounts = new Map<string, number>();
  const queryParamCounts = new Map<string, number>();
  const hourlyBuckets = new Map<
    string,
    { requests: number; blocked: number; challenged: number; logged: number }
  >();

  const actionBreakdown: ActionBreakdown = {
    block: 0,
    managed_challenge: 0,
    challenge: 0,
    js_challenge: 0,
    log: 0,
    allow: 0,
    skip: 0,
    other: 0,
  };
  const sourceBreakdown: SourceBreakdown = {
    managed: 0,
    waf: 0,
    firewallrules: 0,
    ratelimit: 0,
    bic: 0,
    hot: 0,
    l7ddos: 0,
    uablock: 0,
    country: 0,
    ip: 0,
    zonlockdown: 0,
    other: 0,
  };

  // Aggregation Maps
  const ips = new Set<string>();
  const countries = new Map<string, number>();
  const asns = new Map<number, number>();
  const deviceTypes = new Map<string, number>();
  const userAgents = new Map<string, number>();
  const hosts = new Map<string, number>();
  const referrers = new Map<string, number>();
  const cacheStatus = new Map<string, number>();
  const triggeredRules = new Map<
    string,
    {
      description: string;
      kind: string;
      source: string;
      action: string;
      ref: string;
      hits: number;
      exampleRayId: string;
    }
  >();
  const errorSummaryMap = new Map<string, { status: number; count: number }>();

  let botScoreSum = 0;
  let botScoreCount = 0;
  let likelyBots = 0;
  let verifiedBots = 0;

  const attackScoreBuckets = {
    overall: [0, 0, 0],
    sqli: [0, 0, 0],
    xss: [0, 0, 0],
    rce: [0, 0, 0],
  };

  // Count WAF actions by iterating firewall events
  for (const fw of firewallEvents) {
    const actionKey = normalizeAction(fw.Action);
    actionBreakdown[actionKey]++;

    const sourceKey = normalizeSource(fw.Source);
    sourceBreakdown[sourceKey]++;

    // Aggregate rules
    const rId = fw.RuleID || "unknown";
    const ruleInfo = triggeredRules.get(rId) || {
      description: fw.Description || "",
      kind: fw.Kind || "",
      source: fw.Source || "",
      action: fw.Action || "",
      ref: fw.Ref || "",
      hits: 0,
      exampleRayId: fw.RayID,
    };
    ruleInfo.hits++;
    // capture richer descriptions if available
    if (fw.Description && !ruleInfo.description)
      ruleInfo.description = fw.Description;
    triggeredRules.set(rId, ruleInfo);
  }

  // Process http requests
  for (const req of httpRequests) {
    const fwList = fwByRayId.get(req.RayID) ?? [];

    // Geo & Network
    if (req.ClientIP) ips.add(req.ClientIP);
    if (req.ClientCountry)
      countries.set(
        req.ClientCountry,
        (countries.get(req.ClientCountry) ?? 0) + 1,
      );
    if (req.ClientASN)
      asns.set(req.ClientASN, (asns.get(req.ClientASN) ?? 0) + 1);

    // Devices & Bots
    if (req.ClientDeviceType)
      deviceTypes.set(
        req.ClientDeviceType,
        (deviceTypes.get(req.ClientDeviceType) ?? 0) + 1,
      );
    if (req.ClientRequestUserAgent)
      userAgents.set(
        req.ClientRequestUserAgent,
        (userAgents.get(req.ClientRequestUserAgent) ?? 0) + 1,
      );
    if (req.BotScore !== undefined) {
      botScoreSum += req.BotScore;
      botScoreCount++;
      if (req.BotScore < 30) likelyBots++;
    }
    if (req.VerifiedBotCategory) verifiedBots++;

    // Hosts & Referrers & Cache
    if (req.ClientRequestHost)
      hosts.set(
        req.ClientRequestHost,
        (hosts.get(req.ClientRequestHost) ?? 0) + 1,
      );
    if (req.ClientRequestReferer)
      referrers.set(
        req.ClientRequestReferer,
        (referrers.get(req.ClientRequestReferer) ?? 0) + 1,
      );
    if (req.CacheCacheStatus)
      cacheStatus.set(
        req.CacheCacheStatus,
        (cacheStatus.get(req.CacheCacheStatus) ?? 0) + 1,
      );

    // Attack Scores
    const idxOverall = getBucketIndex(req.WAFAttackScore);
    if (idxOverall >= 0) attackScoreBuckets.overall[idxOverall]++;
    const idxSqli = getBucketIndex(req.WAFSQLiAttackScore);
    if (idxSqli >= 0) attackScoreBuckets.sqli[idxSqli]++;
    const idxXss = getBucketIndex(req.WAFXSSAttackScore);
    if (idxXss >= 0) attackScoreBuckets.xss[idxXss]++;
    const idxRce = getBucketIndex(req.WAFRCEAttackScore);
    if (idxRce >= 0) attackScoreBuckets.rce[idxRce]++;

    // Errors
    if (req.EdgeResponseStatus >= 400) {
      const key = `${req.EdgeResponseStatus}:${req.ClientRequestPath}`;
      const errSum = errorSummaryMap.get(key) || {
        status: req.EdgeResponseStatus,
        count: 0,
      };
      errSum.count++;
      errorSummaryMap.set(key, errSum);
    }

    // Count paths
    pathCounts.set(
      req.ClientRequestPath,
      (pathCounts.get(req.ClientRequestPath) ?? 0) + 1,
    );

    // Count query params
    const qpMap = extractQueryParams(req.ClientRequestURI);
    for (const [key, count] of qpMap) {
      queryParamCounts.set(key, (queryParamCounts.get(key) ?? 0) + count);
    }

    // Hourly bucket
    const timestamp = req.EdgeStartTimestamp ?? new Date().toISOString();
    const hour = timestamp.slice(0, 13) + ":00:00Z"; // Truncate to hour
    const bucket = hourlyBuckets.get(hour) ?? {
      requests: 0,
      blocked: 0,
      challenged: 0,
      logged: 0,
    };
    bucket.requests++;

    let wasBlocked = false;
    let wasChallenged = false;
    let wasLogged = false;

    const ruleMatches: RuleMatch[] = [];
    for (const fw of fwList) {
      const action = normalizeAction(fw.Action);
      if (action === "block") wasBlocked = true;
      if (
        action === "managed_challenge" ||
        action === "challenge" ||
        action === "js_challenge"
      ) {
        wasChallenged = true;
      }
      if (action === "log") wasLogged = true;

      ruleMatches.push({
        ruleId: fw.RuleID,
        description: fw.Description || "",
        action: fw.Action,
        source: fw.Source,
        kind: fw.Kind,
      });
    }

    if (wasBlocked) bucket.blocked++;
    if (wasChallenged) bucket.challenged++;
    if (wasLogged) bucket.logged++;
    hourlyBuckets.set(hour, bucket);

    // Build timeline entry
    timeline.push({
      ts: timestamp,
      path: req.ClientRequestPath,
      query: parseQueryString(req.ClientRequestURI),
      edgeStatus: req.EdgeResponseStatus,
      originStatus: req.OriginResponseStatus,
      action: fwList.length > 0 ? fwList[0].Action : "allow",
      ruleId: fwList[0]?.RuleID,
      source: fwList[0]?.Source,
      rayId: req.RayID,
      method: req.ClientRequestMethod,
      host: req.ClientRequestHost,
      country: req.ClientCountry,
      ip: req.ClientIP,
      userAgent: req.ClientRequestUserAgent,
      deviceType: req.ClientDeviceType,
      referrer: req.ClientRequestReferer,
      cacheStatus: req.CacheCacheStatus,
      botScore: req.BotScore,
      attackScore: req.WAFAttackScore,
      ruleMatches,
    });
  }

  // Sort timeline by timestamp
  timeline.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const timelineHasMore = !fullTimeline && timeline.length > MAX_TIMELINE_SLICE;
  const renderedTimeline = fullTimeline
    ? timeline
    : timeline.slice(0, MAX_TIMELINE_SLICE);

  // Compute tops
  const topPaths = Array.from(pathCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }));
  const topQueryParams = Array.from(queryParamCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({ key, count }));
  const hourlySeries: HourlySeries[] = Array.from(hourlyBuckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([hour, counts]) => ({
      hour,
      requests: counts.requests,
      blocked: counts.blocked,
      challenged: counts.challenged,
      logged: counts.logged,
    }));

  const topCountries = Array.from(countries.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));
  const topASNs = Array.from(asns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([asn, count]) => ({ asn, count }));
  const topHosts = Array.from(hosts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([host, count]) => ({ host, count }));
  const topReferrers = Array.from(referrers.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([referrer, count]) => ({ referrer, count }));
  const topUserAgents = Array.from(userAgents.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ua, count]) => ({ ua, count }));

  const cacheStatusArr = Array.from(cacheStatus.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count }));
  const deviceTypesArr = Array.from(deviceTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  const rulesArr = Array.from(triggeredRules.entries())
    .map(([ruleId, data]) => ({ ruleId, ...data }))
    .sort((a, b) => b.hits - a.hits);

  const errorSummary = Array.from(errorSummaryMap.entries())
    .map(([key, data]) => ({
      path: key.split(":")[1],
      status: data.status,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const wafTriggered = firewallEvents.length;
  const wafBlocked = actionBreakdown.block;
  const managedChallenges =
    actionBreakdown.managed_challenge +
    actionBreakdown.challenge +
    actionBreakdown.js_challenge;

  return {
    studentId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    totals: {
      totalRequests: httpRequests.length,
      wafTriggered,
      wafBlocked,
      managedChallenges,
      distinctIps: ips.size,
      distinctCountries: countries.size,
      distinctHosts: hosts.size,
      distinctRules: triggeredRules.size,
    },
    actionBreakdown,
    sourceBreakdown,
    geo: { topCountries, topASNs },
    devices: {
      deviceTypes: deviceTypesArr,
      topUserAgents,
      botSummary: {
        likelyBots,
        verifiedBots,
        avgScore:
          botScoreCount > 0 ? Math.round(botScoreSum / botScoreCount) : null,
      },
    },
    hosts: { topHosts, topReferrers, cacheStatus: cacheStatusArr },
    triggeredRules: rulesArr,
    attackScoreBuckets,
    errorSummary,
    timeline: renderedTimeline,
    topPaths,
    topQueryParams,
    hourlySeries,
    truncated,
    timelineHasMore,
  };
}

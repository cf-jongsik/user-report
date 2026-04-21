import { Box, Paper, Typography, Grid, Chip } from "@mui/material";
import { LinearBar } from "./Charts";
import type { ReportData } from "../lib/report.server";

export function GeoPanel({ geo }: { geo: ReportData["geo"] }) {
  const maxCountry = Math.max(...geo.topCountries.map((c) => c.count), 1);
  const maxAsn = Math.max(...geo.topASNs.map((a) => a.count), 1);
  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: "100%" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Geography & Network
      </Typography>
      <Grid container spacing={2}>
        <Grid size={6}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Top Countries
          </Typography>
          {geo.topCountries.map((c) => (
            <Box key={c.code} sx={{ mb: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption">{c.code}</Typography>
                <Typography variant="caption">{c.count}</Typography>
              </Box>
              <LinearBar value={c.count} max={maxCountry} color="#6750A4" />
            </Box>
          ))}
        </Grid>
        <Grid size={6}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Top ASNs
          </Typography>
          {geo.topASNs.map((a) => (
            <Box key={a.asn} sx={{ mb: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption">AS{a.asn}</Typography>
                <Typography variant="caption">{a.count}</Typography>
              </Box>
              <LinearBar value={a.count} max={maxAsn} color="#7D5260" />
            </Box>
          ))}
        </Grid>
      </Grid>
    </Paper>
  );
}

export function DevicesPanel({ devices }: { devices: ReportData["devices"] }) {
  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: "100%" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Devices & Bots
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Device Types
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {devices.deviceTypes.map((d) => (
            <Chip key={d.type} label={`${d.type}: ${d.count}`} size="small" />
          ))}
        </Box>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Top User Agents
        </Typography>
        {devices.topUserAgents.map((ua) => (
          <Typography
            key={ua.ua}
            variant="caption"
            sx={{
              display: "block",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ua.count}x - {ua.ua}
          </Typography>
        ))}
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Bot Summary
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            label={`Likely Bots: ${devices.botSummary.likelyBots}`}
            color="warning"
            size="small"
          />
          <Chip
            label={`Verified Bots: ${devices.botSummary.verifiedBots}`}
            color="success"
            size="small"
          />
          {devices.botSummary.avgScore !== null && (
            <Chip
              label={`Avg Score: ${devices.botSummary.avgScore}`}
              color="info"
              size="small"
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}

export function HostsPanel({ hosts }: { hosts: ReportData["hosts"] }) {
  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: "100%" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Visited Hosts & Cache
      </Typography>
      <Grid container spacing={2}>
        <Grid size={12}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            {hosts.cacheStatus.map((c) => (
              <Chip
                key={c.status}
                label={`${c.status}: ${c.count}`}
                size="small"
                color={c.status === "hit" ? "success" : "default"}
              />
            ))}
          </Box>
        </Grid>
        <Grid size={6}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Top Hosts
          </Typography>
          {hosts.topHosts.map((h) => (
            <Typography
              key={h.host}
              variant="caption"
              sx={{
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {h.count}x - {h.host}
            </Typography>
          ))}
        </Grid>
        <Grid size={6}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Top Referrers
          </Typography>
          {hosts.topReferrers.map((r) => (
            <Typography
              key={r.referrer}
              variant="caption"
              sx={{
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {r.count}x - {r.referrer}
            </Typography>
          ))}
        </Grid>
      </Grid>
    </Paper>
  );
}

export function TriggeredRulesPanel({
  rules,
}: {
  rules: ReportData["triggeredRules"];
}) {
  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: "100%" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Triggered Security Rules
      </Typography>
      <Box sx={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: 8,
                  borderBottom: "2px solid #E0E0E0",
                  fontSize: 12,
                }}
              >
                Rule ID
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: 8,
                  borderBottom: "2px solid #E0E0E0",
                  fontSize: 12,
                }}
              >
                Description
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: 8,
                  borderBottom: "2px solid #E0E0E0",
                  fontSize: 12,
                }}
              >
                Source
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: 8,
                  borderBottom: "2px solid #E0E0E0",
                  fontSize: 12,
                }}
              >
                Action
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: 8,
                  borderBottom: "2px solid #E0E0E0",
                  fontSize: 12,
                }}
              >
                Hits
              </th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.ruleId}>
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #F0F0F0",
                    fontSize: 12,
                  }}
                >
                  {r.ruleId}
                </td>
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #F0F0F0",
                    fontSize: 12,
                  }}
                >
                  {r.description || "-"}
                </td>
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #F0F0F0",
                    fontSize: 12,
                  }}
                >
                  {r.source}
                </td>
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #F0F0F0",
                    fontSize: 12,
                  }}
                >
                  <Chip
                    size="small"
                    label={r.action}
                    sx={{ fontSize: 10, height: 20 }}
                  />
                </td>
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #F0F0F0",
                    fontSize: 12,
                  }}
                >
                  {r.hits}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Paper>
  );
}

export function AttackScorePanel({
  buckets,
}: {
  buckets: ReportData["attackScoreBuckets"];
}) {
  const BucketRow = ({ title, data }: { title: string; data: number[] }) => {
    const total = data.reduce((a, b) => a + b, 0) || 1;
    return (
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            height: 12,
            width: "100%",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {data[0] > 0 && (
            <Box
              sx={{ width: `${(data[0] / total) * 100}%`, bgcolor: "#B3261E" }}
              title={`Very likely attack: ${data[0]}`}
            />
          )}
          {data[1] > 0 && (
            <Box
              sx={{ width: `${(data[1] / total) * 100}%`, bgcolor: "#F57C00" }}
              title={`Likely attack: ${data[1]}`}
            />
          )}
          {data[2] > 0 && (
            <Box
              sx={{ width: `${(data[2] / total) * 100}%`, bgcolor: "#2E7D32" }}
              title={`Clean: ${data[2]}`}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1, fontSize: 10, color: "#79747E" }}>
          <span>Very Likely: {data[0]}</span>
          <span>Likely: {data[1]}</span>
          <span>Clean: {data[2]}</span>
        </Box>
      </Box>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: "100%" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        WAF Attack Scores
      </Typography>
      <BucketRow title="Overall Score" data={buckets.overall} />
      <BucketRow title="SQLi" data={buckets.sqli} />
      <BucketRow title="XSS" data={buckets.xss} />
      <BucketRow title="RCE" data={buckets.rce} />
    </Paper>
  );
}

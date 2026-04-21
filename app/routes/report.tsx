import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import type { Route } from "./+types/report";
import { fetchStudentLogs } from "~/lib/logExplorer.server";
import { aggregateReport, type ReportData } from "../lib/report.server";
import { dateRangeSchema } from "../lib/validate";
import { theme } from "../lib/theme";
import {
  ThemeProvider,
  Box,
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Paper,
  Chip,
  Grid,
  CircularProgress,
  IconButton,
  Divider,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  Shield as ShieldIcon,
  Security as SecurityIcon,
  Block as BlockIcon,
  VerifiedUser as VerifiedUserIcon,
} from "@mui/icons-material";

import { StatCard } from "../components/StatCard";
import {
  ActionChart,
  SourceChart,
  HourlyTable,
  StatusDistribution,
  MethodDistribution,
} from "../components/Charts";
import { DataTable } from "../components/DataTable";
import {
  GeoPanel,
  DevicesPanel,
  HostsPanel,
  TriggeredRulesPanel,
  AttackScorePanel,
} from "../components/Panels";
import { TimelineEnhanced } from "../components/TimelineEnhanced";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Report for ${params.studentId}` },
    {
      name: "description",
      content: `Activity report for student ${params.studentId}`,
    },
  ];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const studentId = params.studentId;
  const url = new URL(request.url);
  const startStr = url.searchParams.get("start_date");
  const endStr = url.searchParams.get("end_date");

  if (!startStr || !endStr) {
    throw new Response("Missing date parameters", { status: 400 });
  }

  const start = new Date(startStr);
  const end = new Date(endStr);

  const validation = dateRangeSchema.safeParse({ start, end });
  if (!validation.success) {
    const error = validation.error.issues[0]?.message || "Invalid date range";
    throw new Response(error, { status: 400 });
  }

  try {
    const data = await fetchStudentLogs(
      context.cloudflare.env,
      studentId,
      start,
      end,
    );
    const report = aggregateReport(studentId, start, end, data);
    return { report, error: null };
  } catch (err: any) {
    console.error("Loader error:", err);
    const msg =
      err.message || "An unexpected error occurred generating the report.";
    return { report: null, error: msg };
  }
}

function downloadJSON(data: ReportData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report-${data.studentId}-${format(parseISO(data.startTime), "yyyy-MM-dd")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Report({ loaderData }: Route.ComponentProps) {
  const { report, error } = loaderData;

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
            background:
              "linear-gradient(135deg, #EADDFF 0%, #F6EEFF 50%, #FFFBFE 100%)",
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 400,
              width: "100%",
              textAlign: "center",
              borderRadius: 4,
            }}
          >
            <WarningIcon sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
              Error Loading Report
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
              {error}
            </Typography>
            <Button
              component={Link}
              to="/"
              variant="contained"
              startIcon={<ArrowBackIcon />}
              fullWidth
            >
              Back to Home
            </Button>
          </Paper>
        </Box>
      </ThemeProvider>
    );
  }

  if (!report) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, #EADDFF 0%, #F6EEFF 50%, #FFFBFE 100%)",
          }}
        >
          <CircularProgress size={48} sx={{ color: "primary.main" }} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <AppBar
          position="sticky"
          elevation={1}
          sx={{
            bgcolor: "background.paper",
            color: "text.primary",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton
                component={Link}
                to="/"
                sx={{ color: "text.secondary" }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Report for {report.studentId}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {format(parseISO(report.startTime), "MMM d, yyyy HH:mm")} -{" "}
                  {format(parseISO(report.endTime), "MMM d, yyyy HH:mm")}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {report.truncated && (
                <Chip
                  label="Data truncated (hit 10k limit)"
                  size="small"
                  sx={{
                    bgcolor: "warning.light",
                    color: "warning.dark",
                    fontWeight: 500,
                  }}
                />
              )}
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => downloadJSON(report)}
              >
                Export JSON
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Grid container spacing={3}>
            {/* Top Stat Cards */}
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Total Requests"
                value={report.totals.totalRequests.toLocaleString()}
                icon={<ShieldIcon />}
                subtitle={`${report.totals.distinctIps} IPs · ${report.totals.distinctCountries} Countries · ${report.totals.distinctHosts} Hosts`}
                color="#6750A4"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="WAF Triggered"
                value={report.totals.wafTriggered.toLocaleString()}
                icon={<SecurityIcon />}
                subtitle={`${report.totals.distinctRules} unique rules hit`}
                color="#7D5260"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="WAF Blocked"
                value={report.totals.wafBlocked.toLocaleString()}
                icon={<BlockIcon />}
                subtitle={`${(report.totals.totalRequests ? (report.totals.wafBlocked / report.totals.totalRequests) * 100 : 0).toFixed(1)}% block rate`}
                color="#B3261E"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Challenged"
                value={report.totals.managedChallenges.toLocaleString()}
                icon={<VerifiedUserIcon />}
                subtitle={`${(report.totals.totalRequests ? (report.totals.managedChallenges / report.totals.totalRequests) * 100 : 0).toFixed(1)}% challenge rate`}
                color="#4A4458"
              />
            </Grid>

            {/* Section: Traffic & Geography */}
            <Grid size={12}>
              <Typography
                variant="h5"
                sx={{ mt: 2, mb: 1, fontWeight: 600, color: "text.primary" }}
              >
                Traffic & Geography
              </Typography>
              <Divider sx={{ mb: 1 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <GeoPanel geo={report.geo} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <DevicesPanel devices={report.devices} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <HostsPanel hosts={report.hosts} />
            </Grid>

            {/* Section: Security & WAF */}
            <Grid size={12}>
              <Typography
                variant="h5"
                sx={{ mt: 3, mb: 1, fontWeight: 600, color: "text.primary" }}
              >
                Security & WAF
              </Typography>
              <Divider sx={{ mb: 1 }} />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  WAF Actions
                </Typography>
                <ActionChart data={report.actionBreakdown} />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Rule Sources
                </Typography>
                <SourceChart data={report.sourceBreakdown} />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <AttackScorePanel buckets={report.attackScoreBuckets} />
            </Grid>

            <Grid size={12}>
              <TriggeredRulesPanel rules={report.triggeredRules} />
            </Grid>

            {/* Section: Requests & Status */}
            <Grid size={12}>
              <Typography
                variant="h5"
                sx={{ mt: 3, mb: 1, fontWeight: 600, color: "text.primary" }}
              >
                Requests & Status
              </Typography>
              <Divider sx={{ mb: 1 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  HTTP Status
                </Typography>
                <StatusDistribution entries={report.timeline} />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  HTTP Methods
                </Typography>
                <MethodDistribution entries={report.timeline} />
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <DataTable
                title="Top Requested Paths"
                data={report.topPaths}
                columns={[
                  { key: "path", label: "Path" },
                  { key: "count", label: "Requests" },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <DataTable
                title="Top Query Parameters"
                data={report.topQueryParams}
                columns={[
                  { key: "key", label: "Parameter" },
                  { key: "count", label: "Occurrences" },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <DataTable
                title="Top Edge Errors"
                data={report.errorSummary}
                columns={[
                  { key: "status", label: "Status" },
                  { key: "path", label: "Path" },
                  { key: "count", label: "Count" },
                ]}
              />
            </Grid>

            {/* Section: Activity Timeline */}
            <Grid size={12}>
              <Typography
                variant="h5"
                sx={{ mt: 3, mb: 1, fontWeight: 600, color: "text.primary" }}
              >
                Activity Timeline
              </Typography>
              <Divider sx={{ mb: 1 }} />
            </Grid>
            <Grid size={12}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Hourly Activity Breakdown
                </Typography>
                <HourlyTable data={report.hourlySeries} />
              </Paper>
            </Grid>

            <Grid size={12}>
              <TimelineEnhanced
                entries={report.timeline}
                hasMore={report.timelineHasMore}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

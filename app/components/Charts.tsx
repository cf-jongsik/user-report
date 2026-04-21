import { Box, Typography, Chip } from "@mui/material";
import { format, parseISO } from "date-fns";
import type {
  ActionBreakdown,
  SourceBreakdown,
  HourlySeries,
  TimelineEntry,
} from "../lib/report.server";

export function LinearBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <Box
      sx={{
        width: "100%",
        height: 8,
        bgcolor: "#E0E0E0",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: `${percentage}%`,
          height: "100%",
          bgcolor: color,
          borderRadius: 4,
          transition: "width 0.5s ease",
        }}
      />
    </Box>
  );
}

export function ActionChart({ data }: { data: ActionBreakdown }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const colors: Record<string, string> = {
    block: "#B3261E",
    managed_challenge: "#F57C00",
    challenge: "#F9A825",
    js_challenge: "#FFB300",
    log: "#6750A4",
    allow: "#2E7D32",
    skip: "#757575",
    other: "#9E9E9E",
  };

  return (
    <Box sx={{ width: "100%" }}>
      {entries.map(([key, value]) => (
        <Box key={key} sx={{ mb: 2 }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "#1C1B1F" }}
            >
              {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: colors[key] || "#6750A4" }}
            >
              {value.toLocaleString()}
            </Typography>
          </Box>
          <LinearBar value={value} max={max} color={colors[key] || "#6750A4"} />
        </Box>
      ))}
    </Box>
  );
}

export function SourceChart({ data }: { data: SourceBreakdown }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const colors = [
    "#6750A4",
    "#7D5260",
    "#4A4458",
    "#625B71",
    "#B3261E",
    "#F57C00",
    "#2E7D32",
    "#1565C0",
  ];

  return (
    <Box sx={{ width: "100%" }}>
      {entries.map(([key, value], idx) => (
        <Box key={key} sx={{ mb: 2 }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "#1C1B1F" }}
            >
              {key.toUpperCase()}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: colors[idx % colors.length] }}
            >
              {value.toLocaleString()}
            </Typography>
          </Box>
          <LinearBar
            value={value}
            max={max}
            color={colors[idx % colors.length]}
          />
        </Box>
      ))}
    </Box>
  );
}

export function HourlyTable({ data }: { data: HourlySeries[] }) {
  if (data.length === 0) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No hourly data available
        </Typography>
      </Box>
    );
  }

  const maxRequests = Math.max(...data.map((d) => d.requests), 1);

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Chip
          size="small"
          label={`${data.length} hours`}
          sx={{ bgcolor: "#EADDFF" }}
        />
        <Chip
          size="small"
          label={`${data.reduce((a, b) => a + b.requests, 0).toLocaleString()} total`}
          sx={{ bgcolor: "#E8F5E9" }}
        />
        <Chip
          size="small"
          label={`${data.reduce((a, b) => a + b.blocked, 0).toLocaleString()} blocked`}
          sx={{ bgcolor: "#FFEBEE" }}
        />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {data.map((hour, idx) => (
          <Box
            key={idx}
            sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 12 }}
          >
            <Typography
              variant="caption"
              sx={{ minWidth: 45, color: "#79747E" }}
            >
              {format(parseISO(hour.hour), "HH:mm")}
            </Typography>
            <Box sx={{ flex: 1 }}>
              <LinearBar
                value={hour.requests}
                max={maxRequests}
                color="#6750A4"
              />
            </Box>
            <Typography
              variant="caption"
              sx={{ minWidth: 30, textAlign: "right", fontWeight: 500 }}
            >
              {hour.requests}
            </Typography>
            {hour.blocked > 0 && (
              <Chip
                size="small"
                label={hour.blocked}
                sx={{
                  bgcolor: "#FFEBEE",
                  color: "#B3261E",
                  height: 18,
                  fontSize: 10,
                }}
              />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function StatusDistribution({ entries }: { entries: TimelineEntry[] }) {
  const statusCounts = entries.reduce(
    (acc, entry) => {
      const range = Math.floor(entry.edgeStatus / 100) * 100;
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const total = entries.length || 1;
  const colors: Record<number, string> = {
    200: "#2E7D32",
    300: "#1565C0",
    400: "#F57C00",
    500: "#B3261E",
  };

  return (
    <Box>
      {[200, 300, 400, 500].map((range) => {
        const count = statusCounts[range] || 0;
        const pct = ((count / total) * 100).toFixed(1);
        return (
          <Box key={range} sx={{ mb: 2 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {range}s{" "}
                {range === 200
                  ? "(Success)"
                  : range === 300
                    ? "(Redirect)"
                    : range === 400
                      ? "(Client Error)"
                      : "(Server Error)"}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {count.toLocaleString()} ({pct}%)
              </Typography>
            </Box>
            <LinearBar value={count} max={total} color={colors[range]} />
          </Box>
        );
      })}
    </Box>
  );
}

export function MethodDistribution({ entries }: { entries: TimelineEntry[] }) {
  const methodCounts = entries.reduce(
    (acc, entry) => {
      acc[entry.method] = (acc[entry.method] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const total = entries.length || 1;
  const sorted = Object.entries(methodCounts).sort((a, b) => b[1] - a[1]);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {sorted.map(([method, count]) => (
        <Chip
          key={method}
          label={`${method}: ${count} (${((count / total) * 100).toFixed(0)}%)`}
          sx={{
            bgcolor:
              method === "GET"
                ? "#E8F5E9"
                : method === "POST"
                  ? "#E3F2FD"
                  : "#F5F5F5",
            fontWeight: 500,
          }}
        />
      ))}
    </Box>
  );
}

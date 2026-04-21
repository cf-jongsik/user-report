import { useState, useMemo, useEffect } from "react";
import {
  Paper,
  Box,
  Typography,
  Chip,
  Collapse,
  IconButton,
} from "@mui/material";
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import type { TimelineEntry } from "../lib/report.server";
import {
  TIMELINE_FILTER_DEBOUNCE_MS,
  MAX_TIMELINE_RENDER,
} from "../lib/constants";

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const [expanded, setExpanded] = useState(false);

  const getActionColor = (action?: string) => {
    if (!action || action === "allow") return "#2E7D32";
    if (action === "block") return "#B3261E";
    if (action.includes("challenge")) return "#F57C00";
    return "#6750A4";
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: "#FAFAFA",
        border: "1px solid #F0F0F0",
        mb: 1,
      }}
    >
      <Box
        sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}
      >
        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
        <Typography
          variant="caption"
          sx={{ color: "#79747E", minWidth: 100, fontFamily: "monospace" }}
        >
          {format(parseISO(entry.ts), "MMM dd, HH:mm:ss")}
        </Typography>
        <Chip
          size="small"
          label={entry.method}
          sx={{
            bgcolor: entry.method === "GET" ? "#E8F5E9" : "#E3F2FD",
            fontWeight: 600,
            fontSize: 11,
            minWidth: 50,
          }}
        />
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            minWidth: 150,
            fontWeight: 500,
            color: "#1C1B1F",
            wordBreak: "break-word",
          }}
        >
          {entry.host}
          {entry.path}
          {entry.query && (
            <span style={{ color: "#79747E" }}>{entry.query}</span>
          )}
        </Typography>
        <Chip
          size="small"
          label={entry.edgeStatus}
          sx={{
            bgcolor:
              entry.edgeStatus >= 400
                ? "#FFEBEE"
                : entry.edgeStatus >= 300
                  ? "#FFF8E1"
                  : "#E8F5E9",
            color:
              entry.edgeStatus >= 400
                ? "#B3261E"
                : entry.edgeStatus >= 300
                  ? "#F57C00"
                  : "#2E7D32",
            fontWeight: 600,
            fontSize: 11,
          }}
        />
        {entry.action && (
          <Chip
            size="small"
            label={entry.action}
            sx={{
              bgcolor: `${getActionColor(entry.action)}20`,
              color: getActionColor(entry.action),
              fontWeight: 500,
              fontSize: 11,
            }}
          />
        )}
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 2, pl: 4, pt: 2, borderTop: "1px dashed #E0E0E0" }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 2 }}>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                Network
              </Typography>
              <Typography variant="body2">
                {entry.ip} {entry.country ? `(${entry.country})` : ""}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                Client & Security
              </Typography>
              <Typography variant="body2">
                {entry.deviceType || "Unknown"} · Bot: {entry.botScore ?? "N/A"}{" "}
                · Attack: {entry.attackScore ?? "N/A"}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontFamily: "monospace",
                  maxWidth: 300,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={entry.userAgent}
              >
                {entry.userAgent}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                Host & Referrer
              </Typography>
              <Typography variant="body2">{entry.host}</Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={entry.referrer || "No referrer"}
              >
                {entry.referrer || "No referrer"}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                Edge & Origin
              </Typography>
              <Typography variant="body2">
                Edge: {entry.edgeStatus} · Origin: {entry.originStatus || "N/A"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                Cache & RayID
              </Typography>
              <Typography variant="body2">
                {entry.cacheStatus || "N/A"} · {entry.rayId}
              </Typography>
            </Box>
          </Box>
          {entry.ruleMatches && entry.ruleMatches.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                Triggered Rules
              </Typography>
              <Box sx={{ mt: 1 }}>
                {entry.ruleMatches.map((rm, i) => (
                  <Box
                    key={i}
                    sx={{ mb: 1, pl: 1, borderLeft: "2px solid #E0E0E0" }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {rm.ruleId}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block" }}>
                      {rm.description}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                      <Chip
                        size="small"
                        label={rm.action}
                        sx={{ fontSize: 9, height: 16 }}
                      />
                      <Chip
                        size="small"
                        label={rm.source}
                        sx={{ fontSize: 9, height: 16, bgcolor: "#E3F2FD" }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

export function TimelineEnhanced({
  entries,
  hasMore,
}: {
  entries: TimelineEntry[];
  hasMore: boolean;
}) {
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedFilter(filter),
      TIMELINE_FILTER_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [filter]);

  const filtered = useMemo(() => {
    if (!debouncedFilter) return entries;
    const lower = debouncedFilter.toLowerCase();
    return entries.filter(
      (e) =>
        (e.path ?? "").toLowerCase().includes(lower) ||
        (e.method ?? "").toLowerCase().includes(lower) ||
        (e.action ?? "").toLowerCase().includes(lower) ||
        (e.ip ?? "").toLowerCase().includes(lower) ||
        (e.country ?? "").toLowerCase().includes(lower) ||
        (e.host ?? "").toLowerCase().includes(lower) ||
        (e.userAgent ?? "").toLowerCase().includes(lower) ||
        (e.rayId ?? "").toLowerCase().includes(lower) ||
        (e.referrer ?? "").toLowerCase().includes(lower) ||
        e.ruleMatches.some(
          (rm) =>
            (rm.ruleId ?? "").toLowerCase().includes(lower) ||
            (rm.description ?? "").toLowerCase().includes(lower),
        ),
    );
  }, [entries, debouncedFilter]);

  const [visibleCount, setVisibleCount] = useState(MAX_TIMELINE_RENDER);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop <=
      e.currentTarget.clientHeight + 200;
    if (bottom && visibleCount < filtered.length) {
      setVisibleCount((prev) => Math.min(prev + 20, filtered.length));
    }
  };

  const displayed = filtered.slice(0, visibleCount);

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: "#1C1B1F" }}>
          Timeline ({filtered.length.toLocaleString()}{" "}
          {hasMore && !filter ? "+" : ""} entries)
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <SearchIcon sx={{ color: "#79747E" }} />
          <input
            type="text"
            placeholder="Filter path, IP, rule..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 20,
              border: "1px solid #E0E0E0",
              fontSize: 14,
              outline: "none",
              minWidth: 200,
            }}
          />
        </Box>
      </Box>

      <Box sx={{ maxHeight: 600, overflow: "auto" }} onScroll={handleScroll}>
        {displayed.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ textAlign: "center", py: 4, color: "#79747E" }}
          >
            No entries match your filter
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {displayed.map((entry, i) => (
              <TimelineRow key={entry.rayId + i} entry={entry} />
            ))}
            {filtered.length > visibleCount && (
              <Typography
                variant="caption"
                sx={{ textAlign: "center", py: 2, color: "#79747E" }}
              >
                Scroll for more...
              </Typography>
            )}
            {hasMore && visibleCount >= filtered.length && (
              <Typography
                variant="caption"
                sx={{ textAlign: "center", py: 2, color: "#F57C00" }}
              >
                Timeline is truncated to latest entries. Export JSON for full
                log.
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

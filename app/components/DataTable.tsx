import { Paper, Typography, Box } from "@mui/material";

export function DataTable<T extends Record<string, string | number>>({
  title,
  data,
  columns,
}: {
  title: string;
  data: T[];
  columns: { key: keyof T; label: string }[];
}) {
  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: "100%" }}>
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: 600, color: "#1C1B1F" }}
      >
        {title}
      </Typography>
      <Box sx={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "2px solid #E0E0E0",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#49454F",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #F0F0F0",
                      fontSize: 13,
                      color: "#1C1B1F",
                    }}
                  >
                    {String(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Paper>
  );
}

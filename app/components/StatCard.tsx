import { Card, CardContent, Box, Typography } from "@mui/material";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle: string;
  color?: string;
}

export function StatCard({
  title,
  value,
  icon,
  subtitle,
  color = "#6750A4",
}: StatCardProps) {
  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: 3,
        background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
        border: `1px solid ${color}20`,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: `${color}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: color,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: "#1C1B1F" }}>
            {value}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: "#49454F", fontWeight: 500 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: "#79747E" }}>
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
}

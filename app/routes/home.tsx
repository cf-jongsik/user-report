import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import {
  ThemeProvider,
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
} from "@mui/material";
import {
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import {
  validateStudentId,
  validateDateRange,
  getDefaultDates,
  formatDateTimeLocal,
} from "../lib/validate";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "User Report" },
    { name: "description", content: "Generate user activity reports" },
  ];
}

import { theme } from "../lib/theme";

export default function Home() {
  const navigate = useNavigate();

  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use useEffect to set initial dates on the client side to avoid UTC mismatch from SSR
  useEffect(() => {
    const defaultDates = getDefaultDates();
    setStartDate(formatDateTimeLocal(defaultDates.start));
    setEndDate(formatDateTimeLocal(defaultDates.end));
  }, []);

  // Calculate min/max for date inputs
  const [dateConstraints, setDateConstraints] = useState<{
    min: string;
    max: string;
  }>({ min: "", max: "" });

  useEffect(() => {
    const now = new Date();
    const max90DaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    setDateConstraints({
      min: formatDateTimeLocal(max90DaysAgo),
      max: formatDateTimeLocal(now),
    });
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const studentError = validateStudentId(studentId);
    if (studentError) newErrors.studentId = studentError;

    const rangeResult = validateDateRange(startDate, endDate);
    if (!rangeResult.valid) {
      Object.assign(newErrors, rangeResult.errors);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const encodedId = encodeURIComponent(studentId.trim());
    const params = new URLSearchParams({
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
    });
    navigate(`/report/${encodedId}?${params.toString()}`);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #EADDFF 0%, #F6EEFF 50%, #FFFBFE 100%)",
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          {/* Logo / Title */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "primary.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: "0 4px 12px rgba(103, 80, 164, 0.2)",
              }}
            >
              <AssessmentIcon sx={{ fontSize: 40, color: "primary.dark" }} />
            </Box>
            <Typography
              variant="h1"
              component="h1"
              sx={{
                color: "#1C1B1F",
                mb: 1,
              }}
            >
              User Report
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#49454F",
              }}
            >
              Generate activity reports by student ID
            </Typography>
          </Box>

          {/* Form Card */}
          <Card
            elevation={3}
            sx={{
              borderRadius: 4,
              backgroundColor: "background.paper",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
                {/* Student ID */}
                <TextField
                  label="Student ID"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Enter student ID"
                  error={!!errors.studentId}
                  helperText={errors.studentId || " "}
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                {/* Date Range */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Start Date"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    error={!!errors.start || !!errors.range}
                    helperText={errors.start || " "}
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarIcon color="action" />
                          </InputAdornment>
                        ),
                      },
                      htmlInput: {
                        min: dateConstraints.min,
                        max: dateConstraints.max,
                      },
                    }}
                  />
                  <TextField
                    label="End Date"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    error={!!errors.end || !!errors.range}
                    helperText={errors.end || " "}
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarIcon color="action" />
                          </InputAdornment>
                        ),
                      },
                      htmlInput: {
                        min: startDate || dateConstraints.min,
                        max: dateConstraints.max,
                      },
                    }}
                  />
                </Box>

                {errors.range && (
                  <Typography
                    variant="body2"
                    color="error"
                    sx={{ textAlign: "center" }}
                  >
                    {errors.range}
                  </Typography>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  fullWidth
                  sx={{
                    mt: 1,
                    py: 1.5,
                    boxShadow: "0 4px 12px rgba(103, 80, 164, 0.3)",
                    "&:hover": {
                      boxShadow: "0 6px 16px rgba(103, 80, 164, 0.4)",
                    },
                  }}
                >
                  {isSubmitting ? "Generating..." : "Generate Report"}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Footer */}
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              mt: 3,
              color: "#49454F",
            }}
          >
            Date range limited to 90 days
          </Typography>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

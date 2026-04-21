import { createTheme } from "@mui/material/styles";
import { MD3_COLORS } from "./constants";

export const theme = createTheme({
  palette: {
    primary: {
      main: MD3_COLORS.primary,
      light: MD3_COLORS.primaryLight,
      dark: MD3_COLORS.primaryDark,
    },
    secondary: {
      main: MD3_COLORS.secondary,
    },
    background: {
      default: MD3_COLORS.background,
      paper: MD3_COLORS.background,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 400,
      letterSpacing: "-0.015em",
    },
    body1: {
      fontSize: "1rem",
      letterSpacing: "0.03em",
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20, // 28 in home, 20 in report. Let's stick to 24 or keep configurable per usage. We use 20 here as base, home will override.
          textTransform: "none",
        },
      },
    },
  },
});

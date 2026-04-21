import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("report/:studentId", "routes/report.tsx"),
] satisfies RouteConfig;

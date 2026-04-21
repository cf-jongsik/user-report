import { z } from "zod";

const envSchema = z.object({
  CF_ZONE_ID: z.string().min(1, "Missing CF_ZONE_ID"),
  CF_API_TOKEN: z.string().min(1, "Missing CF_API_TOKEN"),
  STUDENT_ID_HEADER: z.string().default("student-id"),
  HTTP_TIME_COL: z.string().default("EdgeStartTimestamp"),
  FW_TIME_COL: z.string().default("Datetime"),
  MAX_ROWS: z
    .string()
    .default("10000")
    .transform((val) => parseInt(val, 10))
    .refine(
      (val) => !isNaN(val) && val > 0,
      "MAX_ROWS must be a positive number",
    ),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: unknown): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message).join(", ");
    throw new Error(`Environment validation failed: ${errors}`);
  }
  return result.data;
}

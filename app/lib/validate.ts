/**
 * Validation utilities using Zod
 */

import { z } from "zod";

const MAX_RANGE_DAYS = 90;

// Student ID schema
export const studentIdSchema = z
  .string()
  .min(1, "Student ID is required")
  .max(100, "Student ID is too long (max 100 characters)")
  .regex(/^[a-zA-Z0-9._@-]+$/, "Student ID contains invalid characters");

// Date range schema for loader (using Date objects)
export const dateRangeSchema = z
  .object({
    start: z.date(),
    end: z.date(),
  })
  .refine((data) => data.start <= data.end, {
    message: "Start date must be before end date",
    path: ["end"],
  })
  .refine((data) => data.end <= new Date(), {
    message: "End date cannot be in the future",
    path: ["end"],
  })
  .refine(
    (data) =>
      data.end.getTime() - data.start.getTime() <=
      MAX_RANGE_DAYS * 24 * 60 * 60 * 1000,
    {
      message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
      path: ["range"],
    },
  );

// Form validation schema (using string inputs)
export const formSchema = z.object({
  studentId: studentIdSchema,
  startDate: z.string().min(1, "Date and time are required"),
  endDate: z.string().min(1, "Date and time are required"),
});

export type FormData = z.infer<typeof formSchema>;

export function validateStudentId(id: string): string | null {
  const result = studentIdSchema.safeParse(id);
  return result.success ? null : result.error.issues[0].message;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateDateRange(
  startStr: string,
  endStr: string,
): ValidationResult {
  const errors: Record<string, string> = {};

  // Parse dates
  const startDate = startStr ? new Date(startStr) : null;
  const endDate = endStr ? new Date(endStr) : null;

  if (!startStr || !startDate || isNaN(startDate.getTime())) {
    errors.start = "Date and time are required";
  }
  if (!endStr || !endDate || isNaN(endDate.getTime())) {
    errors.end = "Date and time are required";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const now = new Date();

  // End must be >= start
  if (endDate! < startDate!) {
    errors.end = "End time must be after start time";
  }

  // Both must be <= now
  if (startDate! > now) {
    errors.start = "Start time cannot be in the future";
  }
  if (endDate! > now) {
    errors.end = "End time cannot be in the future";
  }

  // Check max range (90 days)
  const rangeMs = endDate!.getTime() - startDate!.getTime();
  const maxMs = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;
  if (rangeMs > maxMs) {
    errors.range = `Date range cannot exceed ${MAX_RANGE_DAYS} days`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getDefaultDates(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

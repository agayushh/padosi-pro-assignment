import { z } from "zod";
import { normalizeIndianMobile } from "../domain/mobile.js";

export const emailSchema = z
  .string({ required_error: "Email is required." })
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .max(254, "Email is too long.")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string({ required_error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .refine((value) => /[A-Za-z]/.test(value), "Password must include a letter.")
  .refine((value) => /\d/.test(value), "Password must include a number.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password is required.")
    .max(72, "Password must be at most 72 characters."),
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z
    .string({ required_error: "Enter the 6-digit code from your email." })
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export const resendSchema = z.object({
  email: emailSchema,
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(20, "Refresh token is required."),
});

export const mobileSchema = z
  .string({ required_error: "Mobile number is required." })
  .trim()
  .min(1, "Mobile number is required.")
  .transform((value, ctx) => {
    const normalized = normalizeIndianMobile(value);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a 10-digit Indian mobile number.",
      });
      return z.NEVER;
    }
    return normalized;
  });

const businessNameSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.union([
    z.null(),
    z
      .string()
      .trim()
      .min(2, "Business name must be at least 2 characters.")
      .max(120, "Business name is too long."),
  ]),
);

export const profileSchema = z.object({
  name: z
    .string({ required_error: "Enter your full name." })
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Name is too long.")
    .refine((value) => /\p{L}/u.test(value), "Enter your full name."),
  mobile: mobileSchema,
  address: z
    .string({ required_error: "Enter your address so we know where to send help." })
    .trim()
    .min(5, "Enter your address so we know where to send help.")
    .max(300, "Address is too long."),
  businessName: businessNameSchema.optional(),
});

export const taskSelectionSchema = z.object({
  taskIds: z
    .array(z.number().int().positive(), { required_error: "Pick at least one task." })
    .min(1, "Pick at least one task.")
    .max(40, "You can select at most 40 tasks.")
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate tasks are not allowed."),
});

export const taskQuerySchema = z.object({
  q: z.string().trim().max(80, "Search is too long.").optional().default(""),
});

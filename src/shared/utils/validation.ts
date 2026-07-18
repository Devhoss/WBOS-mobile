import { z } from "zod";

export const emailSchema = z
  .string()
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const barcodeSchema = z
  .string()
  .min(1, "Barcode is required")
  .max(100, "Barcode too long");

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const quantitySchema = z
  .number()
  .min(0, "Quantity must be 0 or more")
  .max(999999, "Quantity too large");

export type SignInInput = z.infer<typeof signInSchema>;

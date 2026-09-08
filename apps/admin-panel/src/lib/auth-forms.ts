import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

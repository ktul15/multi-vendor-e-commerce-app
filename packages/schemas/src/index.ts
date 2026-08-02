import { z } from "zod";

export const apiUrlSchema = z.url().refine((url) => url.endsWith("/api/v1"), {
  message: "API_BASE_URL must end with /api/v1",
});

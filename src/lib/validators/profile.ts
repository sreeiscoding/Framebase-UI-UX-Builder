import { z } from "zod";

export const profileUpdateSchema = z
  .object({
    full_name: z.string().min(1).optional(),
    username: z.string().min(2).optional(),
    avatar_url: z.string().url().optional(),
    current_password: z.string().min(1).optional(),
    password: z.string().min(8).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No changes provided.",
  })
  .refine((data) => !data.password || Boolean(data.current_password), {
    message: "Current password is required to set a new password.",
    path: ["current_password"],
  });

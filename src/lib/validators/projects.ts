import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1),
  platform_type: z.string().optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  platform_type: z.string().optional().nullable(),
});

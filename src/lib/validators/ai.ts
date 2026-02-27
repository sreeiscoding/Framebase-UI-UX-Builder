import { z } from "zod";

export const aiLayoutSchema = z.object({
  prompt: z.string().min(1),
  context: z.string().optional().default(""),
  project_id: z.string().uuid().optional().nullable(),
});

export const aiSectionsSchema = z.object({
  data: z.string().min(1),
  project_id: z.string().uuid().optional().nullable(),
});

export const aiCaseStudySchema = z.object({
  project_data: z.string().min(1),
  project_id: z.string().uuid().optional().nullable(),
});

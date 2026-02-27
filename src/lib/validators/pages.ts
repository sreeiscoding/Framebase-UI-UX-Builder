import { z } from "zod";

export const createPageSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional().nullable(),
  order_index: z.number().int().optional().nullable(),
  html_content: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

export const updatePageSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional().nullable(),
  order_index: z.number().int().optional().nullable(),
  html_content: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

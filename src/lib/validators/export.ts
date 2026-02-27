import { z } from "zod";

export const exportSchema = z.object({
  project_id: z.string().uuid(),
  export_type: z.string().min(1),
  format: z.string().min(1),
});

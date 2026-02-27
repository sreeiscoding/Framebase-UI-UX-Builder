import { NextRequest } from "next/server";
import {
  requireAuth,
  jsonError,
  jsonSuccess,
} from "@/lib/auth-middleware";
import { createProjectSchema } from "@/lib/validators/projects";
import { createProject, listProjects } from "@/lib/services/projects-service";
import { logRequest } from "@/lib/request-log";

export async function GET(req: NextRequest) {
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const projects = await listProjects(auth.supabase, auth.user.id);
    return jsonSuccess({ projects });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load projects.";
    return jsonError(message, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = createProjectSchema.parse(await req.json());
    const project = await createProject(auth.supabase, {
      userId: auth.user.id,
      name: body.name.trim(),
      platformType: body.platform_type ?? null,
    });
    return jsonSuccess({ project });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body.";
    return jsonError(message, { status: 400 });
  }
}

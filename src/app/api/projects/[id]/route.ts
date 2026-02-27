import { NextRequest } from "next/server";
import {
  requireAuth,
  requireProjectOwnership,
  jsonError,
  jsonSuccess,
} from "@/lib/auth-middleware";
import { updateProjectSchema } from "@/lib/validators/projects";
import { deleteProject, updateProject } from "@/lib/services/projects-service";
import { logRequest } from "@/lib/request-log";

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = context.params;
  if (!id) {
    return jsonError("Project id is required.", { status: 400 });
  }

  const ownership = await requireProjectOwnership(auth.supabase, auth.user.id, id);
  if (!ownership.ok) return ownership.response;

  try {
    await deleteProject(auth.supabase, id);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete project.";
    return jsonError(message, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = context.params;
  if (!id) {
    return jsonError("Project id is required.", { status: 400 });
  }

  const ownership = await requireProjectOwnership(auth.supabase, auth.user.id, id);
  if (!ownership.ok) return ownership.response;

  try {
    const body = updateProjectSchema.parse(await req.json());
    const project = await updateProject(auth.supabase, {
      projectId: id,
      name: body.name?.trim(),
      platformType: body.platform_type ?? undefined,
    });
    return jsonSuccess({ project });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body.";
    return jsonError(message, { status: 400 });
  }
}

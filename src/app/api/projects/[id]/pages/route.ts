import { NextRequest } from "next/server";
import {
  requireAuth,
  requireProjectOwnership,
  jsonError,
  jsonSuccess,
} from "@/lib/auth-middleware";
import { createPageSchema } from "@/lib/validators/pages";
import { createPage, listPages } from "@/lib/services/pages-service";
import { logRequest } from "@/lib/request-log";
import { sanitizeWorkspaceHtml } from "@/lib/sanitize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  if (!id) {
    return jsonError("Project id is required.", { status: 400 });
  }

  const ownership = await requireProjectOwnership(auth.supabase, auth.user.id, id);
  if (!ownership.ok) return ownership.response;

  try {
    const pages = await listPages(auth.supabase, id);
    return jsonSuccess({ pages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load pages.";
    return jsonError(message, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  if (!id) {
    return jsonError("Project id is required.", { status: 400 });
  }

  const ownership = await requireProjectOwnership(auth.supabase, auth.user.id, id);
  if (!ownership.ok) return ownership.response;

  try {
    const body = createPageSchema.parse(await req.json());
    const sanitizedHtml =
      body.html_content !== undefined && body.html_content !== null
        ? sanitizeWorkspaceHtml(body.html_content)
        : undefined;

    const page = await createPage(auth.supabase, {
      projectId: id,
      name: body.name.trim(),
      slug: body.slug ?? null,
      orderIndex: body.order_index ?? null,
      htmlContent: sanitizedHtml ?? null,
      metadata: body.metadata ?? null,
    });
    return jsonSuccess({ page });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body.";
    return jsonError(message, { status: 400 });
  }
}

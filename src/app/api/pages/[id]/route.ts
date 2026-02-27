import { NextRequest } from "next/server";
import {
  requireAuth,
  requirePageOwnership,
  jsonError,
  jsonSuccess,
} from "@/lib/auth-middleware";
import { updatePageSchema } from "@/lib/validators/pages";
import { deletePage, updatePage } from "@/lib/services/pages-service";
import { logRequest } from "@/lib/request-log";
import { sanitizeWorkspaceHtml } from "@/lib/sanitize";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  if (!id) {
    return jsonError("Page id is required.", { status: 400 });
  }

  const ownership = await requirePageOwnership(auth.supabase, auth.user.id, id);
  if (!ownership.ok) return ownership.response;

  try {
    await deletePage(auth.supabase, id);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete page.";
    return jsonError(message, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  if (!id) {
    return jsonError("Page id is required.", { status: 400 });
  }

  const ownership = await requirePageOwnership(auth.supabase, auth.user.id, id);
  if (!ownership.ok) return ownership.response;

  try {
    const body = updatePageSchema.parse(await req.json());
    const sanitizedHtml =
      body.html_content !== undefined && body.html_content !== null
        ? sanitizeWorkspaceHtml(body.html_content)
        : undefined;

    const page = await updatePage(auth.supabase, {
      pageId: id,
      name: body.name?.trim(),
      slug: body.slug ?? undefined,
      orderIndex: body.order_index ?? undefined,
      htmlContent: sanitizedHtml,
      metadata: body.metadata ?? undefined,
    });
    return jsonSuccess({ page });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body.";
    return jsonError(message, { status: 400 });
  }
}

import { NextRequest } from "next/server";
import JSZip from "jszip";
import {
  requireAuth,
  requireProjectOwnership,
  jsonError,
  jsonSuccess,
} from "@/lib/auth-middleware";
import { uploadToBucket, createSignedUrl } from "@/lib/supabase-server";
import { exportSchema } from "@/lib/validators/export";
import { logRequest } from "@/lib/request-log";

const toFileName = (value: string, fallback: string) => {
  const cleaned = value.trim().replace(/[^a-z0-9]+/gi, "_");
  const normalized = cleaned.replace(/^_+|_+$/g, "");
  return normalized || fallback;
};

export async function POST(req: NextRequest) {
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = exportSchema.parse(await req.json());
    const projectId = body.project_id;
    const exportType = body.export_type;
    const format = body.format;

    if (!projectId) {
      return jsonError("Project id is required.", { status: 400 });
    }

    const ownership = await requireProjectOwnership(
      auth.supabase,
      auth.user.id,
      projectId
    );
    if (!ownership.ok) return ownership.response;

    const { data: pages, error: pagesError } = await auth.supabase
      .from("pages")
      .select("id, name, html_content")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true });

    if (pagesError) {
      return jsonError("Failed to load pages.", { status: 500 });
    }

    if (!pages || pages.length === 0) {
      return jsonError("No pages to export.", { status: 400 });
    }

    const projectName = ownership.project.name || "Project";
    const baseName = toFileName(projectName, "Project");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    let fileBuffer: Uint8Array;
    let fileName: string;
    let contentType = "application/zip";

    if (exportType === "html" && format === "zip") {
      const zip = new JSZip();
      pages.forEach((page, index) => {
        const pageName = toFileName(page.name || `page_${index + 1}`, `page_${index + 1}`);
        const file = index === 0 ? "index.html" : `${pageName}.html`;
        zip.file(file, page.html_content || "");
      });
      const buffer = await zip.generateAsync({ type: "uint8array" });
      fileBuffer = buffer;
      fileName = `${baseName}_Export_${timestamp}.zip`;
    } else if (exportType === "json") {
      const payload = JSON.stringify({ projectId, pages }, null, 2);
      fileBuffer = new TextEncoder().encode(payload);
      fileName = `${baseName}_Export_${timestamp}.json`;
      contentType = "application/json";
    } else {
      return jsonError("Unsupported export type.", { status: 400 });
    }

    const path = `${auth.user.id}/${projectId}/${fileName}`;
    await uploadToBucket({
      bucket: "project-exports",
      path,
      data: fileBuffer,
      contentType,
      upsert: true,
    });

    const signedUrl = await createSignedUrl({
      bucket: "project-exports",
      path,
      expiresIn: 60 * 10,
    });

    await auth.supabase.from("exports").insert({
      project_id: projectId,
      export_type: exportType,
      format,
      file_path: path,
    });

    return jsonSuccess({ url: signedUrl, path });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body.";
    return jsonError(message, { status: 400 });
  }
}

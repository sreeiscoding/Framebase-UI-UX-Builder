import { NextRequest } from "next/server";
import { requireAuth, jsonSuccess } from "@/lib/auth-middleware";
import { logRequest } from "@/lib/request-log";

export async function GET(req: NextRequest) {
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return auth.response;
  }
  return jsonSuccess({ user: auth.user });
}

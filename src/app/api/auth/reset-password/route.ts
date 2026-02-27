import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/auth-middleware";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { getSupabaseClient } from "@/lib/supabase-client";
import { logRequest } from "@/lib/request-log";

export async function POST(req: NextRequest) {
  logRequest(req);
  try {
    const body = resetPasswordSchema.parse(await req.json());
    const supabase = getSupabaseClient();
    const redirectTo = process.env.FRONTEND_URL || undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo,
    });
    if (error) {
      return jsonError("Reset email failed.", { status: 400 });
    }
    return jsonSuccess({ sent: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reset email failed.";
    return jsonError(message, { status: 400 });
  }
}

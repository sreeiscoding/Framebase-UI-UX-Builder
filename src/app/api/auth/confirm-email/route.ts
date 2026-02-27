import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/auth-middleware";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logRequest } from "@/lib/request-log";

export async function POST(req: NextRequest) {
  logRequest(req);
  if (process.env.NODE_ENV === "production") {
    return jsonError("Not available in production.", { status: 403 });
  }
  try {
    const body = resetPasswordSchema.parse(await req.json());
    const supabase = getSupabaseServer();
    const { data: usersData, error: usersError } =
      await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
    if (usersError) {
      return jsonError(usersError.message || "User lookup failed.", {
        status: 500,
      });
    }
    const user = usersData?.users?.find(
      (entry) =>
        entry.email?.toLowerCase() === body.email.trim().toLowerCase()
    );
    if (!user) {
      return jsonError("User not found.", { status: 404 });
    }
    if (user.email_confirmed_at) {
      return jsonSuccess({ confirmed: true });
    }
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (error) {
      return jsonError(error.message || "Email confirmation failed.", {
        status: 500,
      });
    }
    return jsonSuccess({ confirmed: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email confirmation failed.";
    return jsonError(message, { status: 400 });
  }
}

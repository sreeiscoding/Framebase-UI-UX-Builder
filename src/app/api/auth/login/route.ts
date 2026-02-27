import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonError } from "@/lib/auth-middleware";
import { loginSchema } from "@/lib/validators/auth";
import { logRequest } from "@/lib/request-log";

export async function POST(req: NextRequest) {
  logRequest(req);
  try {
    const body = loginSchema.parse(await req.json());
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnon) {
      return jsonError("Supabase env is missing.", { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email.trim().toLowerCase(),
      password: body.password,
    });
    if (error || !data.user) {
      if (error) {
        console.error("[auth] login error:", error.message);
      }
      return jsonError(error?.message || "Invalid login credentials.", {
        status: 400,
      });
    }
    const result = { user: data.user, session: data.session };
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.session?.access_token ?? null,
        refreshToken: result.session?.refresh_token ?? null,
      },
    });
    if (result.session?.access_token) {
      response.cookies.set("sb-access-token", result.session.access_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    if (result.session?.refresh_token) {
      response.cookies.set("sb-refresh-token", result.session.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body.";
    return jsonError(message, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonError } from "@/lib/auth-middleware";
import { registerSchema } from "@/lib/validators/auth";
import { logRequest } from "@/lib/request-log";
import { inngest, inngestEnabled } from "../../../../../inngest/client";

export async function POST(req: NextRequest) {
  logRequest(req);
  try {
    const body = registerSchema.parse(await req.json());
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnon) {
      return jsonError("Supabase env is missing.", { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.signUp({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      options: {
        ...(process.env.FRONTEND_URL
          ? { emailRedirectTo: process.env.FRONTEND_URL }
          : {}),
        data: {
          full_name: body.full_name.trim(),
        },
      },
    });

    if (error || !data.user) {
      if (error) {
        console.error("[auth] signup error:", error.message);
      }
      return jsonError(error?.message || "Registration failed.", { status: 400 });
    }

    const result = {
      user: data.user,
      session: data.session,
      requiresEmailConfirmation: !data.session,
    };
    if (inngestEnabled) {
      try {
        await inngest.send({
          name: "user/signed-up",
          data: { userId: result.user.id, email: result.user.email },
        });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[inngest] failed to send signup event", error);
        }
      }
    }
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.session?.access_token ?? null,
        refreshToken: result.session?.refresh_token ?? null,
        requiresEmailConfirmation: result.requiresEmailConfirmation,
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

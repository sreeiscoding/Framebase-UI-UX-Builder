import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/auth-middleware";
import { loginSchema } from "@/lib/validators/auth";
import { loginUser } from "@/lib/services/auth-service";
import { logRequest } from "@/lib/request-log";

export async function POST(req: NextRequest) {
  logRequest(req);
  try {
    const body = loginSchema.parse(await req.json());
    const result = await loginUser({
      email: body.email.trim().toLowerCase(),
      password: body.password,
    });
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

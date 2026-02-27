import { NextRequest, NextResponse } from "next/server";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { verifyAccessToken } from "./supabase-client";
import { getSupabaseServer } from "./supabase-server";
import { rateLimit, buildRateLimitKey } from "./rate-limit";

type AuthResult =
  | {
      ok: true;
      user: User;
      token: string;
      supabase: SupabaseClient;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export const jsonSuccess = (data: unknown, init?: ResponseInit) =>
  NextResponse.json({ success: true, data }, init);

export const jsonError = (error: string, init?: ResponseInit) => {
  const status = init?.status ?? 400;
  const isProd = process.env.NODE_ENV === "production";
  const message = isProd && status >= 500 ? "Something went wrong." : error;
  return NextResponse.json({ success: false, error: message }, { status });
};

const parseCookies = (cookieHeader: string | null) => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((chunk) => {
    const [name, ...rest] = chunk.trim().split("=");
    if (!name) return;
    cookies[name] = decodeURIComponent(rest.join("="));
  });
  return cookies;
};

const extractToken = (req: NextRequest) => {
  const header = req.headers.get("authorization");
  if (header && header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.get("cookie"));
  return cookies["sb-access-token"] || cookies["supabase-auth-token"] || "";
};

export const requireAuth = async (req: NextRequest): Promise<AuthResult> => {
  const token = extractToken(req);
  if (!token) {
    return { ok: false, response: jsonError("Unauthorized", { status: 401 }) };
  }
  const user = await verifyAccessToken(token);
  if (!user) {
    return { ok: false, response: jsonError("Unauthorized", { status: 401 }) };
  }
  const globalLimit = rateLimit({
    key: buildRateLimitKey(["global", user.id]),
    limit: 120,
    windowMs: 60_000,
  });
  if (!globalLimit.allowed) {
    return { ok: false, response: jsonError("Rate limit exceeded.", { status: 429 }) };
  }
  return { ok: true, user, token, supabase: getSupabaseServer() };
};

export const requireProjectOwnership = async (
  supabase: SupabaseClient,
  userId: string,
  projectId: string
) => {
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, name")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    return { ok: false, response: jsonError("Project lookup failed", { status: 500 }) };
  }
  if (!data || data.user_id !== userId) {
    return { ok: false, response: jsonError("Project not found", { status: 404 }) };
  }
  return { ok: true, project: data };
};

export const requirePageOwnership = async (
  supabase: SupabaseClient,
  userId: string,
  pageId: string
) => {
  const { data, error } = await supabase
    .from("pages")
    .select("id, project_id, projects(user_id)")
    .eq("id", pageId)
    .maybeSingle();

  if (error) {
    return { ok: false, response: jsonError("Page lookup failed", { status: 500 }) };
  }
  const ownerId = (data as any)?.projects?.user_id;
  if (!data || !ownerId || ownerId !== userId) {
    return { ok: false, response: jsonError("Page not found", { status: 404 }) };
  }
  return { ok: true, page: data };
};

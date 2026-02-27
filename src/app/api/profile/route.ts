import { NextRequest } from "next/server";
import { requireAuth, jsonError, jsonSuccess } from "@/lib/auth-middleware";
import { logRequest } from "@/lib/request-log";
import { profileUpdateSchema } from "@/lib/validators/profile";
import {
  fetchProfile,
  updatePassword,
  updateProfile,
} from "@/lib/services/profile-service";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export async function GET(req: NextRequest) {
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const profile = await fetchProfile(auth.supabase, auth.user.id);
    const metadata = (auth.user.user_metadata || {}) as Record<string, string>;
    return jsonSuccess({
      profile: {
        full_name: profile?.full_name ?? metadata.full_name ?? "",
        username: profile?.username ?? metadata.username ?? "",
        avatar_url: profile?.avatar_url ?? metadata.avatar_url ?? "",
        email: auth.user.email ?? "",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Profile lookup failed.";
    return jsonError(message, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = profileUpdateSchema.parse(await req.json());
    const fullName = body.full_name?.trim();
    const username = body.username?.trim();
    const avatarUrl = body.avatar_url?.trim();
    const currentPassword = body.current_password?.trim();
    const password = body.password?.trim();

    const updates: Record<string, string> = {};
    if (fullName) updates.full_name = fullName;
    if (username) updates.username = username;
    if (avatarUrl) updates.avatar_url = avatarUrl;

    if (Object.keys(updates).length) {
      await updateProfile(auth.supabase, auth.user.id, updates);
    }
    if (password) {
      const email = auth.user.email;
      if (!email) {
        return jsonError("Email is required to change password.", { status: 400 });
      }
      if (!currentPassword) {
        return jsonError("Current password is required.", { status: 400 });
      }
      const env = getServerEnv();
      const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await authClient.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (error) {
        return jsonError("Current password is incorrect.", { status: 400 });
      }
      await updatePassword(auth.supabase, auth.user.id, password);
    }

    const profile = await fetchProfile(auth.supabase, auth.user.id);
    const metadata = (auth.user.user_metadata || {}) as Record<string, string>;
    return jsonSuccess({
      profile: {
        full_name:
          profile?.full_name ?? updates.full_name ?? metadata.full_name ?? "",
        username:
          profile?.username ?? updates.username ?? metadata.username ?? "",
        avatar_url:
          profile?.avatar_url ?? updates.avatar_url ?? metadata.avatar_url ?? "",
        email: auth.user.email ?? "",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Profile update failed.";
    return jsonError(message, { status: 400 });
  }
}

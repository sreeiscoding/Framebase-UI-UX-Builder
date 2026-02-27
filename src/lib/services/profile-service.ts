import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRecord = {
  id: string;
  full_name: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

export const fetchProfile = async (
  supabase: SupabaseClient,
  userId: string
) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Profile lookup failed.");
  }

  return data as ProfileRecord | null;
};

export const updateProfile = async (
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<ProfileRecord>
) => {
  if (!Object.keys(updates).length) return;

  const payload = { id: userId, ...updates };
  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });
  if (!error) return;

  const lowerMessage = error.message?.toLowerCase() || "";
  const shouldIgnoreUsername =
    lowerMessage.includes("username") && "username" in updates;
  const shouldIgnoreAvatar =
    lowerMessage.includes("avatar_url") && "avatar_url" in updates;

  if (shouldIgnoreUsername || shouldIgnoreAvatar) {
    const { username: _ignoredUsername, avatar_url: _ignoredAvatar, ...fallback } =
      updates as Record<string, string>;
    if (!Object.keys(fallback).length) {
      throw new Error("Profile update failed.");
    }
    const retry = await supabase
      .from("profiles")
      .upsert({ id: userId, ...fallback }, { onConflict: "id" });
    if (retry.error) {
      throw new Error("Profile update failed.");
    }
    return;
  }

  throw new Error("Profile update failed.");
};

export const updatePassword = async (
  supabase: SupabaseClient,
  userId: string,
  password: string
) => {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });
  if (error) {
    throw new Error("Password update failed.");
  }
};

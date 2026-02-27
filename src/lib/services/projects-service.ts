import type { SupabaseClient } from "@supabase/supabase-js";

export const listProjects = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error("Failed to load projects.");
  }
  return data ?? [];
};

export const createProject = async (
  supabase: SupabaseClient,
  params: { userId: string; name: string; platformType?: string | null }
) => {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: params.userId,
      name: params.name,
      platform_type: params.platformType || null,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Project creation failed.");
  }
  return data;
};

export const updateProject = async (
  supabase: SupabaseClient,
  params: {
    projectId: string;
    name?: string;
    platformType?: string | null;
  }
) => {
  const { data, error } = await supabase
    .from("projects")
    .update({
      ...(params.name ? { name: params.name } : {}),
      ...(params.platformType !== undefined
        ? { platform_type: params.platformType }
        : {}),
    })
    .eq("id", params.projectId)
    .select("*")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Project update failed.");
  }
  return data;
};

export const deleteProject = async (
  supabase: SupabaseClient,
  projectId: string
) => {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    throw new Error("Failed to delete project.");
  }
  return true;
};

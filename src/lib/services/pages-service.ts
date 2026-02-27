import type { SupabaseClient } from "@supabase/supabase-js";

export const listPages = async (supabase: SupabaseClient, projectId: string) => {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  if (error) {
    throw new Error("Failed to load pages.");
  }
  return data ?? [];
};

export const createPage = async (
  supabase: SupabaseClient,
  params: {
    projectId: string;
    name: string;
    slug?: string | null;
    orderIndex?: number | null;
    htmlContent?: string | null;
    metadata?: unknown | null;
  }
) => {
  const { data, error } = await supabase
    .from("pages")
    .insert({
      project_id: params.projectId,
      name: params.name,
      slug: params.slug || null,
      order_index: params.orderIndex ?? null,
      html_content: params.htmlContent ?? null,
      metadata: params.metadata ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Page creation failed.");
  }
  return data;
};

export const updatePage = async (
  supabase: SupabaseClient,
  params: {
    pageId: string;
    name?: string;
    slug?: string | null;
    orderIndex?: number | null;
    htmlContent?: string | null;
    metadata?: unknown | null;
  }
) => {
  const { data, error } = await supabase
    .from("pages")
    .update({
      ...(params.name ? { name: params.name } : {}),
      ...(params.slug !== undefined ? { slug: params.slug } : {}),
      ...(params.orderIndex !== undefined ? { order_index: params.orderIndex } : {}),
      ...(params.htmlContent !== undefined
        ? { html_content: params.htmlContent }
        : {}),
      ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    })
    .eq("id", params.pageId)
    .select("*")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Page update failed.");
  }
  return data;
};

export const deletePage = async (
  supabase: SupabaseClient,
  pageId: string
) => {
  const { error } = await supabase.from("pages").delete().eq("id", pageId);
  if (error) {
    throw new Error("Failed to delete page.");
  }
  return true;
};

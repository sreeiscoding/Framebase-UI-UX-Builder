import { getSupabaseClient } from "@/lib/supabase-client";

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

const handleUnauthorized = async () => {
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
};

const getAuthHeader = async () => {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiFetch = async <T>(
  input: string,
  init?: RequestInit
): Promise<ApiResult<T>> => {
  const headers = await getAuthHeader();
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiResult<T> | null;

  if (response.status === 401) {
    await handleUnauthorized();
  }

  if (!response.ok) {
    return (
      payload ?? {
        success: false,
        error: "Request failed.",
      }
    );
  }

  return (
    payload ?? {
      success: false,
      error: "Invalid response.",
    }
  );
};

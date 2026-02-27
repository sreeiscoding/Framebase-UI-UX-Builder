import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getClientEnv, getServerEnv } from "./env";

let cachedClient: SupabaseClient | null = null;

const getEnv = () => {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser) {
    return getClientEnv();
  }
  const env = getServerEnv();
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
  };
};

export const getSupabaseClient = () => {
  if (cachedClient) return cachedClient;
  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isBrowser = typeof window !== "undefined";
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
    },
  });
  return cachedClient;
};

export const verifyAccessToken = async (token: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }
  return data.user;
};

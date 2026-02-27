import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "./env";

let cachedClient: SupabaseClient | null = null;

export const getSupabaseServer = () => {
  if (cachedClient) return cachedClient;
  const env = getServerEnv();
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
};

export const uploadToBucket = async (params: {
  bucket: string;
  path: string;
  data: Blob | ArrayBuffer | Uint8Array;
  contentType: string;
  upsert?: boolean;
}) => {
  const supabase = getSupabaseServer();
  const { bucket, path, data, contentType, upsert } = params;
  const { error } = await supabase.storage.from(bucket).upload(path, data, {
    contentType,
    upsert: Boolean(upsert),
  });
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  return { bucket, path };
};

export const createSignedUrl = async (params: {
  bucket: string;
  path: string;
  expiresIn?: number;
}) => {
  const supabase = getSupabaseServer();
  const { bucket, path, expiresIn = 60 * 10 } = params;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? "Unknown error"}`);
  }
  return data.signedUrl;
};

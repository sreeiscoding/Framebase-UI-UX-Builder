const requireEnv = (key: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const getServerEnv = () => {
  const supabaseUrl = requireEnv("SUPABASE_URL", process.env.SUPABASE_URL);
  const serviceKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const anonKey = requireEnv("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY);
  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    SUPABASE_ANON_KEY: anonKey,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    AI_API_KEY: process.env.AI_API_KEY || "",
    AI_API_BASE_URL: process.env.AI_API_BASE_URL || "",
    AI_MODEL: process.env.AI_MODEL || "",
    FRONTEND_URL: process.env.FRONTEND_URL || "",
    POLAR_SECRET: process.env.POLAR_SECRET || "",
    POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET || "",
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY || "",
  };
};

export const getClientEnv = () => {
  const supabaseUrl = requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const anonKey = requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  };
};

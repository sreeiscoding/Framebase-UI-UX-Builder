import { createClient } from "@supabase/supabase-js";

export const registerUser = async (params: {
  email: string;
  password: string;
  fullName: string;
  emailRedirectTo?: string;
}) => {
  const { email, password, fullName, emailRedirectTo } = params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    throw new Error("Supabase env is missing.");
  }
  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
      data: {
        full_name: fullName,
      },
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Registration failed.");
  }

  return {
    user: data.user,
    session: data.session,
    requiresEmailConfirmation: !data.session,
  };
};

export const loginUser = async (params: { email: string; password: string }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    throw new Error("Supabase env is missing.");
  }
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword(params);
  if (!error && data.user) {
    return { user: data.user, session: data.session };
  }

  throw new Error(error?.message || "Login failed.");
};

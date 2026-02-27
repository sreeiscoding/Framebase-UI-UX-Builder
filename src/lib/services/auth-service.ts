import { getSupabaseClient } from "@/lib/supabase-client";
import { getSupabaseServer } from "@/lib/supabase-server";

const buildProfilePayload = async (params: {
  userId: string;
  fullName?: string;
  email?: string;
}) => {
  const supabaseAdmin = getSupabaseServer();
  const { userId, fullName, email } = params;
  let profilePayload: Record<string, string> = { id: userId };

  try {
    const { data: columns, error: columnsError } = await supabaseAdmin
      .schema("information_schema")
      .from("columns")
      .select("column_name")
      .eq("table_schema", "public")
      .eq("table_name", "profiles")
      .in("column_name", ["id", "full_name", "email", "username", "avatar_url"]);

    if (!columnsError && columns?.length) {
      const available = new Set(columns.map((column) => column.column_name));
      profilePayload = { id: userId };
      if (available.has("full_name") && fullName) profilePayload.full_name = fullName;
      if (available.has("email") && email) profilePayload.email = email;
      return profilePayload;
    }
  } catch {
    // fallback below
  }

  if (fullName) profilePayload.full_name = fullName;
  if (email) profilePayload.email = email;
  return profilePayload;
};

const ensureProfileRow = async (params: {
  userId: string;
  fullName?: string;
  email?: string;
}) => {
  const supabaseAdmin = getSupabaseServer();
  const payload = await buildProfilePayload(params);
  const { error } = await supabaseAdmin.from("profiles").upsert(payload);
  if (error && process.env.NODE_ENV !== "production") {
    console.warn("[auth] profile upsert skipped:", error.message);
  }
};

export const registerUser = async (params: {
  email: string;
  password: string;
  fullName: string;
  emailRedirectTo?: string;
}) => {
  const supabaseAuth = getSupabaseClient();
  const { email, password, fullName, emailRedirectTo } = params;

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

  const supabaseAdmin = getSupabaseServer();
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  let userReady = false;
  let lookupErrorMessage = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: userLookup, error: lookupError } =
      await supabaseAdmin.auth.admin.getUserById(data.user.id);
    if (!lookupError && userLookup?.user) {
      userReady = true;
      break;
    }
    lookupErrorMessage = lookupError?.message || lookupErrorMessage;
    await wait(200 * (attempt + 1));
  }
  if (!userReady) {
    if (process.env.NODE_ENV !== "production") {
      if (lookupErrorMessage) {
        console.warn("[auth] auth user lookup warning:", lookupErrorMessage);
      }
    } else {
      throw new Error(
        "Auth user not found. Check Supabase keys and project configuration."
      );
    }
  }

  const profilePayload = await buildProfilePayload({
    userId: data.user.id,
    fullName,
    email,
  });

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    profilePayload
  );

  if (profileError) {
    if (
      profileError.message &&
      profileError.message.toLowerCase().includes("foreign key")
    ) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[auth] profile creation delayed due to FK constraint; will rely on later upsert."
        );
      } else {
        throw new Error(
          "Profile creation failed: auth user not found. Ensure SUPABASE_URL and keys match the same project."
        );
      }
    } else {
      throw new Error(profileError.message || "Profile creation failed.");
    }
  }

  const shouldAutoConfirmEmail =
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTO_CONFIRM_EMAIL === "true";
  if (!data.session && shouldAutoConfirmEmail) {
    await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      email_confirm: true,
    });
  }

  return {
    user: data.user,
    session: data.session,
    requiresEmailConfirmation: !data.session,
  };
};

export const loginUser = async (params: { email: string; password: string }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(params);
  if (!error && data.user) {
    await ensureProfileRow({
      userId: data.user.id,
      fullName: (data.user.user_metadata?.full_name as string) || undefined,
      email: data.user.email || undefined,
    });
    return { user: data.user, session: data.session };
  }

  const shouldAutoConfirmEmail =
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTO_CONFIRM_EMAIL === "true";

  if (shouldAutoConfirmEmail) {
    const supabaseAdmin = getSupabaseServer();
    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
    if (usersError) {
      throw new Error(usersError.message || "Login failed.");
    }
    const user = usersData?.users?.find(
      (entry) =>
        entry.email?.toLowerCase() === params.email.trim().toLowerCase()
    );
    if (!user) {
      throw new Error("Account not found. Please register first.");
    }
    if (user && !user.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
      const retry = await supabase.auth.signInWithPassword(params);
      if (!retry.error && retry.data.user) {
        await ensureProfileRow({
          userId: retry.data.user.id,
          fullName:
            (retry.data.user.user_metadata?.full_name as string) || undefined,
          email: retry.data.user.email || undefined,
        });
        return { user: retry.data.user, session: retry.data.session };
      }
      throw new Error("Invalid login credentials.");
    }
  }

  throw new Error(error?.message || "Login failed.");
};

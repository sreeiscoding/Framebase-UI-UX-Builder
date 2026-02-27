import type { SupabaseClient } from "@supabase/supabase-js";
import { jsonError } from "@/lib/auth-middleware";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "inactive";

export type SubscriptionRecord = {
  id: string;
  user_id: string;
  plan: string | null;
  status: SubscriptionStatus | null;
  renewal_date: string | null;
  polar_customer_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const getSubscriptionForUser = async (
  supabase: SupabaseClient,
  userId: string
) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error("Subscription lookup failed.");
  }
  return data as SubscriptionRecord | null;
};

export const isSubscriptionActive = (subscription: SubscriptionRecord | null) => {
  if (!subscription?.status) return false;
  return subscription.status === "active" || subscription.status === "trialing";
};

export const requireActiveSubscription = async (
  supabase: SupabaseClient,
  userId: string
) => {
  const subscription = await getSubscriptionForUser(supabase, userId);
  if (!isSubscriptionActive(subscription)) {
    return { ok: false, response: jsonError("Subscription required.", { status: 402 }) };
  }
  return { ok: true, subscription };
};

export const upsertSubscription = async (
  supabase: SupabaseClient,
  payload: {
    userId: string;
    plan?: string | null;
    status?: SubscriptionStatus | null;
    renewalDate?: string | null;
    polarCustomerId?: string | null;
  }
) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: payload.userId,
        plan: payload.plan ?? null,
        status: payload.status ?? null,
        renewal_date: payload.renewalDate ?? null,
        polar_customer_id: payload.polarCustomerId ?? null,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Subscription update failed.");
  }
  return data as SubscriptionRecord;
};

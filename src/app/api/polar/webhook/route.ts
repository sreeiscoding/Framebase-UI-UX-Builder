import { NextRequest } from "next/server";
import crypto from "crypto";
import { getSupabaseServer } from "@/lib/supabase-server";
import { jsonError, jsonSuccess } from "@/lib/auth-middleware";
import { logRequest } from "@/lib/request-log";
import { upsertSubscription } from "@/lib/subscription";
import { inngest, inngestEnabled } from "../../../../../inngest/client";

const parseSignature = (header: string | null) => {
  if (!header) return null;
  if (header.includes("v1=")) {
    const match = header.split(",").find((part) => part.trim().startsWith("v1="));
    return match ? match.trim().slice(3) : null;
  }
  return header.trim();
};

const verifySignature = (payload: string, signature: string | null) => {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return signature === expected;
};

export async function POST(req: NextRequest) {
  logRequest(req);
  const signature = parseSignature(req.headers.get("polar-signature"));
  const payload = await req.text();
  if (!verifySignature(payload, signature)) {
    return jsonError("Invalid webhook signature.", { status: 400 });
  }

  try {
    const event = JSON.parse(payload);
    const data = event?.data ?? {};
    const metadata = data?.metadata ?? data?.customer?.metadata ?? {};
    const userId =
      metadata?.user_id ||
      metadata?.userId ||
      data?.user_id ||
      data?.customer_id ||
      null;
    if (!userId) {
      return jsonError("Missing user_id.", { status: 400 });
    }

    const status = (data?.status || "inactive") as any;
    const plan =
      data?.plan?.name ||
      data?.product?.name ||
      data?.price?.name ||
      null;
    const renewalDate =
      data?.current_period_end || data?.renews_at || data?.renewal_date || null;
    const polarCustomerId = data?.customer_id || data?.customer?.id || null;

    const supabase = getSupabaseServer();
    await upsertSubscription(supabase, {
      userId,
      plan,
      status,
      renewalDate,
      polarCustomerId,
    });
    if (inngestEnabled) {
      try {
        await inngest.send({
          name: "subscription/updated",
          data: { userId, status, plan },
        });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[inngest] failed to send subscription event", error);
        }
      }
    }

    return jsonSuccess({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed.";
    return jsonError(message, { status: 500 });
  }
}

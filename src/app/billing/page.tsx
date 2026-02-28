"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { pricingPlans } from "@/lib/constants";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  getPaymentMethodsForLocale,
  type PaymentMethod,
} from "@/lib/payments";
import LoadingScreen from "@/components/LoadingScreen";

type PlanId = "Starter" | "Pro" | "Free Trial";

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("Starter");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [locale, setLocale] = useState("en-US");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        if (!data.user) {
          router.replace("/");
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => {
        if (!active) return;
        router.replace("/");
      });
    return () => {
      active = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setLocale(navigator.language || "en-US");
    }
  }, []);

  const paymentMethods = useMemo(
    () => getPaymentMethodsForLocale(locale),
    [locale]
  );

  const billingPlans = useMemo(
    () => [
      {
        name: "Free Trial",
        price: "$0 for 7 days",
        description: "Full access with zero commitment.",
        features: [
          "All design tools unlocked",
          "Export-ready screens",
          "AI layout generation",
        ],
      },
      ...pricingPlans,
    ],
    []
  );

  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (!planParam) return;
    const normalized = planParam.toLowerCase();
    const match = billingPlans.find(
      (plan) => plan.name.toLowerCase() === normalized
    );
    if (match) {
      setSelectedPlan(match.name as PlanId);
    }
  }, [searchParams, billingPlans]);

  const handleConfirm = async () => {
    if (!selectedPaymentMethod) return;
    setSubmitting(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        router.replace("/");
        return;
      }
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ plan_type: selectedPlan })
        .eq("id", data.user.id);
      if (updateError) {
        throw new Error(updateError.message || "Unable to update plan.");
      }
      router.push("/workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update plan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authChecked) {
    return <LoadingScreen message="Loading billing..." />;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              Billing
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Choose your plan</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Unlock professional deployment benefits, high-availability hosting,
              and scalable infrastructure for your workspace.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {billingPlans.map((plan) => (
              <button
                key={plan.name}
                type="button"
                onClick={() => setSelectedPlan(plan.name as PlanId)}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  selectedPlan === plan.name
                    ? "border-indigo-500 bg-indigo-50/60 shadow-sm dark:bg-indigo-500/10"
                    : "border-gray-200 bg-white hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-950"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <span className="text-sm font-semibold text-indigo-600">
                    {plan.price}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {plan.features.slice(0, 3).map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Professional deployment benefits
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Global CDN distribution for instant load times.</li>
              <li>• SSL encryption, secure storage, and access control.</li>
              <li>• Performance monitoring with uptime guarantees.</li>
              <li>• Version control integrations and deployment previews.</li>
              <li>• Roadmap ready for CI/CD pipelines and enterprise SLAs.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div>
            <h2 className="text-lg font-semibold">Payment methods</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select one payment option to continue.
            </p>
          </div>

          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedPaymentMethod(method)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedPaymentMethod?.id === method.id
                    ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/10"
                    : "border-gray-200 hover:border-indigo-200 dark:border-gray-800"
                }`}
              >
                <div className="text-sm font-semibold">{method.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {method.description}
                </div>
              </button>
            ))}
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedPaymentMethod || submitting}
            className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {submitting ? "Processing..." : "Confirm & Continue"}
          </button>
        </section>
      </div>
    </main>
  );
}

"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { pricingPlans } from "@/lib/constants";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useMemo } from "react";

export default function Pricing() {
  const router = useRouter();
  const { openAuthModal } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const handlePricingCTA = async (planName: string) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      openAuthModal("Create an account to continue.", "register");
      return;
    }
    router.push(`/billing?plan=${encodeURIComponent(planName)}`);
  };

  return (
    <section id="pricing" className="section bg-gray-50 dark:bg-gray-900">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title reveal reveal-delay-0" data-reveal>
            Simple pricing
          </h2>
          <p className="section-subtitle reveal reveal-delay-100" data-reveal>
            Start small and upgrade when your product needs more velocity.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {pricingPlans.map((plan, index) => (
            <div
              key={plan.name}
              className={clsx(
                "card card-soft flex h-full flex-col p-8 reveal",
                index === 0 ? "reveal-delay-0" : "reveal-delay-200",
                plan.highlight &&
                  "scale-[1.02] border-indigo-200 shadow-md shadow-indigo-500/15 dark:border-indigo-500/40 dark:shadow-indigo-500/10"
              )}
              data-reveal
            >
              {plan.badge ? (
                <span className="badge absolute right-6 top-6">
                  {plan.badge}
                </span>
              ) : null}
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {plan.description}
              </p>
              <div className="mt-6 text-3xl font-bold">{plan.price}</div>
              <ul className="mt-6 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="mt-1 text-sm text-indigo-600 dark:text-indigo-400"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => handlePricingCTA(plan.name)}
                  className={clsx(
                    "inline-flex w-full items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold transition duration-200",
                    plan.highlight
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:shadow-none"
                      : "border border-gray-200 bg-white text-gray-900 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-indigo-400/60 dark:hover:text-indigo-300"
                  )}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-3xl border border-indigo-200 bg-white/80 p-6 text-center shadow-sm shadow-indigo-500/10 dark:border-indigo-500/30 dark:bg-gray-950">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            7-day free trial
          </span>
          <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Try the full workspace for 7 days
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Explore every feature with no commitment. Cancel anytime before the trial
            ends.
          </p>
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => handlePricingCTA("Free Trial")}
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Build with Free Trial
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGlobe,
  faRocket,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { howItWorksSteps } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const icons = [faGlobe, faWandMagicSparkles, faRocket];

const delays = ["reveal-delay-0", "reveal-delay-100", "reveal-delay-200"];

export default function HowItWorks() {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const authReason = "Create an account to continue.";

  return (
    <section id="how-it-works" className="section bg-gray-50 dark:bg-gray-900">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title reveal reveal-delay-0" data-reveal>
            How it works
          </h2>
          <p className="section-subtitle reveal reveal-delay-100" data-reveal>
            Go from idea to editable UI in three focused steps.
          </p>
        </div>
        <div className="relative mx-auto mt-10 flex w-full max-w-5xl justify-center pb-56 sm:pb-40 lg:pb-28">
          <div className="absolute inset-0 -z-10 rounded-[44px] bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.22),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.12),_transparent_55%)]" />
          <div
            className="card relative w-[920px] origin-top scale-[0.78] overflow-hidden rounded-[32px] border-gray-200/70 bg-white/80 p-5 shadow-xl shadow-indigo-500/10 reveal reveal-delay-0 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/40 sm:scale-[0.86] md:scale-[0.94] lg:scale-100"
            data-reveal
          >
            <div className="flex justify-center">
              <div className="w-full max-w-[860px] rounded-2xl border border-gray-200/70 bg-white/80 px-4 py-3 text-sm text-gray-500 shadow-sm font-mono tracking-wide dark:border-gray-800/70 dark:bg-gray-900/80 dark:text-gray-400 dark:shadow-none">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400 dark:shadow-none">
                        <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden="true">
                          <path
                            d="M5 6.5h10M6 10h8M7 13.5h6"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      Web App
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium text-gray-500 dark:text-gray-400">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400 dark:shadow-none">
                        <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden="true">
                          <rect
                            x="6"
                            y="3"
                            width="8"
                            height="14"
                            rx="2"
                            fill="currentColor"
                            opacity="0.4"
                          />
                        </svg>
                      </span>
                      Mobile App
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        requireAuth(() => router.push("/workspace"), authReason)
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200/70 bg-white px-3 py-1 font-medium dark:border-gray-800/70 dark:bg-gray-900"
                    >
                      <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden="true">
                        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
                        <path
                          d="M10 6.5v7M6.5 10h7"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      Know Your Design
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requireAuth(() => router.push("/workspace"), authReason)
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 font-semibold text-white shadow-sm dark:bg-indigo-500 dark:shadow-none"
                    >
                      <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden="true">
                        <path
                          d="M5 13.5v2h10v-2M10 4.5v8"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                        <path
                          d="M7.5 7.5L10 5l2.5 2.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Export
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-5 grid-cols-[220px_1fr]">
              <aside className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 text-sm text-gray-500 shadow-sm font-mono tracking-wide dark:border-gray-800/70 dark:bg-gray-900/80 dark:text-gray-400 dark:shadow-none">
                <div className="flex items-center justify-between border-b border-gray-200/70 pb-3 text-sm font-semibold uppercase tracking-widest text-gray-400/80 dark:border-gray-800/70 dark:text-gray-500">
                  <span>Pages</span>
                  <span>3/12</span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400 dark:shadow-none">
                      <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden="true">
                        <path
                          d="M4 6.5h12M4 10h8M4 13.5h6"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    Web App
                  </div>
                  {[
                    "Mobile App",
                    "Home Page",
                    "Team Page",
                    "Pricing Page",
                  ].map((label) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 font-medium"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden="true">
                          <circle cx="10" cy="10" r="4" fill="currentColor" />
                        </svg>
                      </span>
                      {label}
                    </div>
                  ))}
                </div>
              </aside>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-500/80 font-mono tracking-wide dark:text-gray-400/80">
                  <div className="flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm dark:bg-gray-900 dark:shadow-none">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                    Auto Layout
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm dark:bg-gray-900 dark:shadow-none">
                    <span className="h-2 w-2 rounded-full bg-violet-400 dark:bg-violet-300" />
                    Grid
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm dark:bg-gray-900 dark:shadow-none">
                    <span className="h-2 w-2 rounded-full bg-indigo-300 dark:bg-indigo-200" />
                    Components
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-3">
                  {[
                    "Landing Page",
                    "Pricing Page",
                    "Team Page",
                    "Insights",
                    "Checkout",
                    "Profile",
                  ].map((label, index) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-gray-200/70 bg-white/90 p-4 shadow-sm dark:border-gray-800/70 dark:bg-gray-900/90 dark:shadow-none"
                    >
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>{label}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {index + 1}x
                        </span>
                      </div>
                      <div className="mt-3 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50 to-white dark:from-indigo-500/20 dark:via-gray-900 dark:to-gray-900">
                        <div className="flex h-full flex-col justify-between p-3">
                          <div className="h-2 w-2/3 rounded-full bg-indigo-200/80 dark:bg-indigo-400/30" />
                          <div className="h-2 w-4/5 rounded-full bg-indigo-100 dark:bg-indigo-400/20" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-gray-500 font-mono tracking-wide dark:text-gray-400">
                        <span>Updated now</span>
                        <span>3 mins</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-1/2 z-10 w-full max-w-4xl -translate-x-1/2 translate-y-10 sm:translate-y-1/2">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {howItWorksSteps.map((step, index) => (
                <div
                  key={step.title}
                  className={`card card-soft p-6 reveal ${delays[index]}`}
                  data-reveal
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <FontAwesomeIcon icon={icons[index]} className="text-xl" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

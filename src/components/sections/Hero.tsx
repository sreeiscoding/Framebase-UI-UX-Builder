"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Hero() {
  const [activeGrowth, setActiveGrowth] = useState(0);
  const router = useRouter();
  const { requireAuth } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setActiveGrowth(18);
      return;
    }

    const duration = 2000;
    const target = 18;
    const start = performance.now();
    let frame = 0;
    const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = easeOutCubic(progress);
      setActiveGrowth(Math.round(eased * target));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section id="top" className="section pt-24 sm:pt-28 lg:pt-32">
      <div className="container relative">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-hero-grid"
          aria-hidden="true"
        />
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm animate-fade-up anim-delay-0 font-mono tracking-wide dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              AI-powered UI/UX Builder
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl animate-fade-up anim-delay-100">
              Framebase, the foundation of every interface.
            </h1>
            <p className="mt-6 text-base text-gray-600 animate-fade-up anim-delay-200 dark:text-gray-400 sm:text-lg">
              Describe your screen. Generate structured, editable layouts for web and mobile.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 animate-fade-up anim-delay-300 sm:flex-row sm:justify-center lg:justify-start">
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                onClick={() =>
                  requireAuth(
                    () => router.push("/workspace"),
                    "Create an account to continue."
                  )
                }
              >
                Start Designing
              </button>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                No design skills required.
              </div>
            </div>
          </div>
          <div className="card relative overflow-hidden p-8 animate-fade-up anim-delay-200 animate-glow">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl animate-float dark:bg-indigo-500/10" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 font-mono dark:text-gray-400">
                  Live Canvas
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Payments Dashboard
                </h3>
              </div>
              <span className="badge">Web</span>
            </div>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4 dark:border-gray-800 dark:bg-gray-800">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Active users</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    +{activeGrowth}%
                  </span>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-white dark:bg-gray-700">
                  <div className="h-2 rounded-full bg-indigo-500 animate-progress-70 dark:bg-indigo-400" />
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Checkout flow</span>
                  <span>7 steps</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-gray-500 font-mono tracking-wide dark:text-gray-400">
                  <div className="flex items-center justify-between rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800">
                    <span>Billing</span>
                    <span>Done</span>
                  </div>
                  <div className="flex items-center justify-between rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800">
                    <span>Verification</span>
                    <span>In review</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-sm font-semibold text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300">
                Export ready for Figma
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRocket } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export default function CTA() {
  const router = useRouter();
  const { requireAuth } = useAuth();

  return (
    <section className="section">
      <div className="container">
        <div className="card card-soft overflow-hidden p-12 text-center reveal reveal-delay-0" data-reveal>
          <div className="absolute inset-0 -z-10 bg-hero-grid" aria-hidden="true" />
          <h2 className="text-3xl font-bold sm:text-4xl reveal reveal-delay-100 text-center" data-reveal>
            Start designing smarter today.
          </h2>
          <p className="mt-4 text-base text-gray-600 dark:text-gray-400 reveal reveal-delay-200" data-reveal>
            Join founders and designers shipping polished UI in a fraction of the time.
          </p>
          <div className="mt-8 flex justify-center reveal reveal-delay-300" data-reveal>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                requireAuth(
                  () => router.push("/workspace"),
                  "Create an account to continue."
                )
              }
            >
              <FontAwesomeIcon icon={faRocket} className="mr-3 text-sm" />
              Get Started
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

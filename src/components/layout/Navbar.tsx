"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faChevronDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";
import ProfileModal from "@/components/profile/ProfileModal";
import { navLinks, pricingPlans } from "@/lib/constants";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ToastProvider";

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="#E5E7EB"/><circle cx="32" cy="26" r="12" fill="#CBD5F5"/><rect x="14" y="40" width="36" height="18" rx="9" fill="#CBD5F5"/></svg>`
  );

const getStoragePathFromPublicUrl = (url: string) => {
  const marker = "/storage/v1/object/public/avatars/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [planType, setPlanType] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [billingGateOpen, setBillingGateOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Free Trial");
  const profileRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { openAuthModal } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const expiredToastRef = useRef(false);

  const resolveAvatarUrl = async (url: string) => {
    if (!url) return "";
    const path = getStoragePathFromPublicUrl(url);
    if (!path) return url;
    const { data, error } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) return url;
    return data.signedUrl;
  };

  const loadProfile = async (user: User) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      const metadata = (user.user_metadata || {}) as Record<string, string>;
      const name =
        data?.full_name?.trim() ||
        data?.username?.trim() ||
        metadata.full_name?.trim() ||
        metadata.username?.trim() ||
        user.email ||
        "Account";
      setDisplayName(name);
      const avatar =
        data?.avatar_url ||
        metadata.avatar_url ||
        metadata.avatarUrl ||
        "";
      const resolved = await resolveAvatarUrl(avatar);
      setAvatarUrl(resolved || "");
      setPlanType(data?.plan_type ?? null);
      setPlanStatus(data?.plan_status ?? null);
      setPlanExpiresAt(data?.plan_expires_at ?? data?.trial_ends_at ?? null);

      if (!expiredToastRef.current) {
        const expiredStatus =
          typeof data?.plan_status === "string" &&
          ["expired", "canceled", "past_due"].includes(
            data.plan_status.toLowerCase()
          );
        const expiredType =
          typeof data?.plan_type === "string" &&
          ["expired", "trial_expired"].includes(data.plan_type.toLowerCase());
        const expiredDate =
          data?.plan_expires_at &&
          new Date(data.plan_expires_at).getTime() < Date.now();
        if (expiredStatus || expiredType || expiredDate) {
          expiredToastRef.current = true;
          showToast({
            message: "Your subscription has ended. Choose a plan to continue.",
            variant: "error",
          });
        }
      }
    } catch {
      const metadata = (user.user_metadata || {}) as Record<string, string>;
      setDisplayName(
        metadata.full_name?.trim() ||
          metadata.username?.trim() ||
          user.email ||
          "Account"
      );
      setAvatarUrl("");
      setPlanType(null);
      setPlanStatus(null);
      setPlanExpiresAt(null);
    }
  };

  useEffect(() => {
    let active = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        const user = data.user ?? null;
        setAuthUser(user);
        if (user) {
          loadProfile(user);
        } else {
          setDisplayName("");
          setAvatarUrl("");
          setPlanType(null);
          setPlanStatus(null);
          setPlanExpiresAt(null);
        }
        setAuthLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setAuthUser(null);
        setDisplayName("");
        setAvatarUrl("");
        setAuthLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null;
        setAuthUser(user);
        if (user) {
          loadProfile(user);
        } else {
          setDisplayName("");
          setAvatarUrl("");
          setPlanType(null);
          setPlanStatus(null);
          setPlanExpiresAt(null);
        }
      }
    );

    return () => {
      active = false;
      subscription?.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!profileRef.current) return;
      if (profileRef.current.contains(event.target as Node)) return;
      setProfileMenuOpen(false);
    };
    if (profileMenuOpen) {
      document.addEventListener("click", handleClick);
    }
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [profileMenuOpen]);

  const hasActivePlan = useMemo(() => {
    if (!planType) return false;
    const normalized = planType.toLowerCase();
    if (["free trial", "starter", "pro"].includes(normalized)) {
      if (planExpiresAt) {
        return new Date(planExpiresAt).getTime() >= Date.now();
      }
      return true;
    }
    return false;
  }, [planType, planExpiresAt]);

  const handleWorkspaceClick = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      openAuthModal("Create an account to continue.", "register");
      return;
    }
    if (hasActivePlan) {
      router.push("/workspace");
      return;
    }
    setSelectedPlan("Free Trial");
    setBillingGateOpen(true);
  };

  const billingPlans = useMemo(
    () => [
      {
        name: "Free Trial",
        price: "$0 for 7 days",
        description: "Full access with zero commitment.",
        features: ["All design tools unlocked", "AI generation", "Exports enabled"],
      },
      ...pricingPlans,
    ],
    []
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/70 bg-white/80 backdrop-blur animate-fade-in dark:border-gray-800/70 dark:bg-gray-950/80">
      <div className="container flex h-16 items-center justify-between">
        <a href="#top" className="text-lg font-bold tracking-tight">
          Framebase
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-500 md:flex dark:text-gray-400">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition hover:text-gray-900 dark:hover:text-gray-100"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {authLoading ? (
            <div className="hidden h-9 w-32 rounded-full bg-gray-100 dark:bg-gray-800 md:inline-flex" />
          ) : authUser ? (
            <div className="relative hidden md:flex" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl || DEFAULT_AVATAR}
                  alt="Avatar"
                  className="h-6 w-6 rounded-full object-cover"
                />
                <span className="max-w-[140px] truncate">{displayName || "Account"}</span>
                <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
              </button>
              {profileMenuOpen ? (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900/60"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleWorkspaceClick();
                    }}
                    className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900/60"
                  >
                    Your Workspace
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileMenuOpen(false);
                      await fetch("/api/auth/logout", { method: "POST" });
                      await supabase.auth.signOut();
                      router.push("/");
                    }}
                    className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal("Welcome back.", "login")}
                className="btn-secondary hidden md:inline-flex"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("Create an account to continue.", "register")}
                className="btn-primary hidden md:inline-flex"
              >
                Sign Up
              </button>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} className="text-lg" />
          </button>
        </div>
      </div>
      <div
        className={`md:hidden ${menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} overflow-hidden border-t border-gray-200/70 bg-white/95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:border-gray-800/70 dark:bg-gray-950/95`}
      >
        <div className="container flex flex-col gap-4 py-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          {authLoading ? (
            <div className="h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800" />
          ) : authUser ? (
            <>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => {
                  setMenuOpen(false);
                  setProfileModalOpen(true);
                }}
              >
                Profile
              </button>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => {
                  setMenuOpen(false);
                  handleWorkspaceClick();
                }}
              >
                Your Workspace
              </button>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={async () => {
                  setMenuOpen(false);
                  await fetch("/api/auth/logout", { method: "POST" });
                  await supabase.auth.signOut();
                  router.push("/");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => {
                  setMenuOpen(false);
                  openAuthModal("Welcome back.", "login");
                }}
              >
                Login
              </button>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => {
                  setMenuOpen(false);
                  openAuthModal("Create an account to continue.", "register");
                }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onProfileUpdated={(profile) => {
          setDisplayName(
            profile.fullName || profile.username || profile.email || "Account"
          );
          if (profile.avatarUrl) {
            setAvatarUrl(profile.avatarUrl);
          }
        }}
      />

      <Dialog open={billingGateOpen} onOpenChange={(open) => setBillingGateOpen(open)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Choose your plan</DialogTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Start your 7 Days Free Trial or choose another plan to continue.
            </p>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {billingPlans.map((plan) => (
              <button
                key={plan.name}
                type="button"
                onClick={() => setSelectedPlan(plan.name)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedPlan === plan.name
                    ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/10"
                    : "border-gray-200 hover:border-indigo-200 dark:border-gray-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{plan.name}</span>
                  <span className="text-xs font-semibold text-indigo-600">
                    {plan.price}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setBillingGateOpen(false)}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setBillingGateOpen(false);
                router.push(`/billing?plan=${encodeURIComponent(selectedPlan)}`);
              }}
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Continue billing
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

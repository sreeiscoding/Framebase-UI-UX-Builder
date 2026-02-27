"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faChevronDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";
import ProfileModal from "@/components/profile/ProfileModal";
import { navLinks } from "@/lib/constants";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { openAuthModal } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const loadProfile = async (user: User) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      const name =
        data?.full_name?.trim() ||
        data?.username?.trim() ||
        user.email ||
        "Account";
      setDisplayName(name);
    } catch {
      setDisplayName(user.email || "Account");
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
        }
        setAuthLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setAuthUser(null);
        setDisplayName("");
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
                      router.push("/workspace");
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
        }}
      />
    </header>
  );
}

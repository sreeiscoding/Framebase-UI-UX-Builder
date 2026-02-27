"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AuthModal from "./AuthModal";
import PasswordResetModal from "./PasswordResetModal";
import { getSupabaseClient } from "@/lib/supabase-client";

type AuthContextValue = {
  isAuthenticated: boolean;
  requireAuth: (action: () => void, reason?: string) => boolean;
  openAuthModal: (reason?: string, view?: "register" | "login" | "recover") => void;
  closeAuthModal: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | undefined>();
  const [authView, setAuthView] = useState<"register" | "login" | "recover">(
    "register"
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        setIsAuthenticated(Boolean(data.user));
        setAuthReady(true);
      })
      .catch(() => {
        if (!active) return;
        setIsAuthenticated(false);
        setAuthReady(true);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        if (_event === "PASSWORD_RECOVERY") {
          setResetOpen(true);
        }
        setIsAuthenticated(Boolean(session?.user));
      }
    );

    return () => {
      active = false;
      subscription?.subscription.unsubscribe();
    };
  }, [supabase]);

  const openAuthModal = (
    reason?: string,
    view: "register" | "login" | "recover" = "register"
  ) => {
    pendingActionRef.current = null;
    setAuthReason(reason);
    setAuthView(view);
    setAuthOpen(true);
  };

  const closeAuthModal = () => {
    pendingActionRef.current = null;
    setAuthReason(undefined);
    setAuthOpen(false);
  };

  const requireAuth = (action: () => void, reason?: string) => {
    if (authReady && isAuthenticated) {
      action();
      return true;
    }
    pendingActionRef.current = action;
    setAuthReason(reason || "Create an account to continue.");
    setAuthView("register");

    if (authReady) {
      setAuthOpen(true);
      return false;
    }

    supabase.auth
      .getUser()
      .then(({ data }) => {
        const user = data.user ?? null;
        setIsAuthenticated(Boolean(user));
        setAuthReady(true);
        if (user) {
          setAuthOpen(false);
          const pending = pendingActionRef.current;
          pendingActionRef.current = null;
          if (pending) {
            window.setTimeout(() => pending(), 0);
          }
        } else {
          setAuthOpen(true);
        }
      })
      .catch(() => {
        setAuthReady(true);
        setAuthOpen(true);
      });

    return false;
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setAuthOpen(false);
    setAuthReason(undefined);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pending) {
      window.setTimeout(() => pending(), 0);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      requireAuth,
      openAuthModal,
      closeAuthModal,
    }),
    [isAuthenticated]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        open={authOpen}
        onClose={closeAuthModal}
        onAuthSuccess={handleAuthSuccess}
        reason={authReason}
        initialView={authView}
      />
      <PasswordResetModal open={resetOpen} onClose={() => setResetOpen(false)} />
    </AuthContext.Provider>
  );
}

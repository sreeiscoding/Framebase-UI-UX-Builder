"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  reason?: string;
  initialView?: AuthView;
};

type AuthView = "register" | "login" | "recover";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.45c-.24 1.4-1.6 4.1-5.45 4.1-3.28 0-5.96-2.7-5.96-6s2.68-6 5.96-6c1.86 0 3.12.78 3.84 1.46l2.62-2.52C16.7 3.48 14.57 2.5 12 2.5 6.88 2.5 2.7 6.66 2.7 11.8s4.18 9.3 9.3 9.3c5.36 0 8.9-3.77 8.9-9.1 0-.61-.07-1.07-.15-1.55H12z"
    />
    <path
      fill="#FBBC05"
      d="M3.5 7.1l3.22 2.36C7.5 7.7 9.56 6.2 12 6.2c1.86 0 3.12.78 3.84 1.46l2.62-2.52C16.7 3.48 14.57 2.5 12 2.5 8.2 2.5 4.95 4.65 3.5 7.1z"
    />
    <path
      fill="#34A853"
      d="M12 21.1c3.62 0 6.66-1.2 8.88-3.26l-2.89-2.24c-.77.54-2.2 1.4-5.99 1.4-2.98 0-5.5-1.98-6.4-4.7l-3.3 2.55c1.45 3.52 4.9 6.25 9.7 6.25z"
    />
    <path
      fill="#4285F4"
      d="M20.75 10.7h-1.5v-.08H12v3.9h5.45c-.52 1.52-2 2.5-3.45 2.9l2.89 2.24c1.68-1.56 2.86-3.86 2.86-6.7 0-.61-.07-1.07-.15-1.55z"
    />
  </svg>
);

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <path
      fill="currentColor"
      d="M12 2.5c-5.24 0-9.5 4.26-9.5 9.5 0 4.2 2.73 7.77 6.5 9.03.48.1.66-.2.66-.46 0-.23-.01-.83-.01-1.63-2.64.57-3.2-1.27-3.2-1.27-.43-1.1-1.06-1.4-1.06-1.4-.86-.6.07-.59.07-.59.95.07 1.45.98 1.45.98.85 1.46 2.24 1.04 2.78.8.09-.62.33-1.04.6-1.28-2.11-.24-4.33-1.05-4.33-4.68 0-1.03.37-1.88.98-2.54-.1-.24-.43-1.2.09-2.5 0 0 .8-.26 2.62.97a9.1 9.1 0 0 1 4.78 0c1.82-1.23 2.62-.97 2.62-.97.52 1.3.19 2.26.1 2.5.6.66.97 1.5.97 2.54 0 3.64-2.23 4.44-4.35 4.67.34.29.64.87.64 1.76 0 1.27-.01 2.3-.01 2.62 0 .26.18.56.67.46A9.5 9.5 0 0 0 21.5 12c0-5.24-4.26-9.5-9.5-9.5z"
    />
  </svg>
);

export default function AuthModal({
  open,
  onClose,
  onAuthSuccess,
  reason,
  initialView,
}: AuthModalProps) {
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<AuthView>("register");
  const [registerName, setRegisterName] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverNotice, setRecoverNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [infoMessage, setInfoMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<"google" | "github" | null>(
    null
  );

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setView(initialView ?? "register");
    setErrors([]);
    setInfoMessage("");
    setRecoverNotice("");
  }, [open, initialView]);

  useEffect(() => {
    if (view !== "recover") return;
    if (!recoverNotice) return;
    const timer = window.setTimeout(() => {
      setView("login");
      setRecoverNotice("");
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [view, recoverNotice]);

  const handleClose = () => {
    setVisible(false);
    window.setTimeout(() => {
      onClose();
      setRegisterName("");
      setRegisterUsername("");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirm("");
      setLoginEmail("");
      setLoginPassword("");
      setRecoverEmail("");
      setRecoverNotice("");
      setInfoMessage("");
      setShowRegisterPassword(false);
      setShowRegisterConfirm(false);
      setShowLoginPassword(false);
      setOauthProvider(null);
      setErrors([]);
    }, 200);
  };

  const registerErrors = useMemo(() => {
    const issues: string[] = [];
    if (!registerName.trim()) issues.push("Full name is required.");
    if (!registerUsername.trim()) issues.push("Username is required.");
    if (!registerEmail.trim()) issues.push("Email is required.");
    if (registerEmail && !isValidEmail(registerEmail)) issues.push("Enter a valid email.");
    if (!registerPassword) issues.push("Password is required.");
    if (registerPassword && registerPassword.length < 8) {
      issues.push("Password must be at least 8 characters.");
    }
    if (!registerConfirm) issues.push("Confirm your password.");
    if (registerPassword && registerConfirm && registerPassword !== registerConfirm) {
      issues.push("Passwords do not match.");
    }
    return issues;
  }, [registerName, registerUsername, registerEmail, registerPassword, registerConfirm]);

  const loginErrors = useMemo(() => {
    const issues: string[] = [];
    if (!loginEmail.trim()) issues.push("Email is required.");
    if (loginEmail && !isValidEmail(loginEmail)) issues.push("Enter a valid email.");
    if (!loginPassword) issues.push("Password is required.");
    return issues;
  }, [loginEmail, loginPassword]);

  const recoverErrors = useMemo(() => {
    const issues: string[] = [];
    if (!recoverEmail.trim()) issues.push("Email is required.");
    if (recoverEmail && !isValidEmail(recoverEmail)) issues.push("Enter a valid email.");
    return issues;
  }, [recoverEmail]);

  const handleRegister = async () => {
    if (registerErrors.length) {
      setErrors(registerErrors);
      return;
    }
    try {
      setIsRegistering(true);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail.trim().toLowerCase(),
        password: registerPassword,
        options: {
          data: {
            username: registerUsername.trim(),
            full_name: registerName.trim(),
          },
        },
      });
      if (error) {
        setErrors([error.message || "Registration failed."]);
        return;
      }
      if (!data.session) {
        setInfoMessage("Check your email to confirm your account before logging in.");
      } else {
        setInfoMessage("");
      }

      setLoginEmail(registerEmail.trim().toLowerCase());
      setLoginPassword("");
      setErrors([]);
      setView("login");
    } catch {
      setErrors(["Registration failed."]);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogin = async () => {
    if (loginErrors.length) {
      setErrors(loginErrors);
      return;
    }
    try {
      setIsLoggingIn(true);
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });
      if (error) {
        setErrors([error.message || "Invalid credentials."]);
        return;
      }

      showToast({
        message: "Registration and Login successful. Welcome to your workspace.",
        variant: "success",
      });
      setErrors([]);
      setInfoMessage("");
      handleClose();
      onAuthSuccess();
    } catch {
      setErrors(["Login failed."]);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRecover = async () => {
    if (recoverErrors.length) {
      setErrors(recoverErrors);
      setRecoverNotice("");
      return;
    }
    try {
      setIsRecovering(true);
      setErrors([]);
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoverEmail.trim().toLowerCase() }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Reset email failed.");
      }
      setRecoverNotice("If this email exists, a reset link has been sent.");
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Reset email failed."]);
      setRecoverNotice("");
    } finally {
      setIsRecovering(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    try {
      setErrors([]);
      setOauthProvider(provider);
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setErrors([error.message || "OAuth login failed."]);
        setOauthProvider(null);
      }
    } catch {
      setErrors(["OAuth login failed."]);
      setOauthProvider(null);
    }
  };

  const oauthDisabled =
    Boolean(oauthProvider) || isRegistering || isLoggingIn || isRecovering;

  return (
    <AnimatePresence>
      {open && mounted ? (
        <motion.div
          className="fixed inset-0 z-80 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            className={`absolute inset-0 bg-gray-950/70 backdrop-blur-sm transition-opacity duration-300 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            onClick={handleClose}
            aria-label="Close authentication modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className={`relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.65)] ring-1 ring-black/5 transition-all duration-300 dark:border-gray-800 dark:bg-gray-950 dark:ring-white/5 ${
              visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative flex items-start justify-between gap-4 border-b border-gray-200 bg-gradient-to-br from-indigo-50/80 via-white to-white px-6 py-5 dark:border-gray-800 dark:from-indigo-500/10 dark:via-gray-950 dark:to-gray-950">
              <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500/80" />
              <div className="pl-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-500/80">
                  Framebase Access
                </p>
                <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {view === "register"
                    ? "Create your account"
                    : view === "recover"
                    ? "Reset your password"
                    : "Login to your account"}
                </h3>
                {reason ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {reason}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                aria-label="Close"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            <div className="auth-modal-scroll relative w-full max-h-[560px] overflow-y-auto">
              <div
                className="flex w-[300%] transition-transform duration-300 ease-in-out"
                style={{
                  transform:
                    view === "login"
                      ? "translateX(-33.333%)"
                      : view === "recover"
                      ? "translateX(-66.666%)"
                      : "translateX(0%)",
                }}
              >
                <div className="w-1/3 px-6 py-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Button
                        type="button"
                        onClick={() => handleOAuthLogin("google")}
                        disabled={oauthDisabled}
                        variant="unstyled"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                          <GoogleIcon />
                        </span>
                        {oauthProvider === "google" ? "Connecting..." : "Continue with Google"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleOAuthLogin("github")}
                        disabled={oauthDisabled}
                        variant="unstyled"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white shadow-sm">
                          <GithubIcon />
                        </span>
                        {oauthProvider === "github" ? "Connecting..." : "Continue with GitHub"}
                      </Button>
                      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300">
                        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                        OR
                        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                        Full name
                      </label>
                      <Input
                        value={registerName}
                        onChange={(event) => setRegisterName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500/30"
                        placeholder="Alex Morgan"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                        Username
                      </label>
                      <Input
                        value={registerUsername}
                        onChange={(event) => setRegisterUsername(event.target.value)}
                        className="mt-2 w-full rounded-2xl border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500/30"
                        placeholder="alexmorgan"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                        Email
                      </label>
                      <Input
                        value={registerEmail}
                        onChange={(event) => setRegisterEmail(event.target.value)}
                        className="mt-2 w-full rounded-2xl border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500/30"
                        placeholder="you@email.com"
                        type="email"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                        Password
                      </label>
                      <div className="relative mt-2">
                        <Input
                          value={registerPassword}
                          onChange={(event) => setRegisterPassword(event.target.value)}
                          className="w-full rounded-2xl border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500/30"
                          placeholder="Minimum 8 characters"
                          type={showRegisterPassword ? "text" : "password"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword((prev) => !prev)}
                          aria-label={
                            showRegisterPassword ? "Hide password" : "Show password"
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-300"
                        >
                          <FontAwesomeIcon
                            icon={showRegisterPassword ? faEye : faEyeSlash}
                            className="text-sm"
                          />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                        Confirm password
                      </label>
                      <div className="relative mt-2">
                        <Input
                          value={registerConfirm}
                          onChange={(event) => setRegisterConfirm(event.target.value)}
                          className="w-full rounded-2xl border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500/30"
                          type={showRegisterConfirm ? "text" : "password"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterConfirm((prev) => !prev)}
                          aria-label={
                            showRegisterConfirm ? "Hide password" : "Show password"
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-300"
                        >
                          <FontAwesomeIcon
                            icon={showRegisterConfirm ? faEye : faEyeSlash}
                            className="text-sm"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleRegister}
                      disabled={isRegistering}
                      variant="unstyled"
                      className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_-12px_rgba(79,70,229,0.7)] transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                      {isRegistering ? "Creating..." : "Create Account"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setErrors([]);
                        setView("login");
                      }}
                      variant="unstyled"
                      className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                    >
                      Already have an account? Login
                    </Button>
                  </div>
                </div>

            <div className="w-1/3 px-6 py-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() => handleOAuthLogin("google")}
                    disabled={oauthDisabled}
                    variant="unstyled"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                      <GoogleIcon />
                    </span>
                    {oauthProvider === "google" ? "Connecting..." : "Continue with Google"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleOAuthLogin("github")}
                    disabled={oauthDisabled}
                    variant="unstyled"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white shadow-sm">
                      <GithubIcon />
                    </span>
                    {oauthProvider === "github" ? "Connecting..." : "Continue with GitHub"}
                  </Button>
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300">
                    <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                    OR
                    <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Email
                  </label>
                  <Input
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500/30"
                    placeholder="you@email.com"
                    type="email"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Password
                  </label>
                  <div className="relative mt-2">
                    <Input
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      className="w-full rounded-2xl border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500/30"
                      type={showLoginPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-300"
                    >
                      <FontAwesomeIcon
                        icon={showLoginPassword ? faEye : faEyeSlash}
                        className="text-sm"
                      />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setErrors([]);
                    setRecoverNotice("");
                    setView("recover");
                  }}
                  className="text-xs font-semibold text-indigo-600 transition hover:underline dark:text-indigo-300"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  variant="unstyled"
                  className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_-12px_rgba(79,70,229,0.7)] transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {isLoggingIn ? "Logging in..." : "Login"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setErrors([]);
                    setView("register");
                  }}
                  variant="unstyled"
                  className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                >
                  Back to Register
                </Button>
              </div>
            </div>

            <div className="w-1/3 px-6 py-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Email
                  </label>
                  <Input
                    value={recoverEmail}
                    onChange={(event) => setRecoverEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500/30"
                    placeholder="you@email.com"
                    type="email"
                  />
                </div>
                {recoverNotice ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {recoverNotice}
                  </div>
                ) : null}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleRecover}
                  disabled={isRecovering}
                  variant="unstyled"
                  className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_-12px_rgba(79,70,229,0.7)] transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {isRecovering ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setErrors([]);
                    setRecoverNotice("");
                    setView("login");
                  }}
                  variant="unstyled"
                  className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </div>
        </div>

        {errors.length ? (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
            <ul className="space-y-1">
              {errors.map((error) => (
                <li key={error}>- {error}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {infoMessage ? (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
            {infoMessage}
          </div>
        ) : null}
          </motion.div>
          <style jsx>{`
            .auth-modal-scroll {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .auth-modal-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

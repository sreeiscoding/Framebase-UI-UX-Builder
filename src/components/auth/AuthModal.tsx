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
            className={`relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white/95 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.6)] ring-1 ring-black/5 transition-all duration-300 dark:border-gray-800 dark:bg-gray-950/95 dark:ring-white/5 ${
              visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gray-50/80 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/40">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
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

            <div className="relative w-full overflow-hidden">
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
                      className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
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
                  className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
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
                  className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
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
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

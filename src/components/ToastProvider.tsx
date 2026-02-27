"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleXmark, faCircleInfo } from "@fortawesome/free-solid-svg-icons";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  visible: boolean;
};

type ToastContextValue = {
  showToast: (params: { message: string; variant?: ToastVariant; durationMs?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `toast_${Math.random().toString(36).slice(2, 10)}`;

const ICONS: Record<ToastVariant, typeof faCircleCheck> = {
  success: faCircleCheck,
  error: faCircleXmark,
  info: faCircleInfo,
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success:
    "border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-200",
  error: "border-red-200 text-red-600 dark:border-red-500/30 dark:text-red-300",
  info: "border-indigo-200 text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-200",
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, number[]>>(new Map());

  const showToast = useCallback(({
    message,
    variant = "success",
    durationMs = 3000,
  }: {
    message: string;
    variant?: ToastVariant;
    durationMs?: number;
  }) => {
    const id = createId();
    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        variant,
        visible: true,
      },
    ]);
    const fadeTimer = window.setTimeout(() => {
      setToasts((prev) =>
        prev.map((toast) =>
          toast.id === id ? { ...toast, visible: false } : toast
        )
      );
    }, Math.max(durationMs - 400, 800));
    const clearTimer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      timersRef.current.delete(id);
    }, durationMs);
    timersRef.current.set(id, [fadeTimer, clearTimer]);
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timers) => {
        timers.forEach((timer) => window.clearTimeout(timer));
      });
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-70 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-2xl border bg-white/95 px-4 py-3 text-sm font-semibold shadow-lg shadow-indigo-500/10 backdrop-blur transition-all duration-300 dark:bg-gray-900/90 ${
              toast.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            } ${VARIANT_STYLES[toast.variant]}`}
          >
            <FontAwesomeIcon icon={ICONS[toast.variant]} className="text-base" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

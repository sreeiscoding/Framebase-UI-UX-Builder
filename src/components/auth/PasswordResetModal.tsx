"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ToastProvider";
import { getSupabaseClient } from "@/lib/supabase-client";

type PasswordResetModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function PasswordResetModal({
  open,
  onClose,
}: PasswordResetModalProps) {
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSave = async () => {
    const issues: string[] = [];
    if (!password) {
      issues.push("New password is required.");
    } else if (password.length < 8) {
      issues.push("Password must be at least 8 characters.");
    }
    if (password && confirm && password !== confirm) {
      issues.push("Passwords do not match.");
    }
    if (issues.length) {
      setErrors(issues);
      return;
    }

    try {
      setSaving(true);
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw new Error(error.message || "Password reset failed.");
      }
      showToast({ message: "Password updated successfully.", variant: "success" });
      setErrors([]);
      setPassword("");
      setConfirm("");
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Password reset failed."]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set a new password</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter a new password for your account.
          </p>
        </DialogHeader>
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              New password
            </label>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Confirm password
            </label>
            <Input
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>
        </div>
        {errors.length ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <ul className="space-y-1">
              {errors.map((error) => (
                <li key={error}>- {error}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="unstyled"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="unstyled"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {saving ? "Saving..." : "Save password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

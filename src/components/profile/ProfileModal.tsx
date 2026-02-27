"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ToastProvider";

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: {
    fullName: string;
    username: string;
    avatarUrl?: string;
    email: string;
  }) => void;
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export default function ProfileModal({
  open,
  onClose,
  onProfileUpdated,
}: ProfileModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [initial, setInitial] = useState({
    fullName: "",
    username: "",
    avatarUrl: "",
    email: "",
  });

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setErrors([]);
    fetch("/api/profile")
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok || !payload?.success) {
          throw new Error(payload?.error || "Failed to load profile.");
        }
        if (!active) return;
        const profile = payload?.data?.profile || {};
        const nextFullName = profile.full_name ?? "";
        const nextUsername = profile.username ?? "";
        const nextAvatarUrl = profile.avatar_url ?? "";
        const nextEmail = profile.email ?? "";
        setFullName(nextFullName);
        setUsername(nextUsername);
        setAvatarUrl(nextAvatarUrl);
        setEmail(nextEmail);
        setInitial({
          fullName: nextFullName,
          username: nextUsername,
          avatarUrl: nextAvatarUrl,
          email: nextEmail,
        });
      })
      .catch((error) => {
        if (!active) return;
        setErrors([error instanceof Error ? error.message : "Failed to load profile."]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [open]);

  const passwordErrors = useMemo(() => {
    const issues: string[] = [];
    if (newPassword && newPassword.length < 8) {
      issues.push("Password must be at least 8 characters.");
    }
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      issues.push("Passwords do not match.");
    }
    if (newPassword && !currentPassword) {
      issues.push("Enter your current password to set a new one.");
    }
    return issues;
  }, [newPassword, confirmPassword, currentPassword]);

  const profileErrors = useMemo(() => {
    const issues: string[] = [];
    if (email && !isValidEmail(email)) {
      issues.push("Email address is invalid.");
    }
    if (avatarUrl && !isValidUrl(avatarUrl)) {
      issues.push("Profile image URL must be valid.");
    }
    return issues;
  }, [email, avatarUrl]);

  const hasChanges =
    fullName.trim() !== initial.fullName ||
    username.trim() !== initial.username ||
    avatarUrl.trim() !== initial.avatarUrl ||
    Boolean(newPassword);

  const handleSave = async () => {
    const issues = [...passwordErrors, ...profileErrors];
    if (issues.length) {
      setErrors(issues);
      return;
    }
    if (!hasChanges) {
      setErrors([]);
      return;
    }
    try {
      setSaving(true);
      const body: Record<string, string> = {};
      if (fullName.trim() !== initial.fullName) {
        body.full_name = fullName.trim();
      }
      if (username.trim() !== initial.username) {
        body.username = username.trim();
      }
      if (avatarUrl.trim() !== initial.avatarUrl) {
        body.avatar_url = avatarUrl.trim();
      }
      if (newPassword) {
        body.password = newPassword;
        body.current_password = currentPassword;
      }
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Profile update failed.");
      }
      const profile = payload?.data?.profile || {};
      const nextFullName = profile.full_name ?? "";
      const nextUsername = profile.username ?? "";
      const nextAvatarUrl = profile.avatar_url ?? "";
      const nextEmail = profile.email ?? email;
      setFullName(nextFullName);
      setUsername(nextUsername);
      setAvatarUrl(nextAvatarUrl);
      setEmail(nextEmail);
      setInitial({
        fullName: nextFullName,
        username: nextUsername,
        avatarUrl: nextAvatarUrl,
        email: nextEmail,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors([]);
      showToast({ message: "Profile updated successfully.", variant: "success" });
      onProfileUpdated?.({
        fullName: nextFullName,
        username: nextUsername,
        avatarUrl: nextAvatarUrl,
        email: nextEmail,
      });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Profile update failed."]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Account Profile</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review and update your account details.
          </p>
        </DialogHeader>
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Profile picture URL
              </label>
              <Input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://"
                className="mt-2 w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                disabled={loading}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Profile name
              </label>
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                className="mt-2 w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Username
              </label>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                className="mt-2 w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Email
            </label>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm outline-none dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-300"
              disabled
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Current password
              </label>
              <Input
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter current password"
                type="password"
                className="mt-2 w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                New password
              </label>
              <Input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Leave blank to keep current"
                type="password"
                className="mt-2 w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                disabled={loading}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Confirm new password
              </label>
              <Input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                className="mt-2 w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                disabled={loading}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="unstyled"
                disabled={sendingReset || loading || !email}
                onClick={async () => {
                  try {
                    setSendingReset(true);
                    const response = await fetch("/api/auth/reset-password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    const payload = await response.json();
                    if (!response.ok || !payload?.success) {
                      throw new Error(payload?.error || "Reset email failed.");
                    }
                    showToast({
                      message: "Password reset email sent.",
                      variant: "success",
                    });
                  } catch (error) {
                    setErrors([
                      error instanceof Error
                        ? error.message
                        : "Reset email failed.",
                    ]);
                  } finally {
                    setSendingReset(false);
                  }
                }}
                className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:text-gray-300"
              >
                {sendingReset ? "Sending..." : "Send reset email"}
              </Button>
            </div>
          </div>
        </div>
        {errors.length ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
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
            disabled={saving || loading || !hasChanges}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

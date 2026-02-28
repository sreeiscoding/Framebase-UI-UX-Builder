"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ToastProvider";
import { getSupabaseClient } from "@/lib/supabase-client";

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [email, setEmail] = useState("");
  const [platformPreference, setPlatformPreference] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"profile" | "reset">("profile");
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
    setActiveTab("profile");
    const loadProfile = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        throw new Error("Unable to load your session.");
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError) {
        throw new Error(profileError.message || "Failed to load profile.");
      }
      if (!active) return;
      const metadata = (data.user.user_metadata || {}) as Record<string, string>;
      const nextFullName = profile?.full_name ?? metadata.full_name ?? "";
      const nextUsername = profile?.username ?? metadata.username ?? "";
      const nextAvatarUrl = profile?.avatar_url ?? metadata.avatar_url ?? "";
      const nextEmail = profile?.email ?? data.user.email ?? "";
      const nextPlatform = profile?.platform_preference ?? "";
      setFullName(nextFullName);
      setUsername(nextUsername);
      setAvatarUrl(nextAvatarUrl);
      setAvatarPreview(nextAvatarUrl);
      setEmail(nextEmail);
      setPlatformPreference(nextPlatform);
      setInitial({
        fullName: nextFullName,
        username: nextUsername,
        avatarUrl: nextAvatarUrl,
        email: nextEmail,
      });
    };
    loadProfile()
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
  }, [avatarFile]);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setAvatarFile(null);
  }, [open]);

  useEffect(() => {
    if (!avatarFile) return;
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
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
    return issues;
  }, [email]);

  const hasChanges =
    fullName.trim() !== initial.fullName ||
    username.trim() !== initial.username ||
    avatarUrl.trim() !== initial.avatarUrl ||
    Boolean(avatarFile) ||
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
      const supabase = getSupabaseClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("Unable to load your session.");
      }
      const body: Record<string, string> = {};
      let nextAvatarUrl = avatarUrl.trim();
      if (avatarFile && authData.user) {
        const fileExt = avatarFile.name.split(".").pop() || "png";
        const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`;
        const upload = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { upsert: true });
        if (upload.error) {
          const message =
            upload.error.message ||
            "Avatar upload failed. Ensure storage policies allow uploads.";
          throw new Error(message);
        }
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        nextAvatarUrl = data.publicUrl;
        body.avatar_url = nextAvatarUrl;
      }
      if (fullName.trim() !== initial.fullName) {
        body.full_name = fullName.trim();
      }
      if (username.trim() !== initial.username) {
        body.username = username.trim();
      }
      if (!body.avatar_url && avatarUrl.trim() !== initial.avatarUrl) {
        body.avatar_url = avatarUrl.trim();
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .update({
          full_name: body.full_name ?? fullName.trim(),
          username: body.username ?? username.trim(),
          avatar_url: body.avatar_url ?? nextAvatarUrl,
        })
        .eq("id", authData.user.id)
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message || "Profile update failed.");
      }
      const nextFullName = profile.full_name ?? "";
      const nextUsername = profile.username ?? "";
      const resolvedAvatarUrl = profile.avatar_url ?? nextAvatarUrl ?? "";
      const nextEmail = profile.email ?? authData.user.email ?? email;
      setFullName(nextFullName);
      setUsername(nextUsername);
      setAvatarUrl(resolvedAvatarUrl);
      setAvatarPreview(resolvedAvatarUrl);
      setAvatarFile(null);
      setEmail(nextEmail);
      setInitial({
        fullName: nextFullName,
        username: nextUsername,
        avatarUrl: resolvedAvatarUrl,
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
        avatarUrl: resolvedAvatarUrl,
        email: nextEmail,
      });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Profile update failed."]);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    const issues = [...passwordErrors];
    if (issues.length) {
      setErrors(issues);
      return;
    }
    if (!newPassword) {
      setErrors(["Enter a new password to continue."]);
      return;
    }
    try {
      setSendingReset(true);
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw new Error(error.message || "Password update failed.");
      }
      showToast({ message: "Password updated successfully.", variant: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors([]);
      setActiveTab("profile");
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Password update failed.",
      ]);
    } finally {
      setSendingReset(false);
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
        <div className="mt-6 overflow-hidden">
          <div
            className={`flex w-[200%] transition-transform duration-300 ease-in-out ${
              activeTab === "profile" ? "translate-x-0" : "-translate-x-1/2"
            }`}
          >
            <div className="w-1/2 pr-6">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      Profile picture
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setAvatarFile(file);
                      }}
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
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Platform preference
                  </label>
                  <Input
                    value={platformPreference}
                    placeholder="Not set"
                    className="mt-2 w-full rounded-xl border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm outline-none dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-300"
                    disabled
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-300">
                  <span>Need to change your password?</span>
                  <Button
                    type="button"
                    variant="unstyled"
                    onClick={() => setActiveTab("reset")}
                    className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300"
                  >
                    Reset Password
                  </Button>
                </div>
              </div>
            </div>

            <div className="w-1/2 pl-6">
              <div className="space-y-5">
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
                    placeholder="Enter new password"
                    type="password"
                    className="mt-2 w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                    disabled={loading}
                  />
                </div>
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
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="unstyled"
                    onClick={() => setActiveTab("profile")}
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-300"
                  >
                    Done
                  </Button>
                  <Button
                    type="button"
                    variant="unstyled"
                    onClick={handlePasswordReset}
                    disabled={sendingReset || loading}
                    className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    {sendingReset ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
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

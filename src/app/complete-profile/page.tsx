"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CompleteProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.replace("/");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, full_name")
          .eq("id", data.user.id)
          .single();
        if (!active) return;
        setUsername(profile?.username ?? "");
        setFullName(profile?.full_name ?? "");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  const handleSave = async () => {
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/");
        return;
      }
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          full_name: fullName.trim() || null,
        })
        .eq("id", data.user.id);
      if (updateError) {
        throw new Error(updateError.message);
      }
      router.replace("/workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-16 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Complete your profile
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Choose a username to finish setting up your account.
        </p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Username
            </label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-2xl border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500/30"
              placeholder="yourhandle"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Full name (optional)
            </label>
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 w-full rounded-2xl border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500/30"
              placeholder="Alex Morgan"
            />
          </div>
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : null}
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            variant="unstyled"
            className="w-full rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {saving ? "Saving..." : "Save and continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

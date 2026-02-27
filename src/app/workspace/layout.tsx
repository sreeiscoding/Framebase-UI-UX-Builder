"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "./WorkspaceShell";
import { WorkspaceProvider } from "./workspace-context";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data.user) {
          setAuthorized(true);
          setAuthChecked(true);
          return;
        }
        setAuthorized(false);
        setAuthChecked(true);
        router.replace("/");
      })
      .catch(() => {
        setAuthorized(false);
        setAuthChecked(true);
        router.replace("/");
      });
  }, [router]);

  if (!authChecked || !authorized) {
    return null;
  }

  return (
    <WorkspaceProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}

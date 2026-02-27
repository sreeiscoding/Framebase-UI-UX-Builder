import { NextRequest, NextResponse } from "next/server";

const rateStore = new Map<string, { count: number; resetAt: number }>();

const getToken = (req: NextRequest) => {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7);
  }
  return req.cookies.get("sb-access-token")?.value ?? "";
};

const isRateLimited = (key: string, limit: number, windowMs: number) => {
  const now = Date.now();
  const entry = rateStore.get(key);
  if (!entry || entry.resetAt < now) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count += 1;
  return false;
};

const fetchSupabaseUser = async (token: string) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
    },
  });
  if (!response.ok) return null;
  return response.json();
};

const hasActiveSubscription = async (token: string, userId: string) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  const response = await fetch(
    `${url}/rest/v1/subscriptions?user_id=eq.${userId}&select=status`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
      },
    }
  );
  if (!response.ok) return false;
  const data = await response.json();
  const status = data?.[0]?.status;
  return status === "active" || status === "trialing";
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = getToken(req);

  if (pathname.startsWith("/api/ai")) {
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (isRateLimited(`ai:${token}`, 20, 60_000)) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded." }, { status: 429 });
    }
    const user = await fetchSupabaseUser(token);
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const active = await hasActiveSubscription(token, userId);
    if (!active) {
      return NextResponse.json(
        { success: false, error: "Subscription required." },
        { status: 402 }
      );
    }
  }

  if (pathname.startsWith("/workspace")) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    const user = await fetchSupabaseUser(token);
    if (!user?.id) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/workspace/:path*", "/api/ai/:path*"],
};

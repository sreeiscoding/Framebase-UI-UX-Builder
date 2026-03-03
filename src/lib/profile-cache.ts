export type CachedProfile = {
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  platform_preference?: string | null;
  plan_type?: string | null;
  plan_status?: string | null;
  plan_expires_at?: string | null;
  trial_ends_at?: string | null;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

const getCacheKey = (userId: string) => `fb_profile_cache_${userId}`;

export const readProfileCache = (userId: string): CachedProfile | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { cachedAt: number; profile: CachedProfile };
    if (!parsed?.cachedAt || !parsed.profile) return null;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed.profile;
  } catch {
    return null;
  }
};

export const writeProfileCache = (userId: string, profile: CachedProfile) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getCacheKey(userId),
      JSON.stringify({ cachedAt: Date.now(), profile })
    );
  } catch {
    // ignore cache write failures
  }
};

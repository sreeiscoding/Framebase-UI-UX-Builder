import type { NextRequest } from "next/server";

export const logRequest = (req: NextRequest) => {
  if (process.env.NODE_ENV === "production") return;
  const url = new URL(req.url);
  console.log(`[api] ${req.method} ${url.pathname}`);
};

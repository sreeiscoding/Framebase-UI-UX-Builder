import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.toString();
  const target = new URL(`/workspace${search ? `?${search}` : ""}`, url.origin);
  return NextResponse.redirect(target);
}

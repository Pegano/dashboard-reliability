import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  const next = request.nextUrl.searchParams.get("next");
  const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
  const backendUrl = `${API_BASE}/api/auth/verify?token=${token}${nextParam}`;
  const res = await fetch(backendUrl, { redirect: "manual" });

  if (res.status === 302) {
    const location = res.headers.get("location") || "/";
    const setCookie = res.headers.get("set-cookie");

    // Extract path+search from backend redirect URL (may be absolute to backend host)
    let redirectPath: string;
    try {
      const u = new URL(location);
      redirectPath = u.pathname + u.search;
    } catch {
      redirectPath = location;
    }

    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }
    return response;
  }

  return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
}

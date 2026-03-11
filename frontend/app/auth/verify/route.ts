import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  // Forward to backend — backend sets cookie and redirects
  const backendUrl = `${API_BASE}/api/auth/verify?token=${token}`;
  const res = await fetch(backendUrl, { redirect: "manual" });

  if (res.status === 302) {
    const location = res.headers.get("location");
    const setCookie = res.headers.get("set-cookie");
    const response = NextResponse.redirect(location || "/", { status: 302 });
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }
    return response;
  }

  return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
}

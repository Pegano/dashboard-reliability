import { NextRequest, NextResponse } from "next/server";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export async function GET(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  const res = await fetch(`${API_BASE}/api/team/`, {
    headers: { ...(session ? { Cookie: `session=${session}` } : {}) },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.INTERNAL_API_URL || "http://localhost:8000";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  const res = await fetch(`${API_BASE}/api/onboarding/send-test-alert`, {
    method: "POST",
    headers: session ? { Cookie: `session=${session}` } : {},
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

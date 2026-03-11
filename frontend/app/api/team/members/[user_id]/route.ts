import { NextRequest, NextResponse } from "next/server";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ user_id: string }> }) {
  const { user_id } = await params;
  const session = request.cookies.get("session")?.value;
  const res = await fetch(`${API_BASE}/api/team/${user_id}`, {
    method: "DELETE",
    headers: { ...(session ? { Cookie: `session=${session}` } : {}) },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

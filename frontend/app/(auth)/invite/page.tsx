import { Suspense } from "react";
import AcceptInviteClient from "./AcceptInviteClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getInviteInfo(token: string): Promise<{ email: string; org_name: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/invites/info?token=${token}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center">
          <p className="text-base font-semibold mb-2" style={{ color: "var(--text)" }}>Invalid or expired invite</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ask your admin to send a new invite.</p>
        </div>
      </div>
    );
  }

  const info = await getInviteInfo(token);

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center">
          <p className="text-base font-semibold mb-2" style={{ color: "var(--text)" }}>Invalid or expired invite</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ask your admin to send a new invite.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense>
      <AcceptInviteClient token={token} email={info.email} orgName={info.org_name} />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  token: string;
  email: string;
  orgName: string;
}

export default function AcceptInviteClient({ token, email, orgName }: Props) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to accept invite");
      router.push("/");
    } catch (e: any) {
      if (e.message.includes("authenticated")) {
        router.push(`/login?next=/invite?token=${token}`);
      } else {
        setError(e.message);
      }
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm px-4">
        <div className="mb-6 text-center">
          <span className="text-lg font-semibold" style={{ color: "var(--teal)" }}>Pulse</span>
        </div>
        <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>
            Join {orgName}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            You've been invited to join <strong style={{ color: "var(--text)" }}>{orgName}</strong> on Pulse as <strong style={{ color: "var(--text)" }}>{email}</strong>.
          </p>

          {error && (
            <div className="mb-4 rounded-md px-3 py-2 text-xs" style={{ background: "rgba(242,73,92,0.1)", color: "var(--red)", border: "1px solid rgba(242,73,92,0.2)" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity"
            style={{
              background: "var(--teal)", color: "#fff",
              opacity: accepting ? 0.5 : 1,
              cursor: accepting ? "not-allowed" : "pointer",
            }}
          >
            {accepting ? "Joining…" : "Accept invite →"}
          </button>
        </div>
      </div>
    </div>
  );
}

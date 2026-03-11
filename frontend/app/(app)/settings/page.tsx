"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Member {
  user_id: string;
  email: string;
  role: string;
  joined_at: string;
}

interface PendingInvite {
  id: string;
  email: string;
  expires_at: string;
}

export default function SettingsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const loadTeam = useCallback(async () => {
    const [membersRes, invitesRes] = await Promise.all([
      fetch("/api/team/members"),
      fetch("/api/invites/list"),
    ]);
    if (membersRes.ok) setMembers(await membersRes.json());
    if (invitesRes.ok) setPendingInvites(await invitesRes.json());
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  async function handleInvite() {
    setSending(true);
    setInviteError("");
    setSent(false);
    try {
      const res = await fetch("/api/invites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send invite");
      setSent(true);
      setEmail("");
      loadTeam();
    } catch (e: any) {
      setInviteError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    const res = await fetch(`/api/invites/${inviteId}`, { method: "DELETE" });
    if (res.ok) loadTeam();
    else if (res.status === 401) router.push("/login");
  }

  async function handleRemoveMember(userId: string) {
    const res = await fetch(`/api/team/members/${userId}`, { method: "DELETE" });
    if (res.ok) loadTeam();
    else if (res.status === 401) router.push("/login");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", paddingTop: 48 }}>
      <h1 className="text-xl font-semibold mb-8" style={{ color: "var(--text)" }}>Settings</h1>

      {/* Invite a colleague */}
      <div className="rounded-lg border p-6 mb-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>Invite a colleague</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          They'll receive an email with a link to join your organisation.
        </p>
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            onKeyDown={(e) => e.key === "Enter" && email && !sending && handleInvite()}
          />
        </div>
        {inviteError && (
          <div className="mb-4 rounded-md px-3 py-2 text-xs" style={{ background: "rgba(242,73,92,0.1)", color: "var(--red)", border: "1px solid rgba(242,73,92,0.2)" }}>
            {inviteError}
          </div>
        )}
        {sent && (
          <div className="mb-4 rounded-md px-3 py-2 text-xs" style={{ background: "rgba(0,180,216,0.08)", color: "var(--teal)", border: "1px solid rgba(0,180,216,0.2)" }}>
            Invite sent.
          </div>
        )}
        <button
          onClick={handleInvite}
          disabled={!email.trim() || sending}
          className="w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity"
          style={{
            background: "var(--teal)", color: "#fff",
            opacity: !email.trim() || sending ? 0.5 : 1,
            cursor: !email.trim() || sending ? "not-allowed" : "pointer",
          }}
        >
          {sending ? "Sending…" : "Send invite →"}
        </button>
      </div>

      {/* Team */}
      {(members.length > 0 || pendingInvites.length > 0) && (
        <div className="rounded-lg border mb-6 overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Team</span>
          </div>
          {members.map((m) => (
            <div key={m.user_id} className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "var(--text)" }}>{m.email}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{
                  background: m.role === "admin" ? "rgba(0,180,216,0.1)" : "rgba(110,113,128,0.15)",
                  color: m.role === "admin" ? "var(--teal)" : "var(--text-muted)",
                }}>
                  {m.role}
                </span>
              </div>
              {m.role !== "admin" && (
                <button
                  onClick={() => handleRemoveMember(m.user_id)}
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {pendingInvites.map((inv) => (
            <div key={inv.id} className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{inv.email}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(250,180,40,0.1)", color: "#f0b429" }}>
                  invited
                </span>
              </div>
              <button
                onClick={() => handleRevokeInvite(inv.id)}
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sign out */}
      <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>Sign out</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          You'll need to request a new login link to sign in again.
        </p>
        <button
          onClick={handleLogout}
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

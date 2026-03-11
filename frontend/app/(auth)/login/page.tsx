"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "";
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: next || undefined }),
      });
      if (!res.ok) throw new Error("Something went wrong");
      setSubmitted(true);
    } catch {
      setError("Could not send login link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm px-4">
        {/* Logo / wordmark */}
        <div className="mb-8 text-center">
          <span
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--teal)" }}
          >
            Pulse
          </span>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Power BI monitoring
          </p>
        </div>

        {submitted ? (
          <div
            className="rounded-lg border px-6 py-8 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div className="text-2xl mb-3">✉️</div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
              Check your inbox
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              We sent a login link to <span style={{ color: "var(--text)" }}>{email}</span>.
              The link expires in 15 minutes.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border px-6 py-8"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p className="text-sm font-medium mb-4" style={{ color: "var(--text)" }}>
              Sign in to Pulse
            </p>

            <div className="mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                className="w-full rounded-md px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            {error && (
              <p className="text-xs mb-3" style={{ color: "var(--red)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity"
              style={{
                background: "var(--teal)",
                color: "#fff",
                opacity: loading || !email ? 0.5 : 1,
                cursor: loading || !email ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending…" : "Send login link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

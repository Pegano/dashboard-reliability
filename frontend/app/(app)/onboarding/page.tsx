"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "org" | "credentials" | "workspaces" | "live";

interface Workspace {
  id: string;
  name: string;
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "org", label: "Organisation" },
    { id: "credentials", label: "Connect Power BI" },
    { id: "workspaces", label: "Select workspaces" },
    { id: "live", label: "You're live" },
  ];
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{
              background: i < idx ? "var(--teal)" : i === idx ? "var(--teal)" : "var(--surface)",
              color: i <= idx ? "#fff" : "var(--text-muted)",
              border: i > idx ? "1px solid var(--border)" : "none",
              opacity: i < idx ? 0.5 : 1,
            }}
          >
            {i < idx ? "✓" : i + 1}
          </div>
          <span className="text-xs hidden sm:block" style={{ color: i === idx ? "var(--text)" : "var(--text-muted)" }}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className="w-8 h-px mx-1" style={{ background: "var(--border)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md px-3 py-2 text-sm outline-none"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      {hint && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

function PrimaryButton({ onClick, disabled, loading, children }: {
  onClick?: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity"
      style={{
        background: "var(--teal)", color: "#fff",
        opacity: disabled || loading ? 0.5 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("org");

  // Step 1
  const [orgName, setOrgName] = useState("");

  // Step 2
  const [azureTenantId, setAzureTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // Step 3
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleTestConnection() {
    setTesting(true);
    setTestError("");
    try {
      const res = await fetch("/api/onboarding/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: azureTenantId, client_id: clientId, client_secret: clientSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Connection failed");
      setWorkspaces(data.workspaces);
      setSelectedIds(new Set(data.workspaces.map((w: Workspace) => w.id)));
      setStep("workspaces");
    } catch (e: any) {
      setTestError(e.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_name: orgName,
          tenant_id: azureTenantId,
          client_id: clientId,
          client_secret: clientSecret,
          workspace_ids: Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Setup failed");
      setStep("live");
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pt-12 px-4">
      <div className="mb-6">
        <span className="text-lg font-semibold" style={{ color: "var(--teal)" }}>Pulse</span>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Setup — step {["org","credentials","workspaces","live"].indexOf(step) + 1} of 4</p>
      </div>

      <StepIndicator current={step} />

      {/* Step 1 — Organisation */}
      {step === "org" && (
        <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>What's your organisation called?</h2>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>This is how your workspace will appear in Pulse.</p>
          <Field label="Organisation name" value={orgName} onChange={setOrgName} placeholder="Acme Corp" />
          <PrimaryButton onClick={() => setStep("credentials")} disabled={!orgName.trim()}>
            Continue →
          </PrimaryButton>
        </div>
      )}

      {/* Step 2 — Credentials */}
      {step === "credentials" && (
        <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>Connect Power BI</h2>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            Pulse uses a service principal to read your Power BI workspaces. No data leaves your tenant.
          </p>

          <details className="mb-5 text-xs rounded-md p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <summary className="cursor-pointer font-medium" style={{ color: "var(--teal)" }}>
              How to create a service principal →
            </summary>
            <ol className="mt-3 space-y-1.5 list-decimal list-inside" style={{ color: "var(--text-muted)" }}>
              <li>Go to <strong style={{ color: "var(--text)" }}>portal.azure.com</strong> → App registrations → New registration</li>
              <li>Copy the <strong style={{ color: "var(--text)" }}>Tenant ID</strong> and <strong style={{ color: "var(--text)" }}>Application (client) ID</strong></li>
              <li>Under <strong style={{ color: "var(--text)" }}>Certificates &amp; secrets</strong> → New client secret → copy the value</li>
              <li>Under <strong style={{ color: "var(--text)" }}>API permissions</strong> → Add → Power BI Service → Dataset.Read.All + Workspace.Read.All</li>
              <li>In <strong style={{ color: "var(--text)" }}>Power BI Admin portal</strong> → Tenant settings → enable "Allow service principals to use Power BI APIs"</li>
            </ol>
          </details>

          <Field label="Azure Tenant ID" value={azureTenantId} onChange={setAzureTenantId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          <Field label="Application (client) ID" value={clientId} onChange={setClientId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          <Field label="Client secret" value={clientSecret} onChange={setClientSecret} placeholder="your-client-secret-value" type="password" />

          {testError && (
            <div className="mb-4 rounded-md px-3 py-2 text-xs" style={{ background: "rgba(242,73,92,0.1)", color: "var(--red)", border: "1px solid rgba(242,73,92,0.2)" }}>
              {testError}
            </div>
          )}

          <PrimaryButton
            onClick={handleTestConnection}
            disabled={!azureTenantId || !clientId || !clientSecret}
            loading={testing}
          >
            Test connection →
          </PrimaryButton>
        </div>
      )}

      {/* Step 3 — Workspace selection */}
      {step === "workspaces" && (
        <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>
            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} found
          </h2>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            Select which workspaces Pulse should monitor. You can change this later.
          </p>

          <div className="space-y-2 mb-5">
            {workspaces.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 cursor-pointer"
                style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(w.id)}
                  onChange={(e) => {
                    const next = new Set(selectedIds);
                    e.target.checked ? next.add(w.id) : next.delete(w.id);
                    setSelectedIds(next);
                  }}
                  className="accent-teal-500"
                />
                <span className="text-sm" style={{ color: "var(--text)" }}>{w.name}</span>
              </label>
            ))}
          </div>

          {saveError && (
            <div className="mb-4 rounded-md px-3 py-2 text-xs" style={{ background: "rgba(242,73,92,0.1)", color: "var(--red)", border: "1px solid rgba(242,73,92,0.2)" }}>
              {saveError}
            </div>
          )}

          <PrimaryButton onClick={handleComplete} disabled={selectedIds.size === 0} loading={saving}>
            Start monitoring →
          </PrimaryButton>
        </div>
      )}

      {/* Step 4 — Live */}
      {step === "live" && (
        <div className="rounded-lg border p-6 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="text-3xl mb-3">✅</div>
          <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>
            Pulse is monitoring {selectedIds.size} workspace{selectedIds.size !== 1 ? "s" : ""}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            First sync will complete within a minute. You'll receive an alert if anything needs attention.
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-md px-6 py-2 text-sm font-medium"
            style={{ background: "var(--teal)", color: "#fff", cursor: "pointer" }}
          >
            Go to dashboard →
          </button>
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-10">
        <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>How Pulse works</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Reference for behaviour that isn&apos;t obvious from the interface.
        </p>
      </div>

      <div className="space-y-10">

        <Section title="Automatic issue detection">
          <p>
            Pulse checks every model after each sync. Three conditions trigger an issue:
          </p>
          <ul>
            <li><strong>Refresh failed</strong> — the last refresh ended with an error status in Power BI.</li>
            <li><strong>Refresh delayed</strong> — no successful refresh in the past 24 hours.</li>
            <li><strong>Schema change</strong> — one or more columns disappeared from the model since the last sync.</li>
          </ul>
          <p>
            Each condition creates at most one active issue at a time. Duplicates are suppressed automatically.
          </p>
        </Section>

        <Section title="Automatic resolve">
          <p>
            Issues close themselves. There is no manual resolve button.
          </p>
          <ul>
            <li>A <em>refresh failed</em> issue closes when the next refresh completes successfully.</li>
            <li>A <em>refresh delayed</em> issue closes when a refresh is detected within the 24-hour window.</li>
            <li>A <em>schema change</em> issue closes when the missing columns reappear in the model.</li>
          </ul>
          <p>
            Resolved issues remain visible in the history — both on the Issues page and on the model&apos;s Issues tab.
          </p>
        </Section>

        <Section title="Suppress">
          <p>
            Suppress silences a known issue for 24 hours. Use it when you are already aware of a problem and don&apos;t want it generating noise or alerts while you fix it.
          </p>
          <ul>
            <li>The issue stays visible, dimmed, with the expiry time shown.</li>
            <li>No new alerts are sent while suppressed.</li>
            <li>Auto-resolve still works — if the condition clears before the 24 hours are up, the issue closes normally.</li>
            <li>After 24 hours the issue becomes active again automatically if the condition still applies.</li>
          </ul>
          <p>
            Suppress is not a substitute for fixing the underlying problem.
          </p>
        </Section>

        <Section title="Alerts">
          <p>
            Alerts are sent once per new issue — when it is first detected. No repeated reminders.
            Suppressed issues do not trigger alerts.
          </p>
          <p>
            Channels: email and Telegram. Configured via environment variables on the server.
          </p>
        </Section>

        <Section title="Sync interval">
          <p>
            Pulse polls Power BI on a fixed interval (default: 15 minutes). All data on screen reflects the last completed sync.
            The timestamp in the model header shows when the data was last fetched.
          </p>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>{title}</h2>
      <div
        className="text-sm space-y-3 rounded-lg border px-5 py-4"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          color: "var(--text-muted)",
          lineHeight: "1.6",
        }}
      >
        {children}
      </div>
    </section>
  );
}

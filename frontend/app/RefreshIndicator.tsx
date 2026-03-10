"use client";

import { useState, useEffect } from "react";

export default function RefreshIndicator({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function update() {
      if (!lastSyncedAt) { setLabel(""); return; }
      const diffMs = Date.now() - new Date(lastSyncedAt).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) setLabel("Synced just now");
      else if (mins === 1) setLabel("Synced 1 min ago");
      else setLabel(`Synced ${mins} min ago`);
    }
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [lastSyncedAt]);

  if (!label) return null;

  return (
    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
      {label}
    </span>
  );
}

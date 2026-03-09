"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function RefreshIndicator() {
  const router = useRouter();
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setSecondsAgo(0);
      setIsRefreshing(false);
    }, 500);
  }, [router]);

  function label(): string {
    if (secondsAgo < 60) return "just now";
    const mins = Math.floor(secondsAgo / 60);
    return `${mins}m ago`;
  }

  return (
    <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
      <span className="text-xs">Updated {label()}</span>
      <button
        onClick={handleRefresh}
        title="Refresh data"
        className="text-sm transition-opacity hover:opacity-70"
        style={{
          color: "var(--text-muted)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          transform: isRefreshing ? "rotate(180deg)" : "none",
          transition: "transform 0.4s",
        }}
      >
        ↻
      </button>
    </div>
  );
}

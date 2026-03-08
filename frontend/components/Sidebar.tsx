"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Pipelines", icon: "⬡" },
  { href: "/incidents", label: "Incidents", icon: "⚠" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen flex flex-col border-r" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-sm font-semibold tracking-wide" style={{ color: "var(--teal)" }}>
          Dashboard Reliability
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
              style={{
                color: active ? "var(--teal)" : "var(--text-muted)",
                background: active ? "rgba(0,180,216,0.08)" : "transparent",
              }}
            >
              <span className="text-xs">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        v0.1.0
      </div>
    </aside>
  );
}

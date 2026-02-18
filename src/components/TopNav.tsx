"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/candidates", label: "Candidats" },
  { href: "/job-posts", label: "Offres" },
  { href: "/messages", label: "Communication" },
  { href: "/interviews", label: "Entrevues" },
  { href: "/documents", label: "Documents" },
  { href: "/ai", label: "AI" },
  { href: "/performance", label: "Performances" },
  { href: "/history", label: "Historique" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, padding: "14px 16px" }}>
      <div
        className="tp-glass"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          borderRadius: 18,
          padding: "12px 12px",
          boxShadow: "0 10px 30px rgba(2,6,23,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              className="tp-gradient-bg"
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                boxShadow: "0 10px 20px rgba(30,64,175,0.25)",
              }}
            />
            <div>
              <div className="tp-gradient-text" style={{ fontWeight: 900, fontSize: 16, lineHeight: "18px" }}>
                TalentPilot AI
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Recruiting OS • Québec/Canada</div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: active ? "1px solid rgba(124,58,237,0.45)" : "1px solid rgba(148,163,184,0.35)",
                    background: active ? "rgba(124,58,237,0.10)" : "rgba(255,255,255,0.55)",
                    color: "#0f172a",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: active ? "0 10px 20px rgba(124,58,237,0.10)" : "none",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type NavItem = { href: string; label: string };

const LINKS: NavItem[] = [
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
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
    })();
  }, []);

  const activeLabel = useMemo(() => {
    const found = LINKS.find((l) => l.href === pathname);
    return found?.label ?? "Menu";
  }, [pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      className="tp-glass"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid rgba(148,163,184,0.25)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* BRAND */}
        <div style={{ display: "grid", gap: 2 }}>
          <div className="tp-gradient-text" style={{ fontWeight: 900 }}>
            TalentPilot AI
          </div>
          <div className="tp-muted" style={{ fontSize: 12 }}>
            {email ? email : "Recruiting OS • Québec/Canada"}
          </div>
        </div>

        {/* DESKTOP NAV */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    textDecoration: "none",
                    border: active ? "1px solid rgba(30,64,175,0.45)" : "1px solid rgba(148,163,184,0.25)",
                    background: active ? "rgba(30,64,175,0.08)" : "rgba(255,255,255,0.55)",
                    fontWeight: 800,
                    color: "inherit",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          <button
            onClick={logout}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(255,255,255,0.85)",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Déconnexion
          </button>

          {/* MOBILE BUTTON */}
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(255,255,255,0.75)",
              cursor: "pointer",
              fontWeight: 800,
              display: "none",
            }}
          >
            {open ? "Fermer" : activeLabel}
          </button>
        </div>
      </div>

      {/* MOBILE PANEL (simple) */}
      {open ? (
        <div style={{ padding: "0 16px 14px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gap: 10 }}>
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    textDecoration: "none",
                    border: active ? "1px solid rgba(30,64,175,0.45)" : "1px solid rgba(148,163,184,0.25)",
                    background: active ? "rgba(30,64,175,0.08)" : "rgba(255,255,255,0.55)",
                    fontWeight: 900,
                    color: "inherit",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}

            <button
              onClick={logout}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

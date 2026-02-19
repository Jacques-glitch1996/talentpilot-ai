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
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
    <header style={{ position: "sticky", top: 0, zIndex: 50, padding: "14px 16px" }}>
      <div
        className="tp-glass"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          borderRadius: 18,
          padding: "12px",
          boxShadow: "0 10px 30px rgba(2,6,23,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {/* BRAND */}
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              minWidth: 220,
            }}
          >
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
              <div className="tp-gradient-text" style={{ fontWeight: 700, fontSize: 16 }}>
                TalentPilot AI
              </div>
              <div className="tp-muted" style={{ fontSize: 12 }}>
                {email ? email : "Recruiting OS • Québec/Canada"}
              </div>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="tp-nav-desktop" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {LINKS.map((l) => {
              const active = pathname === l.href;

              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`tp-nav-pill ${active ? "tp-nav-pill-active" : ""}`}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: active
                      ? "1px solid rgba(124,58,237,0.55)"
                      : "1px solid rgba(148,163,184,0.35)",
                    background: active
                      ? "rgba(124,58,237,0.12)"
                      : "rgba(255,255,255,0.55)",
                    color: "#0f172a",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    boxShadow: active ? "0 10px 20px rgba(124,58,237,0.10)" : "none",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}

            <button
              onClick={logout}
              className="tp-nav-pill tp-nav-pill-active"
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(255,255,255,0.75)",
                cursor: "pointer",
                fontWeight: 600,
              }}
              title="Déconnexion"
            >
              Déconnexion
            </button>
          </nav>

          {/* MOBILE BUTTON */}
          <button
            className="tp-nav-mobile"
            onClick={() => setOpen((v) => !v)}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(255,255,255,0.75)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {open ? "Fermer" : activeLabel}
          </button>
        </div>

        {/* MOBILE PANEL */}
        {open && (
          <div
            className="tp-nav-mobile"
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid rgba(148,163,184,0.25)",
              display: "grid",
              gap: 8,
            }}
          >
            {LINKS.map((l) => {
              const active = pathname === l.href;

              return (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    padding: "12px",
                    borderRadius: 14,
                    border: active
                      ? "1px solid rgba(124,58,237,0.55)"
                      : "1px solid rgba(148,163,184,0.25)",
                    background: active
                      ? "rgba(124,58,237,0.12)"
                      : "rgba(255,255,255,0.65)",
                    textDecoration: "none",
                    color: "#0f172a",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {l.label}
                </Link>
              );
            })}

            <button
              onClick={logout}
              className="tp-gradient-bg"
              style={{
                padding: "12px",
                borderRadius: 14,
                border: "none",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 6,
              }}
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>

      {/* Responsive + micro hover "glass lift" (desktop only) */}
      <style jsx global>{`
        @media (max-width: 980px) {
          .tp-nav-desktop {
            display: none !important;
          }
          .tp-nav-mobile {
            display: inline-flex !important;
          }
        }
        @media (min-width: 981px) {
          .tp-nav-desktop {
            display: flex !important;
          }
          .tp-nav-mobile {
            display: none !important;
          }

          /* Micro hover: lift + ombre douce */
          .tp-nav-pill {
            transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border 140ms ease;
            will-change: transform;
          }

          .tp-nav-pill:hover {
            transform: translateY(-1px);
            box-shadow: 0 14px 30px rgba(2, 6, 23, 0.08);
            background: rgba(255, 255, 255, 0.78) !important;
          }

          /* L'active reste un peu plus "posé" */
          .tp-nav-pill.tp-nav-pill-active:hover {
            box-shadow: 0 16px 32px rgba(124, 58, 237, 0.10);
            background: rgba(124, 58, 237, 0.14) !important;
          }
        }
      `}</style>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const linkStyle = (active: boolean): React.CSSProperties => ({
  padding: "8px 10px",
  borderRadius: 10,
  textDecoration: "none",
  color: active ? "white" : "#111827",
  background: active ? "#7C3AED" : "transparent",
  border: active ? "1px solid #7C3AED" : "1px solid transparent",
});

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "blur(10px)",
        background: "rgba(255,255,255,0.8)",
        borderBottom: "1px solid #eee",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>
            <span style={{ color: "#1E40AF" }}>Talent</span>
            <span style={{ color: "#7C3AED" }}>Pilot</span> AI
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/dashboard" style={linkStyle(pathname === "/dashboard")}>
              Dashboard
            </Link>
            <Link href="/candidates" style={linkStyle(pathname === "/candidates")}>
              Candidats
            </Link>
            <Link href="/messages" style={linkStyle(pathname === "/messages")}>
              Messages
            </Link>
            <Link href="/interviews" style={linkStyle(pathname === "/interviews")}>
              Entrevues
            </Link>
            <Link href="/documents" style={linkStyle(pathname === "/documents")}>
              Documents
            </Link>
            <Link href="/job-posts" style={linkStyle(pathname === "/job-posts")}>
              Offres d’emploi
            </Link>
            <Link href="/ai" style={linkStyle(pathname === "/ai")}>
              AI
            </Link>
            <Link href="/performance" style={linkStyle(pathname === "/performance")}>
              Performances
            </Link>
            <Link href="/history" style={linkStyle(pathname === "/history")}>
              Historique
            </Link>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "pointer",
          }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}

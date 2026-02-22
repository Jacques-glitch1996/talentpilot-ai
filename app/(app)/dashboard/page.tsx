"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? "");
    })();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px 40px" }}>
        <div
          className="tp-glass"
          style={{
            borderRadius: 20,
            padding: 20,
            boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0 }}>Dashboard</h1>
            <div className="tp-muted" style={{ marginTop: 6 }}>
              Aperçu général de votre activité de recrutement.
            </div>
            </div>

            <button
              onClick={logout}
              className="tp-gradient-bg"
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 10px 20px rgba(124,58,237,0.25)",
              }}
            >
              Déconnexion
            </button>
          </div>

          <div style={{ height: 18 }} />

          <div style={{ fontSize: 14 }}>
            Connecté : <b>{email || "…"}</b>
          </div>
        </div>
      </div>
    </>
  );
}

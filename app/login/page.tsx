"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="tp-glass"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 30,
          borderRadius: 24,
          boxShadow: "0 20px 40px rgba(2,6,23,0.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="tp-gradient-text" style={{ fontWeight: 900, fontSize: 24 }}>
            TalentPilot AI
          </div>
          <div style={{ opacity: 0.6, marginTop: 6 }}>
            Recruiting Operating System
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
          <input
            type="email"
            placeholder="Courriel professionnel"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.4)",
              background: "rgba(255,255,255,0.7)",
            }}
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.4)",
              background: "rgba(255,255,255,0.7)",
            }}
          />

          {errorMsg && (
            <div style={{ color: "crimson", fontSize: 14 }}>
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="tp-gradient-bg"
            style={{
              padding: 14,
              borderRadius: 999,
              border: "none",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 10px 20px rgba(124,58,237,0.3)",
            }}
          >
            {busy ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

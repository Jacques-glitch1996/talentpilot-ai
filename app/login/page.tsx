"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/dashboard");
  };

  const inputStyle = {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.4)",
    background: "rgba(255,255,255,0.7)",
    outline: "none",
    width: "100%",
  } as const;

  return (
    <div
      className="tp-app-bg"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        className="tp-glass"
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 24,
          padding: 24,
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div
            className="tp-gradient-text"
            style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15 }}
          >
            TalentPilot AI
          </div>
          <div className="tp-muted" style={{ marginTop: 6 }}>
            Recruiting Operating System
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Courriel"
            style={inputStyle}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Mot de passe"
            style={inputStyle}
          />

          {errorMsg ? (
            <div style={{ color: "#b91c1c", fontWeight: 700 }}>{errorMsg}</div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="tp-gradient-bg"
            style={{
              padding: "12px 18px",
              borderRadius: 999,
              border: "none",
              color: "white",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.85 : 1,
              marginTop: 6,
            }}
          >
            {busy ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

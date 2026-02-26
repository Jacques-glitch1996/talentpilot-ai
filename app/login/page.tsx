"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="tp-app-bg" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 18 }}>
      <div className="tp-card" style={{ width: "min(520px, 100%)", padding: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="tp-h1">Connexion</div>
          <div className="tp-subtitle">Accédez à votre espace TalentPilot AI.</div>
        </div>

        <form onSubmit={onLogin} style={{ display: "grid", gap: 10 }}>
          <input
            className="tp-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="tp-input"
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error ? (
            <div className="tp-badge tp-badge-error" style={{ justifyContent: "center" }}>
              {error}
            </div>
          ) : null}

          <button className="tp-btn tp-btn-primary tp-btn-lg" type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="tp-btn tp-btn-secondary"
              onClick={() => router.push("/")}
            >
              Retour
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
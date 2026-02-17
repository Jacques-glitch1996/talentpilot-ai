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

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      // Safari/Extensions: fetch peut planter avant de retourner une erreur Supabase
      setErrorMsg(
        "Connexion impossible (erreur réseau). Vérifiez Safari (cookies/anti-tracking) ou testez Chrome. Détail: " +
          (err?.message ?? "TypeError")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>Connexion</h1>
      <p style={{ marginTop: 0, opacity: 0.7 }}>Accédez à TalentPilot AI</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
        />

        {errorMsg ? <div style={{ color: "crimson", fontSize: 14 }}>{errorMsg}</div> : null}

        <button
          type="submit"
          disabled={busy}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "none",
            color: "white",
            background: "#7C3AED",
            cursor: "pointer",
          }}
        >
          {busy ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

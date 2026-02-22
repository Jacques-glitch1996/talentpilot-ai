"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AIPage() {
  const router = useRouter();

  const [type, setType] = useState("job_description");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
    })();
  }, [router]);

  const run = async () => {
    setErr("");
    setOutput("");
    setBusy(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setBusy(false);
      router.push("/login");
      return;
    }

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, input }),
      });

      const json = await res.json();
      setBusy(false);

      if (!res.ok) {
        setErr(json?.error ?? "Erreur inconnue");
        return;
      }

      setOutput(json.output ?? "");
      if (json?.error) setErr(json.error); // cas log failed
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message ?? "Erreur réseau");
    }
  };

  return (
    <>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px 40px" }}>
        <div className="tp-glass" style={{ borderRadius: 18, padding: 16, boxShadow: "0 10px 30px rgba(2,6,23,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22 }}>Génération AI</h1>
              <div className="tp-muted" style={{ marginTop: 6 }}>
                Générez des contenus RH prêts à utiliser (Québec / Canada).
              </div>
            </div>

            <button
              onClick={run}
              disabled={busy || !input.trim()}
              className="tp-gradient-bg"
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 700,
                cursor: busy || !input.trim() ? "not-allowed" : "pointer",
                opacity: busy || !input.trim() ? 0.65 : 1,
                boxShadow: "0 12px 26px rgba(124,58,237,0.20)",
              }}
            >
              {busy ? "Génération..." : "Générer"}
            </button>
          </div>

          <div style={{ height: 14 }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div className="tp-pill" style={{ fontSize: 13, opacity: 0.8, alignSelf: "center" }}>
              Type
            </div>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(255,255,255,0.8)",
                minWidth: 220,
                outline: "none",
              }}
            >
              <option value="job_description">Offre d’emploi</option>
              <option value="outreach">Message de prospection</option>
              <option value="interview">Questions d’entrevue</option>
            </select>
          </div>

          <div style={{ height: 14 }} />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Collez ici les informations (poste, stack, seniorité, ton, contexte, etc.)"
            rows={7}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(255,255,255,0.85)",
              outline: "none",
            }}
          />

          {err ? (
            <div style={{ marginTop: 12, color: "crimson", fontWeight: 600 }}>
              ❌ {err}
            </div>
          ) : null}

          <div style={{ height: 12 }} />

          <textarea
            value={output}
            readOnly
            placeholder="Résultat..."
            rows={12}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(255,255,255,0.75)",
              outline: "none",
            }}
          />
        </div>
      </div>
    </>
  );
}
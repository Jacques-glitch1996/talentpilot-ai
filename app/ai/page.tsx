"use client";

import TopNav from "@/components/TopNav";
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, input, access_token: token }),
      });

      const json = await res.json();
      setBusy(false);

      if (!res.ok) {
        setErr(json?.error ?? "Erreur inconnue");
        return;
      }

      setOutput(json.output ?? "");
      if (json?.error) setErr(json.error); // cas "log failed"
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message ?? "Erreur réseau");
    }
  };

  return (
    <>
      <TopNav />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 50px" }}>
        <div
          className="tp-glass"
          style={{
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 20px 40px rgba(2,6,23,0.08)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0 }}>Génération AI</h1>
            <div style={{ opacity: 0.65, marginTop: 6 }}>
              Créez rapidement des contenus RH prêts à l’emploi.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* INPUT */}
            <div>
              <div style={{ marginBottom: 10, fontWeight: 800 }}>Configuration</div>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.4)",
                  background: "rgba(255,255,255,0.75)",
                  marginBottom: 12,
                }}
              >
                <option value="job_description">Job Description</option>
                <option value="outreach">Outreach</option>
                <option value="interview">Interview</option>
              </select>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Collez ici les informations (poste, stack, ton, contexte, etc.)"
                rows={10}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.4)",
                  background: "rgba(255,255,255,0.75)",
                  resize: "none",
                }}
              />

              <div style={{ marginTop: 14 }}>
                <button
                  onClick={run}
                  disabled={busy || !input.trim()}
                  className="tp-gradient-bg"
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 999,
                    border: "none",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 10px 25px rgba(124,58,237,0.3)",
                    opacity: busy || !input.trim() ? 0.75 : 1,
                  }}
                >
                  {busy ? "Génération en cours..." : "Générer"}
                </button>
              </div>

              {err ? <div style={{ color: "crimson", marginTop: 12 }}>❌ {err}</div> : null}
            </div>

            {/* OUTPUT */}
            <div>
              <div style={{ marginBottom: 10, fontWeight: 800 }}>Résultat</div>

              <textarea
                value={output}
                readOnly
                placeholder="Résultat..."
                rows={14}
                style={{
                  width: "100%",
                  padding: 16,
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.4)",
                  background: "rgba(255,255,255,0.85)",
                  resize: "none",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ApiResponse = {
  output?: string;
  error?: string;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Erreur réseau";
}

function asApiResponse(json: unknown): ApiResponse {
  if (typeof json !== "object" || json === null) return {};
  const obj = json as Record<string, unknown>;
  return {
    output: typeof obj.output === "string" ? obj.output : undefined,
    error: typeof obj.error === "string" ? obj.error : undefined,
  };
}

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

      const jsonUnknown: unknown = await res.json().catch(() => ({}));
      const json = asApiResponse(jsonUnknown);

      setBusy(false);

      if (!res.ok) {
        setErr(json.error ?? "Erreur inconnue");
        return;
      }

      setOutput(json.output ?? "");
      if (json.error) setErr(json.error); // cas "AI ok but log failed"
    } catch (e: unknown) {
      setBusy(false);
      setErr(getErrorMessage(e));
    }
  };

  return (
    <>
      <TopNav />

      <div style={{ padding: 22, maxWidth: 1100, margin: "0 auto" }}>
        <div className="tp-section-header">
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Génération AI</div>
            <div className="tp-muted" style={{ marginTop: 6 }}>
              Générez des contenus RH prêts à utiliser (Québec / Canada).
            </div>
          </div>
        </div>

        <div
          className="tp-glass"
          style={{
            padding: 18,
            borderRadius: 22,
            border: "1px solid rgba(148,163,184,0.25)",
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ fontWeight: 800 }}>Type</label>
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
                <option value="outreach_message">Message de prospection</option>
                <option value="interview_questions">Questions d’entrevue</option>
              </select>

              <button
                onClick={run}
                disabled={busy}
                className="tp-gradient-bg"
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: "none",
                  color: "white",
                  fontWeight: 900,
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.85 : 1,
                }}
              >
                {busy ? "Génération..." : "Générer"}
              </button>
            </div>

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
              <div style={{ marginTop: 2, color: "crimson", fontWeight: 700 }}>
                ❌ {err}
              </div>
            ) : null}

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
      </div>
    </>
  );
}

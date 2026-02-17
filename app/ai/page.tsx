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

    // IMPORTANT: aucun header -> évite l'erreur ISO-8859-1 dans votre environnement
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ type, input, access_token: token }),
    });

    let json: any = {};
    try {
      json = await res.json();
    } catch {
      // si le serveur renvoie autre chose
    }

    setBusy(false);

    if (!res.ok) {
      setErr(json?.error ?? "Erreur inconnue");
      return;
    }

    setOutput(json.output ?? "");
    if (json?.error) setErr(json.error);
  };

  return (
    <>
      <TopNav />
      <div style={{ padding: 20, maxWidth: 1000 }}>
        <h1>Génération AI</h1>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="job_description">Job Description</option>
            <option value="outreach">Outreach</option>
            <option value="interview">Interview</option>
          </select>

          <button
            onClick={run}
            disabled={busy || !input.trim()}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "none",
              background: "#7C3AED",
              color: "white",
              cursor: "pointer",
            }}
          >
            {busy ? "Génération..." : "Générer"}
          </button>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Collez ici les informations (poste, stack, ton, contexte, etc.)"
          rows={6}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ddd",
          }}
        />

        {err ? <div style={{ color: "crimson", marginTop: 10 }}>❌ {err}</div> : null}

        <textarea
          value={output}
          readOnly
          placeholder="Résultat..."
          rows={10}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ddd",
          }}
        />
      </div>
    </>
  );
}

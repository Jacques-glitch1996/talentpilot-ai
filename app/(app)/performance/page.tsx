"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type KPI = {
  candidates: number;
  job_posts: number;
  messages: number;
  interviews: number;
  documents: number;
  ai_logs: number;
};

export default function PerformancePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [kpi, setKpi] = useState<KPI>({
    candidates: 0,
    job_posts: 0,
    messages: 0,
    interviews: 0,
    documents: 0,
    ai_logs: 0,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      await loadKpis();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadKpis = async () => {
    setErr("");

    const tables = ["candidates", "job_posts", "messages", "interviews", "documents", "ai_logs"] as const;

    const results = await Promise.all(
      tables.map(async (t) => {
        const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
        return { table: t, count: count ?? 0, error };
      })
    );

    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) {
      setErr(firstErr.message);
      return;
    }

    const next: KPI = {
      candidates: results.find((r) => r.table === "candidates")?.count ?? 0,
      job_posts: results.find((r) => r.table === "job_posts")?.count ?? 0,
      messages: results.find((r) => r.table === "messages")?.count ?? 0,
      interviews: results.find((r) => r.table === "interviews")?.count ?? 0,
      documents: results.find((r) => r.table === "documents")?.count ?? 0,
      ai_logs: results.find((r) => r.table === "ai_logs")?.count ?? 0,
    };

    setKpi(next);
  };

  const cards = useMemo(
    () => [
      { label: "Candidats", value: kpi.candidates, hint: "Base candidats" },
      { label: "Offres d’emploi", value: kpi.job_posts, hint: "Postes actifs / créés" },
      { label: "Messages", value: kpi.messages, hint: "Communication" },
      { label: "Entrevues", value: kpi.interviews, hint: "Planifiées / créées" },
      { label: "Documents", value: kpi.documents, hint: "CV, rapports, fichiers" },
      { label: "Générations AI", value: kpi.ai_logs, hint: "Historique IA" },
    ],
    [kpi]
  );

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1">Performances</h1>
          <p className="tp-subtitle">Indicateurs clés pour piloter votre recrutement.</p>
        </div>

        <button className="tp-btn tp-btn-primary" onClick={loadKpis}>
          Actualiser
        </button>
      </div>

      <div className="tp-card">
        {err ? (
          <div className="tp-badge tp-badge-error" style={{ marginBottom: 14 }}>
            ❌ {err}
          </div>
        ) : null}

        {loading ? (
          <div className="tp-muted">Chargement...</div>
        ) : (
          <>
            {/* KPI GRID */}
            <div className="tp-grid">
              {cards.map((c) => (
                <div key={c.label} className="tp-card tp-col-4">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>{c.label}</div>
                    <div className="tp-gradient-text" style={{ fontSize: 28, fontWeight: 900, lineHeight: "28px" }}>
                      {c.value}
                    </div>
                  </div>
                  <div className="tp-muted" style={{ marginTop: 8, fontSize: 13 }}>
                    {c.hint}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ height: 16 }} />

            {/* SUMMARY */}
            <div
              style={{
                padding: 16,
                borderRadius: 18,
                background: "rgba(255,255,255,0.70)",
                border: "1px solid rgba(148,163,184,0.20)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Résumé</div>
              <div style={{ fontSize: 14, opacity: 0.85 }}>
                Vous avez <b>{kpi.candidates}</b> candidats, <b>{kpi.job_posts}</b> offres,{" "}
                <b>{kpi.messages}</b> messages, <b>{kpi.interviews}</b> entrevues,{" "}
                <b>{kpi.documents}</b> documents et <b>{kpi.ai_logs}</b> générations AI enregistrées.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
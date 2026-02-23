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
        const { count, error } = await supabase
          .from(t)
          .select("*", { count: "exact", head: true });

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
    <>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 50px" }}>
        <div
          className="tp-glass"
          style={{
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 20px 40px rgba(2,6,23,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0 }}>Performances</h1>
              <div style={{ opacity: 0.65, marginTop: 6 }}>
                Indicateurs clés pour piloter votre recrutement.
              </div>
            </div>

            <button
              onClick={loadKpis}
              className="tp-gradient-bg"
              style={{
                padding: "12px 18px",
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Actualiser
            </button>
          </div>

          <div style={{ height: 18 }} />

          {err ? <div style={{ color: "crimson", marginBottom: 14 }}>❌ {err}</div> : null}

          {loading ? (
            <div>Chargement...</div>
          ) : (
            <>
              {/* KPI GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {cards.map((c) => (
                  <div
                    key={c.label}
                    style={{
                      padding: 18,
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(148,163,184,0.25)",
                      boxShadow: "0 10px 25px rgba(2,6,23,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 900 }}>{c.label}</div>
                      <div
                        className="tp-gradient-text"
                        style={{ fontSize: 28, fontWeight: 900, lineHeight: "28px" }}
                      >
                        {c.value}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>{c.hint}</div>
                  </div>
                ))}
              </div>

              <div style={{ height: 18 }} />

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

      {/* Responsive tweak (simple) */}
      <style jsx global>{`
        @media (max-width: 900px) {
          .tp-kpi-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

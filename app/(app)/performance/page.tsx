"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart3,
  RefreshCcw,
  XCircle,
  TrendingUp,
  Users,
  Briefcase,
  MessageSquare,
  CalendarDays,
  FileText,
  Sparkles,
} from "lucide-react";

type KPI = {
  candidates: number;
  job_posts: number;
  messages: number;
  interviews: number;
  documents: number;
  ai_logs: number;
};

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="tp-badge tp-badge-info">{children}</span>;
}

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
      { label: "Candidats", value: kpi.candidates, hint: "Base candidats", icon: <Users size={18} /> },
      { label: "Offres d’emploi", value: kpi.job_posts, hint: "Postes actifs / créés", icon: <Briefcase size={18} /> },
      { label: "Messages", value: kpi.messages, hint: "Communication", icon: <MessageSquare size={18} /> },
      { label: "Entrevues", value: kpi.interviews, hint: "Planifiées / créées", icon: <CalendarDays size={18} /> },
      { label: "Documents", value: kpi.documents, hint: "CV, rapports, fichiers", icon: <FileText size={18} /> },
      { label: "Générations IA", value: kpi.ai_logs, hint: "Historique IA", icon: <Sparkles size={18} /> },
    ],
    [kpi]
  );

  const adoption = useMemo(() => {
    const base = kpi.job_posts + kpi.messages + kpi.interviews + kpi.documents;
    if (base <= 0) return 0;
    return Math.min(100, Math.round((kpi.ai_logs / base) * 100));
  }, [kpi]);

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <BarChart3 size={18} />
            Performances
          </h1>
          <p className="tp-subtitle">Indicateurs clés pour piloter votre recrutement.</p>
        </div>

        <button className="tp-btn tp-btn-primary" onClick={loadKpis}>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <RefreshCcw size={16} />
            Actualiser
          </span>
        </button>
      </div>

      {err ? (
        <div className="tp-badge tp-badge-error" style={{ marginBottom: 14, gap: 8 }}>
          <XCircle size={14} />
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="tp-muted">Chargement...</div>
      ) : (
        <>
          {/* KPI GRID */}
          <div className="tp-grid">
            {cards.map((c) => (
              <div
                key={c.label}
                className="tp-card tp-col-4"
                style={{
                  padding: 16,
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(148,163,184,0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span className="tp-badge tp-badge-info" style={{ gap: 8 }}>
                      {c.icon}
                      KPI
                    </span>
                    <div style={{ fontWeight: 900 }}>{c.label}</div>
                  </div>

                  <div className="tp-gradient-text" style={{ fontSize: 28, fontWeight: 900, lineHeight: "28px" }}>
                    {c.value}
                  </div>
                </div>

                <div className="tp-muted" style={{ marginTop: 10, fontSize: 13 }}>
                  {c.hint}
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: 14 }} />

          {/* Résumé + Adoption IA */}
          <div className="tp-grid">
            <div className="tp-card tp-col-8" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900, display: "flex", gap: 8, alignItems: "center" }}>
                  <TrendingUp size={18} />
                  Résumé exécutif
                </div>
                <Badge>Vue globale</Badge>
              </div>

              <div className="tp-muted" style={{ marginTop: 10, fontSize: 14 }}>
                Vous avez <b>{kpi.candidates}</b> candidats, <b>{kpi.job_posts}</b> offres,{" "}
                <b>{kpi.messages}</b> messages, <b>{kpi.interviews}</b> entrevues,{" "}
                <b>{kpi.documents}</b> documents et <b>{kpi.ai_logs}</b> générations IA enregistrées.
              </div>
            </div>

            <div className="tp-card tp-col-4" style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, display: "flex", gap: 8, alignItems: "center" }}>
                <Sparkles size={18} />
                Adoption IA
              </div>

              <div className="tp-muted" style={{ marginTop: 8, fontSize: 13 }}>
                Ratio IA vs actions (indicatif)
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ height: 10, borderRadius: 999, background: "rgba(148,163,184,0.25)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${adoption}%`, background: "linear-gradient(135deg, var(--tp-blue), var(--tp-violet))" }} />
                </div>

                <div style={{ marginTop: 10, fontWeight: 900, fontSize: 24 }}>
                  {adoption}%
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
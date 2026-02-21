"use client";

import TopNav from "@/components/TopNav";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Counts = {
  candidates: number;
  jobPosts: number;
  aiLogs7d: number;
  aiLogs24h: number;
};

type AiLog = {
  id: string;
  type: string;
  created_at: string;
};

function isoSince(msAgo: number) {
  return new Date(Date.now() - msAgo).toISOString();
}

export default function PerformancePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [counts, setCounts] = useState<Counts>({
    candidates: 0,
    jobPosts: 0,
    aiLogs7d: 0,
    aiLogs24h: 0,
  });

  const [typeBreakdown, setTypeBreakdown] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    setErr("");

    // Compteurs "safe" (tables déjà utilisées ailleurs)
    const [candRes, jobRes, logs7dRes, logs24hRes] = await Promise.all([
      supabase.from("candidates").select("*", { head: true, count: "exact" }),
      supabase.from("job_posts").select("*", { head: true, count: "exact" }),
      supabase
        .from("ai_logs")
        .select("*", { head: true, count: "exact" })
        .gte("created_at", isoSince(7 * 24 * 60 * 60 * 1000)),
      supabase
        .from("ai_logs")
        .select("*", { head: true, count: "exact" })
        .gte("created_at", isoSince(24 * 60 * 60 * 1000)),
    ]);

    const firstErr =
      candRes.error ?? jobRes.error ?? logs7dRes.error ?? logs24hRes.error ?? null;

    if (firstErr) {
      setErr(firstErr.message);
      return;
    }

    setCounts({
      candidates: candRes.count ?? 0,
      jobPosts: jobRes.count ?? 0,
      aiLogs7d: logs7dRes.count ?? 0,
      aiLogs24h: logs24hRes.count ?? 0,
    });

    // Breakdown simple par type (sur un sample récent, pour rester léger)
    const { data: logs, error: logsErr } = await supabase
      .from("ai_logs")
      .select("id,type,created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (logsErr) {
      setErr(logsErr.message);
      setTypeBreakdown({});
      return;
    }

    const map: Record<string, number> = {};
    (logs ?? []).forEach((l) => {
      const row = l as AiLog;
      const t = (row.type || "unknown").trim() || "unknown";
      map[t] = (map[t] ?? 0) + 1;
    });
    setTypeBreakdown(map);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      await refresh();
      setLoading(false);
    })();
  }, [router, refresh]);

  const breakdownRows = useMemo(() => {
    return Object.entries(typeBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ type: k, count: v }));
  }, [typeBreakdown]);

  const cardStyle = {
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(148,163,184,0.25)",
  } as const;

  return (
    <>
      <TopNav />

      <div style={{ padding: 22, maxWidth: 1200, margin: "0 auto" }}>
        <div className="tp-section-header">
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Performances</div>
            <div className="tp-muted" style={{ marginTop: 6 }}>
              Indicateurs simples (base de données + usage AI).
            </div>
          </div>

          <div className="tp-actions">
            <button
              onClick={refresh}
              className="tp-gradient-bg"
              style={{
                padding: "12px 18px",
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Actualiser
            </button>
          </div>
        </div>

        {err ? (
          <div style={{ marginBottom: 14, color: "crimson", fontWeight: 900 }}>
            ❌ {err}
          </div>
        ) : null}

        {loading ? (
          <div>Chargement...</div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={cardStyle}>
                <div className="tp-muted" style={{ fontSize: 12 }}>
                  Candidats
                </div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{counts.candidates}</div>
              </div>

              <div style={cardStyle}>
                <div className="tp-muted" style={{ fontSize: 12 }}>
                  Offres d’emploi
                </div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{counts.jobPosts}</div>
              </div>

              <div style={cardStyle}>
                <div className="tp-muted" style={{ fontSize: 12 }}>
                  AI logs (24h)
                </div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{counts.aiLogs24h}</div>
              </div>

              <div style={cardStyle}>
                <div className="tp-muted" style={{ fontSize: 12 }}>
                  AI logs (7 jours)
                </div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{counts.aiLogs7d}</div>
              </div>
            </div>

            <div style={{ height: 16 }} />

            <div
              className="tp-glass"
              style={{
                padding: 16,
                borderRadius: 22,
                border: "1px solid rgba(148,163,184,0.25)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                Répartition (dernier échantillon de 500 logs)
              </div>

              {breakdownRows.length === 0 ? (
                <div className="tp-muted">Aucune donnée.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {breakdownRows.map((r) => (
                    <div
                      key={r.type}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.6)",
                        border: "1px solid rgba(148,163,184,0.2)",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>{r.type}</div>
                      <div className="tp-muted" style={{ fontWeight: 900 }}>
                        {r.count}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

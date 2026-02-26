"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/app-shell/PageHeader";
import {
  Hand,
  Zap,
  RefreshCcw,
  LogOut,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react";

type CandidateStatus = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";

type KPI = {
  candidates: number;
  job_posts: number;
  interviews: number;
  messages: number;
  documents: number;
  ai_logs: number;
};

type StatusCounts = Record<CandidateStatus, number> & { total: number };
type SourceCounts = Array<{ source: string; count: number }>;

type ActivityItem =
  | { kind: "message"; id: string; label: string; meta: string; date: string }
  | { kind: "interview"; id: string; label: string; meta: string; date: string }
  | { kind: "document"; id: string; label: string; meta: string; date: string }
  | { kind: "ai"; id: string; label: string; meta: string; date: string };

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

function humanDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function clampText(txt: string, n = 90) {
  const t = (txt || "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n) + "…";
}

function ToneBadge({ tone, children }: { tone: "info" | "success" | "warning" | "error"; children: React.ReactNode }) {
  const cls =
    tone === "success"
      ? "tp-badge tp-badge-success"
      : tone === "warning"
      ? "tp-badge tp-badge-warning"
      : tone === "error"
      ? "tp-badge tp-badge-error"
      : "tp-badge tp-badge-info";

  const Icon =
    tone === "success" ? CheckCircle2 : tone === "warning" ? AlertTriangle : tone === "error" ? XCircle : Info;

  return (
    <span className={cls} style={{ gap: 8 }}>
      <Icon size={14} />
      {children}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState<string>("");

  const [kpi, setKpi] = useState<KPI>({
    candidates: 0,
    job_posts: 0,
    interviews: 0,
    messages: 0,
    documents: 0,
    ai_logs: 0,
  });

  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    new: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
    total: 0,
  });

  const [topSources, setTopSources] = useState<SourceCounts>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [busyLogout, setBusyLogout] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email ?? "";
      setEmail(userEmail);

      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userData.user?.id ?? "")
          .maybeSingle();

        const fullName = (prof as any)?.full_name?.trim?.() ?? "";
        if (fullName) setDisplayName(fullName);
      } catch {
        // ignore
      }

      await Promise.all([loadKpis(), loadPipeline(), loadActivity()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadKpis = async () => {
    setErr("");

    const tables = ["candidates", "job_posts", "interviews", "messages", "documents", "ai_logs"] as const;

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

    setKpi({
      candidates: results.find((r) => r.table === "candidates")?.count ?? 0,
      job_posts: results.find((r) => r.table === "job_posts")?.count ?? 0,
      interviews: results.find((r) => r.table === "interviews")?.count ?? 0,
      messages: results.find((r) => r.table === "messages")?.count ?? 0,
      documents: results.find((r) => r.table === "documents")?.count ?? 0,
      ai_logs: results.find((r) => r.table === "ai_logs")?.count ?? 0,
    });
  };

  const loadPipeline = async () => {
    setErr("");

    const { data, error } = await supabase
      .from("candidates")
      .select("status, source")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      return;
    }

    const rows = (data ?? []) as Array<{ status: CandidateStatus | null; source: string | null }>;

    const sc: StatusCounts = {
      new: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
      total: rows.length,
    };

    const sources = new Map<string, number>();

    for (const r of rows) {
      const s = (r.status || "new") as CandidateStatus;
      sc[s] += 1;

      const src = (r.source || "Other").trim() || "Other";
      sources.set(src, (sources.get(src) ?? 0) + 1);
    }

    setStatusCounts(sc);

    const sortedSources = Array.from(sources.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setTopSources(sortedSources);
  };

  const loadActivity = async () => {
    setErr("");

    const [m, i, d, a] = await Promise.all([
      supabase.from("messages").select("id, channel, content, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("interviews").select("id, candidate_id, job_post_id, interview_date, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("documents").select("id, file_type, candidate_id, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("ai_logs").select("id, type, created_at, input, output").order("created_at", { ascending: false }).limit(5),
    ]);

    const merged: ActivityItem[] = [];

    if (!m.error && m.data) {
      for (const row of m.data as any[]) {
        merged.push({
          kind: "message",
          id: row.id,
          label: `Message (${row.channel})`,
          meta: clampText(row.content || "", 80),
          date: row.created_at,
        });
      }
    }

    if (!i.error && i.data) {
      for (const row of i.data as any[]) {
        merged.push({
          kind: "interview",
          id: row.id,
          label: "Entrevue",
          meta: `Candidat: ${String(row.candidate_id).slice(0, 8)} • Offre: ${String(row.job_post_id).slice(0, 8)}`,
          date: row.interview_date ?? row.created_at,
        });
      }
    }

    if (!d.error && d.data) {
      for (const row of d.data as any[]) {
        merged.push({
          kind: "document",
          id: row.id,
          label: "Document",
          meta: `${row.file_type} • Candidat: ${String(row.candidate_id).slice(0, 8)}`,
          date: row.created_at,
        });
      }
    }

    if (!a.error && a.data) {
      for (const row of a.data as any[]) {
        merged.push({
          kind: "ai",
          id: row.id,
          label: `IA : ${row.type || "génération"}`,
          meta: clampText(row.output || row.input || "", 80),
          date: row.created_at,
        });
      }
    }

    merged.sort((x, y) => (x.date < y.date ? 1 : -1));
    setActivity(merged.slice(0, 12));
  };

  const greeting = useMemo(() => {
    const name = displayName || (email ? email.split("@")[0] : "");
    const cap = name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
    return cap ? `Bonjour ${cap}` : "Bonjour";
  }, [displayName, email]);

  const conv = useMemo(() => {
    const total = statusCounts.total;
    return {
      screening: pct(statusCounts.screening + statusCounts.interview + statusCounts.offer + statusCounts.hired, total),
      interview: pct(statusCounts.interview + statusCounts.offer + statusCounts.hired, total),
      offer: pct(statusCounts.offer + statusCounts.hired, total),
      hired: pct(statusCounts.hired, total),
    };
  }, [statusCounts]);

  const bottleneck = useMemo(() => {
    const pairs: Array<[CandidateStatus, number]> = [
      ["new", statusCounts.new],
      ["screening", statusCounts.screening],
      ["interview", statusCounts.interview],
      ["offer", statusCounts.offer],
    ];
    pairs.sort((a, b) => b[1] - a[1]);
    return pairs[0];
  }, [statusCounts]);

  const aiUsage = useMemo(() => {
    const base = kpi.job_posts + kpi.messages + kpi.interviews + kpi.documents;
    if (base <= 0) return 0;
    return Math.min(100, Math.round((kpi.ai_logs / base) * 100));
  }, [kpi]);

  async function signOut() {
    setBusyLogout(true);
    await supabase.auth.signOut();
    setBusyLogout(false);
    router.push("/login");
  }

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle="Pipeline, conversions, sources, IA et KPIs — version exécutive."
      />

      <div className="tp-page">
        {/* En-tête */}
        <div className="tp-card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div className="tp-h1" style={{ fontSize: 22, display: "flex", gap: 8, alignItems: "center" }}>
                <Hand size={18} />
                {greeting}
              </div>
              <div className="tp-muted" style={{ marginTop: 4, fontSize: 13 }}>
                {email ? `Connecté : ${email}` : "Connecté"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="tp-btn tp-btn-secondary"
                onClick={() => Promise.all([loadKpis(), loadPipeline(), loadActivity()])}
              >
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <RefreshCcw size={16} />
                  Rafraîchir
                </span>
              </button>

              <button className="tp-btn tp-btn-primary" onClick={signOut} disabled={busyLogout} style={{ opacity: busyLogout ? 0.7 : 1 }}>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <LogOut size={16} />
                  {busyLogout ? "Déconnexion..." : "Déconnexion"}
                </span>
              </button>
            </div>
          </div>

          {err ? (
            <div className="tp-badge tp-badge-error" style={{ marginTop: 12, gap: 8 }}>
              <XCircle size={14} />
              {err}
            </div>
          ) : null}
        </div>

        {/* KPIs */}
        <div className="tp-grid">
          <KpiCard label="Candidats" value={kpi.candidates} hint="Total" />
          <KpiCard label="Offres" value={kpi.job_posts} hint="Créées" />
          <KpiCard label="Entrevues" value={kpi.interviews} hint="Créées" />
          <KpiCard label="Messages" value={kpi.messages} hint="Créés" />
          <KpiCard label="Documents" value={kpi.documents} hint="Ajoutés" />
          <KpiCard label="Générations IA" value={kpi.ai_logs} hint="Journal" />
        </div>

        {/* Pipeline + Conversions + Sources */}
        <div style={{ marginTop: 16 }} className="tp-grid">
          <div className="tp-card tp-col-8" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Aperçu du pipeline</div>
                <div className="tp-muted" style={{ fontSize: 13 }}>
                  Répartition des candidats par étape.
                </div>
              </div>
              <Link className="tp-btn tp-btn-secondary" href="/candidates">
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  Ouvrir le pipeline <ArrowRight size={16} />
                </span>
              </Link>
            </div>

            <div style={{ height: 12 }} />

            <StageRow label="Nouveaux" value={statusCounts.new} total={statusCounts.total} tone="info" />
            <StageRow label="Présélection" value={statusCounts.screening} total={statusCounts.total} tone="warning" />
            <StageRow label="Entrevue" value={statusCounts.interview} total={statusCounts.total} tone="info" />
            <StageRow label="Offre" value={statusCounts.offer} total={statusCounts.total} tone="warning" />
            <StageRow label="Embauché" value={statusCounts.hired} total={statusCounts.total} tone="success" />
            <StageRow label="Rejeté" value={statusCounts.rejected} total={statusCounts.total} tone="error" />

            <div style={{ height: 10 }} />
            <ToneBadge tone="warning">
              Goulot d’étranglement : {bottleneck[0]} ({bottleneck[1]})
            </ToneBadge>
          </div>

          <div className="tp-card tp-col-4" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Conversions</div>
            <div className="tp-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Estimation basée sur la distribution du pipeline.
            </div>

            <div style={{ height: 12 }} />

            <ConvRow label="→ Présélection +" value={conv.screening} tone="info" />
            <ConvRow label="→ Entrevue +" value={conv.interview} tone="info" />
            <ConvRow label="→ Offre +" value={conv.offer} tone="info" />
            <ConvRow label="→ Embauché" value={conv.hired} tone="success" />

            <div style={{ height: 14 }} />

            <div style={{ fontWeight: 900, fontSize: 16 }}>Sources (Top 5)</div>
            <div className="tp-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Origine des candidats.
            </div>

            <div style={{ height: 10 }} />

            {topSources.length === 0 ? (
              <ToneBadge tone="info">Aucune donnée source</ToneBadge>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {topSources.map((s) => (
                  <div key={s.source} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span className="tp-muted">{s.source}</span>
                    <span style={{ fontWeight: 900 }}>{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Capacités IA (cartes cliquables) */}
        <div style={{ marginTop: 16 }}>
          <div className="tp-page-header" style={{ marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, display: "flex", gap: 8, alignItems: "center" }}>
                <Zap size={16} /> Capacités IA
              </div>
              <div className="tp-muted" style={{ fontSize: 13 }}>Accélérer vos livrables RH.</div>
            </div>
            <Link className="tp-btn tp-btn-secondary" href="/ai">
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                Ouvrir l’IA <ArrowRight size={16} />
              </span>
            </Link>
          </div>

          <div className="tp-card" style={{ padding: 14 }}>
            <div className="hide-scrollbar" style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
              {[
                { title: "Offre d’emploi", desc: "Descriptions claires et structurées.", href: "/job-posts" },
                { title: "Prospection", desc: "Messages email/LinkedIn personnalisés.", href: "/messages" },
                { title: "Kit d’entrevue", desc: "Questions + grille d’évaluation.", href: "/interviews" },
                { title: "Documents RH", desc: "Offres, confirmations, refus.", href: "/documents" },
                { title: "Insights", desc: "Tendances & recommandations.", href: "/performance" },
              ].map((x) => (
                <Link
                  key={x.title}
                  href={x.href}
                  className="tp-card"
                  style={{
                    minWidth: 260,
                    padding: 14,
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.80)",
                    border: "1px solid rgba(148,163,184,0.25)",
                    borderRadius: 16,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{x.title}</div>
                  <div className="tp-muted" style={{ fontSize: 13 }}>{x.desc}</div>
                  <div style={{ marginTop: 6 }}>
                    <span className="tp-btn tp-btn-secondary tp-btn-sm">Ouvrir</span>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="tp-muted" style={{ fontSize: 12, marginBottom: 6 }}>Adoption IA (indicatif)</div>
              <div style={{ height: 10, borderRadius: 999, background: "rgba(148,163,184,0.25)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${aiUsage}%`, background: "linear-gradient(135deg, var(--tp-blue), var(--tp-violet))" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Activité récente */}
        <div style={{ marginTop: 16 }}>
          <div className="tp-page-header" style={{ marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Activité récente</div>
              <div className="tp-muted" style={{ fontSize: 13 }}>Derniers événements (messages, entrevues, docs, IA).</div>
            </div>
            <Link className="tp-btn tp-btn-secondary" href="/history">
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                Voir l’historique IA <ArrowRight size={16} />
              </span>
            </Link>
          </div>

          <div className="tp-card" style={{ padding: 14 }}>
            {loading ? (
              <div className="tp-muted">Chargement...</div>
            ) : activity.length === 0 ? (
              <ToneBadge tone="info">Aucune activité récente.</ToneBadge>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {activity.map((a) => (
                  <div
                    key={`${a.kind}:${a.id}`}
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      border: "1px solid rgba(148,163,184,0.22)",
                      background: "rgba(255,255,255,0.80)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 3 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <ToneBadge tone="info">{a.kind.toUpperCase()}</ToneBadge>
                        <span style={{ fontWeight: 900 }}>{a.label}</span>
                      </div>
                      <div className="tp-muted" style={{ fontSize: 13 }}>{a.meta}</div>
                    </div>

                    <div className="tp-muted" style={{ fontSize: 12 }}>{humanDate(a.date)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions rapides */}
        <div style={{ marginTop: 16 }} className="tp-grid">
          <QuickAction title="Ajouter un candidat" desc="Créer une fiche et l’insérer dans le pipeline." href="/candidates#create" cta="Ajouter" primary />
          <QuickAction title="Créer une offre" desc="Créer une nouvelle opportunité." href="/job-posts" cta="Créer" primary />
          <QuickAction title="Générer (IA)" desc="Offres, prospection, questions d’entrevue." href="/ai" cta="Générer" primary />
        </div>
      </div>
    </>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="tp-card tp-col-4" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>{label}</div>
        <ToneBadge tone="info">KPI</ToneBadge>
      </div>
      <div className="tp-gradient-text" style={{ marginTop: 10, fontSize: 30, fontWeight: 900, lineHeight: "30px" }}>
        {value}
      </div>
      <div className="tp-muted" style={{ marginTop: 8, fontSize: 13 }}>
        {hint}
      </div>
    </div>
  );
}

function StageRow({
  label,
  value,
  total,
  tone = "info",
}: {
  label: string;
  value: number;
  total: number;
  tone?: "info" | "success" | "error" | "warning";
}) {
  const p = pct(value, total);
  const bg =
    tone === "success"
      ? "rgba(22,163,74,0.25)"
      : tone === "error"
      ? "rgba(220,38,38,0.22)"
      : tone === "warning"
      ? "rgba(217,119,6,0.22)"
      : "rgba(30,64,175,0.22)";

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span className="tp-muted">{label}</span>
        <span style={{ fontWeight: 900 }}>
          {value} <span className="tp-muted" style={{ fontWeight: 700 }}>({p}%)</span>
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "rgba(148,163,184,0.25)", overflow: "hidden", marginTop: 6 }}>
        <div style={{ height: "100%", width: `${p}%`, background: bg }} />
      </div>
    </div>
  );
}

function ConvRow({ label, value, tone = "info" }: { label: string; value: number; tone?: "info" | "success" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
      <span className="tp-muted">{label}</span>
      <ToneBadge tone={tone}>{value}%</ToneBadge>
    </div>
  );
}

function QuickAction({
  title,
  desc,
  href,
  cta,
  primary,
}: {
  title: string;
  desc: string;
  href: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <div className="tp-card tp-col-4" style={{ padding: 16 }}>
      <div style={{ fontWeight: 900 }}>{title}</div>
      <div className="tp-muted" style={{ marginTop: 6, fontSize: 13 }}>{desc}</div>
      <div style={{ marginTop: 12 }}>
        <Link className={`tp-btn ${primary ? "tp-btn-primary" : "tp-btn-secondary"}`} href={href}>
          {cta}
        </Link>
      </div>
    </div>
  );
}
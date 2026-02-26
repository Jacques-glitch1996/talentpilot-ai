"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JobStatus = "draft" | "published" | "archived";
type WorkMode = "Présentiel" | "Hybride" | "Télétravail";
type Seniority = "Junior" | "Intermédiaire" | "Senior" | "Lead" | "Principal" | "Directeur";
type Industry =
  | "TI"
  | "Ingénierie"
  | "Finance"
  | "RH"
  | "Marketing"
  | "Ventes"
  | "Opérations"
  | "Autre";

type JobPost = {
  id: string;
  title: string;
  description: string;
  status: JobStatus | string;
  location: string | null;
  seniority: string | null;
  industry: string | null;
  work_mode: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<JobStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

const WORK_MODES: WorkMode[] = ["Présentiel", "Hybride", "Télétravail"];
const SENIORITIES: Seniority[] = ["Junior", "Intermédiaire", "Senior", "Lead", "Principal", "Directeur"];
const INDUSTRIES: Industry[] = ["TI", "Ingénierie", "Finance", "RH", "Marketing", "Ventes", "Opérations", "Autre"];

function humanDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function badgeForStatus(status: JobStatus | string) {
  if (status === "published") return "tp-badge-success";
  if (status === "archived") return "tp-badge-warning";
  return "tp-badge-info";
}

export default function JobPostsPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState<Seniority>("Intermédiaire");
  const [industry, setIndustry] = useState<Industry>("TI");
  const [workMode, setWorkMode] = useState<WorkMode>("Hybride");
  const [status, setStatus] = useState<JobStatus>("draft");
  const [description, setDescription] = useState("");

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [modeFilter, setModeFilter] = useState<WorkMode | "all">("all");
  const [levelFilter, setLevelFilter] = useState<Seniority | "all">("all");

  // UI
  const [busySave, setBusySave] = useState(false);
  const [busyAi, setBusyAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [view, setView] = useState<"create" | "list">("create");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      await load();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const load = async () => {
    setErr("");
    setOk("");

    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setJobs([]);
      return;
    }

    setJobs((data ?? []) as JobPost[]);
  };

  const resetForm = () => {
    setTitle("");
    setLocation("");
    setSeniority("Intermédiaire");
    setIndustry("TI");
    setWorkMode("Hybride");
    setStatus("draft");
    setDescription("");
    setCopied(false);
    setErr("");
    setOk("");
  };

  const addJob = async () => {
    setErr("");
    setOk("");
    setCopied(false);

    if (!title.trim()) {
      setErr("Le titre du poste est requis.");
      return;
    }
    if (!description.trim()) {
      setErr("La description est requise (vous pouvez la générer avec l’IA).");
      return;
    }

    setBusySave(true);

    const { data, error } = await supabase
      .from("job_posts")
      .insert({
        title: title.trim(),
        description: description.trim(),
        status,
        location: location.trim() || null,
        seniority,
        industry,
        work_mode: workMode,
      })
      .select()
      .single();

    setBusySave(false);

    if (error) {
      setErr(error.message);
      return;
    }

    if (data) {
      setJobs([data as JobPost, ...jobs]);
      setOk("Offre enregistrée.");
      resetForm();
      setView("list");
    }
  };

  const generateDescription = async () => {
    setErr("");
    setOk("");
    setCopied(false);
    setBusyAi(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setBusyAi(false);
      router.push("/login");
      return;
    }

    const prompt = [
      `Génère une description de poste professionnelle en français (Québec/Canada).`,
      `Titre: ${title || "N/A"}`,
      `Localisation: ${location || "N/A"}`,
      `Séniorité: ${seniority}`,
      `Industrie: ${industry}`,
      `Mode de travail: ${workMode}`,
      "",
      `Structure attendue:`,
      `1) Résumé du rôle`,
      `2) Responsabilités`,
      `3) Exigences`,
      `4) Atouts`,
      `5) Avantages`,
      `6) Processus`,
      "",
      `Ton: clair, professionnel, inclusif.`,
    ].join("\n");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "job_description", input: prompt }),
      });

      const json = await res.json();
      setBusyAi(false);

      if (!res.ok) {
        setErr(json?.error ?? "Erreur IA");
        return;
      }

      setDescription(String(json.output ?? "").trim());
      setOk("Description générée.");
    } catch (e: any) {
      setBusyAi(false);
      setErr(e?.message ?? "Erreur réseau");
    }
  };

  const copyDescription = async () => {
    try {
      await navigator.clipboard.writeText(description || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter !== "all" && (j.status as JobStatus) !== statusFilter) return false;
      if (modeFilter !== "all" && (j.work_mode || "") !== modeFilter) return false;
      if (levelFilter !== "all" && (j.seniority || "") !== levelFilter) return false;

      if (!query) return true;
      const hay = `${j.title}\n${j.description}\n${j.location || ""}\n${j.industry || ""}\n${j.work_mode || ""}\n${j.seniority || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [jobs, q, statusFilter, modeFilter, levelFilter]);

  const metaLine = useMemo(() => {
    const parts = [
      location ? location : null,
      workMode ? workMode : null,
      seniority ? seniority : null,
      industry ? industry : null,
    ].filter(Boolean);
    return parts.join(" • ");
  }, [location, workMode, seniority, industry]);

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1">Offres d’emploi</h1>
          <p className="tp-subtitle">Créer, générer et gérer vos opportunités.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className={`tp-btn ${view === "create" ? "tp-btn-primary" : "tp-btn-secondary"}`} onClick={() => setView("create")}>
            Créer
          </button>
          <button className={`tp-btn ${view === "list" ? "tp-btn-primary" : "tp-btn-secondary"}`} onClick={() => setView("list")}>
            Liste
          </button>
          <button className="tp-btn tp-btn-secondary" onClick={load}>
            Rafraîchir
          </button>
        </div>
      </div>

      {err ? <div className="tp-badge tp-badge-error" style={{ marginBottom: 12 }}>❌ {err}</div> : null}
      {ok ? <div className="tp-badge tp-badge-success" style={{ marginBottom: 12 }}>✅ {ok}</div> : null}

      {view === "create" ? (
        <div className="tp-grid">
          {/* FORM */}
          <div className="tp-card tp-col-6" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Nouvelle offre</div>
                <div className="tp-muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Remplissez les champs puis générez une description avec l’IA.
                </div>
              </div>
              <span className={`tp-badge ${badgeForStatus(status)}`}>{STATUS_LABEL[status]}</span>
            </div>

            <div style={{ height: 12 }} />

            <div className="tp-grid">
              <div className="tp-col-12">
                <input className="tp-input" placeholder="Titre du poste" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="tp-col-12">
                <input className="tp-input" placeholder="Localisation (ex: Montréal)" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>

              <div className="tp-col-6">
                <select className="tp-input" value={seniority} onChange={(e) => setSeniority(e.target.value as Seniority)} style={{ borderRadius: 16 }}>
                  {SENIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="tp-col-6">
                <select className="tp-input" value={workMode} onChange={(e) => setWorkMode(e.target.value as WorkMode)} style={{ borderRadius: 16 }}>
                  {WORK_MODES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="tp-col-6">
                <select className="tp-input" value={industry} onChange={(e) => setIndustry(e.target.value as Industry)} style={{ borderRadius: 16 }}>
                  {INDUSTRIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="tp-col-6">
                <select className="tp-input" value={status} onChange={(e) => setStatus(e.target.value as JobStatus)} style={{ borderRadius: 16 }}>
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>

              {/* Action bar */}
              <div className="tp-col-12" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button className="tp-btn tp-btn-primary" onClick={generateDescription} disabled={busyAi} style={{ opacity: busyAi ? 0.7 : 1 }}>
                  {busyAi ? "Génération..." : "Générer (IA)"}
                </button>

                <button className="tp-btn tp-btn-secondary" onClick={copyDescription} disabled={!description.trim()} style={{ opacity: description.trim() ? 1 : 0.6 }}>
                  {copied ? "Copié ✅" : "Copier"}
                </button>

                <button className="tp-btn tp-btn-secondary" onClick={resetForm}>
                  Réinitialiser
                </button>

                <span className="tp-muted" style={{ marginLeft: "auto", fontSize: 12 }}>
                  {description.trim() ? `${description.trim().length} caractères` : "Aucune description"}
                </span>
              </div>

              <div className="tp-col-12">
                <textarea
                  className="tp-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={12}
                  placeholder="Description du poste…"
                  style={{
                    height: "auto",
                    paddingTop: 12,
                    paddingBottom: 12,
                    borderRadius: 16,
                    fontFamily: "var(--font-inter), system-ui, -apple-system, Segoe UI, sans-serif",
                  }}
                />
              </div>

              <div className="tp-col-12" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="tp-btn tp-btn-primary" onClick={addJob} disabled={busySave} style={{ opacity: busySave ? 0.7 : 1 }}>
                  {busySave ? "Enregistrement..." : "Enregistrer l’offre"}
                </button>
                <button className="tp-btn tp-btn-secondary" onClick={() => setView("list")}>
                  Aller à la liste
                </button>
              </div>
            </div>
          </div>

          {/* PREVIEW */}
          <div className="tp-card tp-col-6" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Aperçu</div>
            <div className="tp-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Visualisez le rendu avant publication.
            </div>

            <div style={{ height: 12 }} />

            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.80)", border: "1px solid rgba(148,163,184,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {title.trim() ? title.trim() : "Titre du poste"}
                </div>
                <span className={`tp-badge ${badgeForStatus(status)}`}>{STATUS_LABEL[status]}</span>
              </div>

              <div className="tp-muted" style={{ marginTop: 6, fontSize: 13 }}>
                {metaLine || "Localisation • Mode • Séniorité • Industrie"}
              </div>

              <div style={{ height: 12 }} />

              <div className="tp-muted" style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>
                {description.trim() ? description.trim() : "Votre description apparaîtra ici…"}
              </div>
            </div>

            <div style={{ height: 12 }} />

            <div className="tp-badge tp-badge-info">
              Astuce : utilisez “Générer (IA)” puis ajustez le texte pour qu’il corresponde à votre entreprise.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* FILTERS */}
          <div className="tp-card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Filtres</div>
              <span className="tp-badge tp-badge-info">{filtered.length} offre(s)</span>
            </div>

            <div style={{ height: 12 }} />

            <div style={{ display: "grid", gridTemplateColumns: "220px 220px 220px 1fr", gap: 12 }}>
              <select className="tp-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ borderRadius: 16 }}>
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>

              <select className="tp-input" value={modeFilter} onChange={(e) => setModeFilter(e.target.value as any)} style={{ borderRadius: 16 }}>
                <option value="all">Tous les modes</option>
                {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>

              <select className="tp-input" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as any)} style={{ borderRadius: 16 }}>
                <option value="all">Tous les niveaux</option>
                {SENIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <input className="tp-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Recherche (titre, description, localisation…)" />
            </div>
          </div>

          {/* LIST */}
          <div className="tp-card">
            {loading ? (
              <div className="tp-muted">Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="tp-badge tp-badge-info" style={{ justifyContent: "center" }}>
                Aucune offre pour le moment.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {filtered.map((job) => (
                  <div
                    key={job.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(148,163,184,0.25)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ fontWeight: 900 }}>{job.title}</div>
                      <span className={`tp-badge ${badgeForStatus(job.status)}`}>
                        {STATUS_LABEL[(job.status as JobStatus) || "draft"] ?? String(job.status)}
                      </span>
                    </div>

                    <div className="tp-muted" style={{ marginTop: 6, fontSize: 13 }}>
                      {job.location ? `${job.location} • ` : ""}
                      {job.work_mode ? `${job.work_mode} • ` : ""}
                      {job.seniority ? `${job.seniority} • ` : ""}
                      {job.industry ? `${job.industry}` : ""}
                      {` • ${humanDate(job.created_at)}`}
                    </div>

                    <div className="tp-muted" style={{ marginTop: 8, fontSize: 14, whiteSpace: "pre-wrap" }}>
                      {job.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
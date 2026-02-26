"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Briefcase,
  Plus,
  RefreshCcw,
  FileText,
  Tag,
  Loader2,
  XCircle,
  CheckCircle2,
} from "lucide-react";

type JobPost = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at?: string;
};

function humanDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

export default function JobPostsPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const refresh = async () => {
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

  const addJob = async () => {
    setErr("");
    setOk("");

    if (!title.trim() || !description.trim()) {
      setErr("Titre et description sont requis.");
      return;
    }

    setBusy(true);

    const { data, error } = await supabase
      .from("job_posts")
      .insert({
        title: title.trim(),
        description: description.trim(),
        status: "open",
      })
      .select()
      .single();

    setBusy(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setJobs([data as JobPost, ...jobs]);
    setTitle("");
    setDescription("");
    setOk("Offre créée.");
  };

  const stats = useMemo(() => {
    const total = jobs.length;
    const open = jobs.filter((j) => (j.status || "").toLowerCase() === "open").length;
    const other = total - open;
    return { total, open, other };
  }, [jobs]);

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Briefcase size={18} />
            Offres d’emploi
          </h1>
          <p className="tp-subtitle">Créez et gérez vos opportunités.</p>
        </div>

        <button className="tp-btn tp-btn-secondary" onClick={refresh}>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <RefreshCcw size={16} />
            Rafraîchir
          </span>
        </button>
      </div>

      {(err || ok) ? (
        <div style={{ marginBottom: 12 }}>
          {err ? (
            <div className="tp-badge tp-badge-error" style={{ gap: 8 }}>
              <XCircle size={14} />
              {err}
            </div>
          ) : null}
          {ok ? (
            <div className="tp-badge tp-badge-success" style={{ marginTop: err ? 8 : 0, gap: 8 }}>
              <CheckCircle2 size={14} />
              {ok}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Stats */}
      <div className="tp-grid" style={{ marginBottom: 14 }}>
        <div className="tp-card tp-col-4" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900 }}>Total</div>
          <div className="tp-gradient-text" style={{ marginTop: 10, fontSize: 28, fontWeight: 900, lineHeight: "28px" }}>
            {stats.total}
          </div>
          <div className="tp-muted" style={{ marginTop: 8, fontSize: 13 }}>Offres créées</div>
        </div>

        <div className="tp-card tp-col-4" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900 }}>Ouvertes</div>
          <div className="tp-gradient-text" style={{ marginTop: 10, fontSize: 28, fontWeight: 900, lineHeight: "28px" }}>
            {stats.open}
          </div>
          <div className="tp-muted" style={{ marginTop: 8, fontSize: 13 }}>Statut open</div>
        </div>

        <div className="tp-card tp-col-4" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900 }}>Autres</div>
          <div className="tp-gradient-text" style={{ marginTop: 10, fontSize: 28, fontWeight: 900, lineHeight: "28px" }}>
            {stats.other}
          </div>
          <div className="tp-muted" style={{ marginTop: 8, fontSize: 13 }}>Autres statuts</div>
        </div>
      </div>

      {/* Create */}
      <div className="tp-card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <FileText size={16} />
          Créer une offre
        </div>

        <div className="tp-grid">
          <div className="tp-col-12">
            <input
              className="tp-input"
              placeholder="Titre du poste"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="tp-col-12">
            <textarea
              className="tp-input"
              placeholder="Description du poste"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              style={{ height: "auto", paddingTop: 12, paddingBottom: 12, borderRadius: 16, resize: "none" }}
            />
          </div>

          <div className="tp-col-12" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="tp-btn tp-btn-primary" onClick={addJob} disabled={busy} style={{ opacity: busy ? 0.75 : 1 }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {busy ? "Création..." : "Créer l’offre"}
              </span>
            </button>

            <button className="tp-btn tp-btn-secondary" onClick={() => { setTitle(""); setDescription(""); }}>
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="tp-card">
        {loading ? (
          <div className="tp-muted">Chargement...</div>
        ) : jobs.length === 0 ? (
          <div className="tp-badge tp-badge-info" style={{ justifyContent: "center" }}>
            Aucune offre pour le moment
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {jobs.map((job) => (
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

                  <span className="tp-badge tp-badge-info" style={{ gap: 8 }}>
                    <Tag size={14} />
                    {job.status}
                  </span>
                </div>

                <div className="tp-muted" style={{ fontSize: 12, marginTop: 6 }}>
                  {humanDate(job.created_at)}
                </div>

                <div style={{ marginTop: 10, fontSize: 14, whiteSpace: "pre-wrap" }}>
                  {job.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
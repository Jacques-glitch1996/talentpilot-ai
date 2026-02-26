"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  CalendarDays,
  Plus,
  RefreshCcw,
  Clock,
  XCircle,
  CheckCircle2,
  Tag,
} from "lucide-react";

type Interview = {
  id: string;
  candidate_id: string;
  job_post_id: string;
  interview_date: string | null;
  notes: string | null;
  created_at: string;
};

function humanDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function InterviewsPage() {
  const router = useRouter();

  const [items, setItems] = useState<Interview[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [jobPostId, setJobPostId] = useState("");
  const [interviewDate, setInterviewDate] = useState(""); // datetime-local
  const [notes, setNotes] = useState("");

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
      .from("interviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setItems([]);
      return;
    }
    setItems((data ?? []) as Interview[]);
  };

  const addInterview = async () => {
    setErr("");
    setOk("");

    if (!candidateId.trim() || !jobPostId.trim()) {
      setErr("Candidate ID et Job Post ID sont requis.");
      return;
    }

    const iso = interviewDate ? new Date(interviewDate).toISOString() : null;

    setBusy(true);

    const { data, error } = await supabase
      .from("interviews")
      .insert({
        candidate_id: candidateId.trim(),
        job_post_id: jobPostId.trim(),
        interview_date: iso,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    setBusy(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setItems([data as Interview, ...items]);
    setCandidateId("");
    setJobPostId("");
    setInterviewDate("");
    setNotes("");
    setOk("Entrevue ajoutée.");
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const it of items) {
      const key = (it.interview_date ?? it.created_at).slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [items]);

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <CalendarDays size={18} />
            Entrevues
          </h1>
          <p className="tp-subtitle">Planification et suivi des entrevues.</p>
        </div>

        <button className="tp-btn tp-btn-secondary" onClick={refresh}>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <RefreshCcw size={16} />
            Rafraîchir
          </span>
        </button>
      </div>

      {/* Form */}
      <div className="tp-card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Créer une entrevue</div>

        <div className="tp-grid">
          <div className="tp-col-6">
            <input className="tp-input" placeholder="Candidate ID (uuid)" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} />
          </div>

          <div className="tp-col-6">
            <input className="tp-input" placeholder="Job Post ID (uuid)" value={jobPostId} onChange={(e) => setJobPostId(e.target.value)} />
          </div>

          <div className="tp-col-6">
            <input className="tp-input" type="datetime-local" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
          </div>

          <div className="tp-col-6">
            <button
              className="tp-btn tp-btn-primary"
              onClick={addInterview}
              disabled={busy}
              style={{ width: "100%", justifyContent: "center", opacity: busy ? 0.7 : 1 }}
            >
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <Plus size={16} />
                {busy ? "Ajout..." : "Ajouter une entrevue"}
              </span>
            </button>
          </div>

          <div className="tp-col-12">
            <textarea
              className="tp-input"
              placeholder="Notes (optionnel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ height: "auto", paddingTop: 12, paddingBottom: 12, borderRadius: 16, resize: "none" }}
            />
          </div>
        </div>

        {err ? (
          <div className="tp-badge tp-badge-error" style={{ marginTop: 12, gap: 8 }}>
            <XCircle size={14} />
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="tp-badge tp-badge-success" style={{ marginTop: 12, gap: 8 }}>
            <CheckCircle2 size={14} />
            {ok}
          </div>
        ) : null}
      </div>

      {/* List */}
      <div className="tp-card">
        {loading ? (
          <div className="tp-muted">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="tp-badge tp-badge-info" style={{ justifyContent: "center" }}>
            Aucune entrevue pour le moment
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {grouped.map(([day, list]) => (
              <div key={day} style={{ border: "1px solid rgba(148,163,184,0.25)", borderRadius: 18, padding: 14, background: "rgba(255,255,255,0.65)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>{day}</div>
                  <span className="tp-badge tp-badge-info" style={{ gap: 8 }}>
                    <Tag size={14} />
                    {list.length} élément(s)
                  </span>
                </div>

                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  {list.map((it) => (
                    <div
                      key={it.id}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(255,255,255,0.85)",
                        border: "1px solid rgba(148,163,184,0.25)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ fontWeight: 900 }}>Entrevue</div>
                        <div className="tp-muted" style={{ fontSize: 12, display: "inline-flex", gap: 8, alignItems: "center" }}>
                          <Clock size={14} />
                          {humanDate(it.interview_date)}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                        <div><b>Candidate ID :</b> {it.candidate_id}</div>
                        <div><b>Job Post ID :</b> {it.job_post_id}</div>
                      </div>

                      {it.notes ? (
                        <div style={{ marginTop: 10, fontSize: 14, whiteSpace: "pre-wrap" }}>
                          {it.notes}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Interview = {
  id: string;
  candidate_id: string;
  job_post_id: string;
  interview_date: string | null;
  notes: string | null;
  created_at: string;
};

export default function InterviewsPage() {
  const router = useRouter();

  const [items, setItems] = useState<Interview[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [jobPostId, setJobPostId] = useState("");
  const [interviewDate, setInterviewDate] = useState(""); // datetime-local string
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
    if (!candidateId.trim() || !jobPostId.trim()) {
      setErr("Candidate ID et Job Post ID sont requis.");
      return;
    }

    const iso = interviewDate ? new Date(interviewDate).toISOString() : null;

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

    if (error) {
      setErr(error.message);
      return;
    }

    setItems([data as Interview, ...items]);
    setCandidateId("");
    setJobPostId("");
    setInterviewDate("");
    setNotes("");
  };

  const humanDate = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
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
    <>
      <TopNav />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 50px" }}>
        <div
          className="tp-glass"
          style={{
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 20px 40px rgba(2,6,23,0.08)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0 }}>Entrevues</h1>
            <div style={{ opacity: 0.6, marginTop: 6 }}>
              Planification et suivi des entrevues.
            </div>
          </div>

          {/* FORM */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <input
              placeholder="Candidate ID (uuid)"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Job Post ID (uuid)"
              value={jobPostId}
              onChange={(e) => setJobPostId(e.target.value)}
              style={inputStyle}
            />

            <input
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              style={inputStyle}
            />

            <button
              onClick={addInterview}
              className="tp-gradient-bg"
              style={{
                padding: "12px 20px",
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Ajouter une entrevue
            </button>

            <textarea
              placeholder="Notes (optionnel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ ...inputStyle, gridColumn: "1 / -1", resize: "none" }}
            />
          </div>

          {err ? <div style={{ color: "crimson", marginBottom: 14 }}>❌ {err}</div> : null}

          {/* LIST */}
          {loading ? (
            <div>Chargement...</div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {grouped.map(([day, list]) => (
                <div key={day} style={{ border: "1px solid rgba(148,163,184,0.25)", borderRadius: 18, padding: 14 }}>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>{day}</div>

                  <div style={{ display: "grid", gap: 12 }}>
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
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 800 }}>Entrevue</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            {humanDate(it.interview_date)}
                          </div>
                        </div>

                        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                          <div>
                            <b>Candidate ID :</b> {it.candidate_id}
                          </div>
                          <div>
                            <b>Job Post ID :</b> {it.job_post_id}
                          </div>
                        </div>

                        {it.notes ? (
                          <div style={{ marginTop: 10, fontSize: 14 }}>
                            {it.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {items.length === 0 ? <div style={{ opacity: 0.7 }}>Aucune entrevue pour le moment.</div> : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "rgba(255,255,255,0.85)",
};

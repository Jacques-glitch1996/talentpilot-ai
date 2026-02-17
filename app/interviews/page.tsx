"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CandidateLite = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type JobPostLite = {
  id: string;
  title: string | null;
  status: string | null;
};

type InterviewRow = {
  id: string;
  candidate_id: string;
  job_post_id: string;
  interview_date: string | null;
  notes: string | null;
  created_at: string;
};

export default function InterviewsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [candidates, setCandidates] = useState<CandidateLite[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPostLite[]>([]);
  const [items, setItems] = useState<InterviewRow[]>([]);

  const [candidateId, setCandidateId] = useState("");
  const [jobPostId, setJobPostId] = useState("");
  const [interviewDate, setInterviewDate] = useState(""); // datetime-local
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      await Promise.all([loadCandidates(), loadJobPosts(), loadInterviews()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, first_name, last_name, email")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setErr(error.message);
      return;
    }
    const rows = (data as CandidateLite[]) ?? [];
    setCandidates(rows);
    if (!candidateId && rows[0]?.id) setCandidateId(rows[0].id);
  };

  const loadJobPosts = async () => {
    const { data, error } = await supabase
      .from("job_posts")
      .select("id, title, status")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setErr(error.message);
      return;
    }
    const rows = (data as JobPostLite[]) ?? [];
    setJobPosts(rows);
    if (!jobPostId && rows[0]?.id) setJobPostId(rows[0].id);
  };

  const loadInterviews = async () => {
    const { data, error } = await supabase
      .from("interviews")
      .select("id, candidate_id, job_post_id, interview_date, notes, created_at")
      .order("interview_date", { ascending: false })
      .limit(100);

    if (error) {
      setErr(error.message);
      return;
    }
    setItems((data as InterviewRow[]) ?? []);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!candidateId) return setErr("Veuillez sélectionner un candidat.");
    if (!jobPostId) return setErr("Veuillez sélectionner une offre d’emploi.");
    if (!interviewDate) return setErr("Veuillez choisir une date/heure d’entrevue.");

    // datetime-local -> ISO string
    const iso = new Date(interviewDate).toISOString();

    const { error } = await supabase.from("interviews").insert({
      candidate_id: candidateId,
      job_post_id: jobPostId,
      interview_date: iso,
      notes: notes || null,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setInterviewDate("");
    setNotes("");
    await loadInterviews();
  };

  const candidateMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of candidates) {
      const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Candidat";
      map.set(c.id, c.email ? `${name} — ${c.email}` : name);
    }
    return map;
  }, [candidates]);

  const jobMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of jobPosts) {
      const title = j.title ?? "Offre";
      map.set(j.id, j.status ? `${title} (${j.status})` : title);
    }
    return map;
  }, [jobPosts]);

  return (
    <>
      <TopNav />
      <div style={{ padding: 20 }}>
        <h1>Entrevues</h1>

        {err ? <div style={{ color: "crimson", marginBottom: 12 }}>❌ {err}</div> : null}
        {loading ? <div>Chargement...</div> : null}

        <form onSubmit={add} style={{ display: "grid", gap: 10, maxWidth: 900, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minWidth: 320 }}
            >
              {candidates.map((c) => {
                const label = candidateMap.get(c.id) ?? "Candidat";
                return (
                  <option key={c.id} value={c.id}>
                    {label}
                  </option>
                );
              })}
            </select>

            <select
              value={jobPostId}
              onChange={(e) => setJobPostId(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minWidth: 320 }}
            >
              {jobPosts.map((j) => {
                const label = jobMap.get(j.id) ?? "Offre";
                return (
                  <option key={j.id} value={j.id}>
                    {label}
                  </option>
                );
              })}
            </select>

            <input
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />

            <button
              type="submit"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "none",
                background: "#1E40AF",
                color: "white",
                cursor: "pointer",
              }}
            >
              Planifier
            </button>
          </div>

          <textarea
            placeholder="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
        </form>

        <div style={{ marginTop: 18, display: "grid", gap: 10, maxWidth: 900 }}>
          {items.map((it) => (
            <div key={it.id} style={{ padding: 12, borderRadius: 12, border: "1px solid #eee" }}>
              <div style={{ fontWeight: 700 }}>
                {candidateMap.get(it.candidate_id) ?? it.candidate_id}
              </div>
              <div style={{ opacity: 0.8 }}>
                {jobMap.get(it.job_post_id) ?? it.job_post_id}
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                Date :{" "}
                {it.interview_date ? new Date(it.interview_date).toLocaleString() : "—"}
              </div>
              {it.notes ? <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{it.notes}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JobPost = {
  id: string;
  title: string;
  description: string;
  status: string;
};

const inputStyle: CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "rgba(255,255,255,0.85)",
  outline: "none",
  width: "100%",
};

export default function JobPostsPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      const { data: list } = await supabase
        .from("job_posts")
        .select("*")
        .order("created_at", { ascending: false });

      setJobs((list ?? []) as JobPost[]);
      setLoading(false);
    })();
  }, [router]);

  const addJob = async () => {
    if (!title.trim() || !description.trim()) return;

    const { data, error } = await supabase
      .from("job_posts")
      .insert({
        title: title.trim(),
        description: description.trim(),
        status: "open",
      })
      .select()
      .single();

    if (!error && data) {
      setJobs((prev) => [data as JobPost, ...prev]);
      setTitle("");
      setDescription("");
    }
  };

  return (
    <>
      <TopNav />

      <div style={{ padding: 22, maxWidth: 1100, margin: "0 auto" }}>
        <div className="tp-section-header">
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Offres d’emploi</div>
            <div className="tp-muted" style={{ marginTop: 6 }}>
              Créez et gérez vos opportunités.
            </div>
          </div>
        </div>

        <div
          className="tp-glass"
          style={{
            padding: 18,
            borderRadius: 22,
            border: "1px solid rgba(148,163,184,0.25)",
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du poste"
              style={inputStyle}
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Description / exigences"
              style={inputStyle}
            />

            <button
              onClick={addJob}
              className="tp-gradient-bg"
              style={{
                padding: "12px 20px",
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
                width: 220,
              }}
            >
              Créer l’offre
            </button>
          </div>
        </div>

        <div style={{ height: 18 }} />

        {loading ? (
          <div>Chargement...</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(148,163,184,0.3)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{job.title}</div>

                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "rgba(30,64,175,0.1)",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {job.status}
                  </span>
                </div>

                <div style={{ fontSize: 14, opacity: 0.85 }}>
                  {job.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JobPost = {
  id: string;
  title: string;
  description: string;
  status: string;
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

      setJobs(list || []);
      setLoading(false);
    })();
  }, [router]);

  const addJob = async () => {
    if (!title || !description) return;

    const { data, error } = await supabase
      .from("job_posts")
      .insert({
        title,
        description,
        status: "open",
      })
      .select()
      .single();

    if (!error && data) {
      setJobs([data, ...jobs]);
      setTitle("");
      setDescription("");
    }
  };

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
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0 }}>Offres d’emploi</h1>
            <div style={{ opacity: 0.6, marginTop: 6 }}>
              Créez et gérez vos opportunités.
            </div>
          </div>

          {/* FORMULAIRE CREATION */}
          <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
            <input
              placeholder="Titre du poste"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />

            <textarea
              placeholder="Description du poste"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
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
                fontWeight: 700,
                cursor: "pointer",
                width: 200,
              }}
            >
              Créer l’offre
            </button>
          </div>

          {/* LISTE */}
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
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontWeight: 700 }}>{job.title}</div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(30,64,175,0.1)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>
                    {job.description}
                  </div>
                </div>
              ))}
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

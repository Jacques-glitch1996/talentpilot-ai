"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import TopNav from "@/components/TopNav";

type JobPost = {
  id: string;
  title: string | null;
  location: string | null;
  seniority: string | null;
  status: string | null;
  created_at: string;
};

export default function JobPostsPage() {
  const router = useRouter();
  const [items, setItems] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("");

  // protection
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
    })();
  }, [router]);

  const load = async () => {
    setErr("");
    setLoading(true);

    const { data, error } = await supabase
      .from("job_posts")
      .select("id, title, location, seniority, status, created_at")
      .order("created_at", { ascending: false });

    if (error) setErr(error.message);
    setItems((data as JobPost[]) ?? []);
    setLoading(false);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const { error } = await supabase.from("job_posts").insert({
      title,
      location: location || null,
      seniority: seniority || null,
      status: "draft",
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setTitle("");
    setLocation("");
    setSeniority("");
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <TopNav />
      <div style={{ padding: 20 }}>
        <h1>Offres d’emploi</h1>

        <form onSubmit={add} style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
          <input
            placeholder="Titre du poste"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minWidth: 260 }}
          />
          <input
            placeholder="Localisation (optionnel)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            placeholder="Séniorité (optionnel)"
            value={seniority}
            onChange={(e) => setSeniority(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <button
            type="submit"
            style={{ padding: 10, borderRadius: 10, border: "none", background: "#1E40AF", color: "white", cursor: "pointer" }}
          >
            Créer
          </button>
        </form>

        {err ? <div style={{ color: "crimson", marginBottom: 12 }}>❌ {err}</div> : null}
        {loading ? <div>Chargement...</div> : null}

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((j) => (
            <div key={j.id} style={{ padding: 12, borderRadius: 12, border: "1px solid #eee" }}>
              <div style={{ fontWeight: 700 }}>{j.title ?? "Sans titre"}</div>
              <div style={{ opacity: 0.75 }}>
                {j.location ?? "—"} • {j.seniority ?? "—"} • <b>{j.status ?? "—"}</b>
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Créé le {new Date(j.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

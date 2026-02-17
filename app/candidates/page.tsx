"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Candidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string | null;
  created_at: string;
};

export default function CandidatesPage() {
  const router = useRouter();

  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

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
      .from("candidates")
      .select("id, first_name, last_name, email, status, created_at")
      .order("created_at", { ascending: false });

    if (error) setErr(error.message);
    setItems((data as Candidate[]) ?? []);
    setLoading(false);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const { error } = await supabase.from("candidates").insert({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      status: "new",
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setFirstName("");
    setLastName("");
    setEmail("");
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <TopNav />
      <div style={{ padding: 20 }}>
        <h1>Candidats</h1>

        <form
          onSubmit={add}
          style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}
        >
          <input
            placeholder="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            placeholder="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            placeholder="Email (optionnel)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              minWidth: 240,
            }}
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
            Ajouter
          </button>
        </form>

        {err ? <div style={{ color: "crimson", marginBottom: 12 }}>❌ {err}</div> : null}
        {loading ? <div>Chargement...</div> : null}

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((c) => (
            <div
              key={c.id}
              style={{ padding: 12, borderRadius: 12, border: "1px solid #eee" }}
            >
              <div style={{ fontWeight: 600 }}>
                {(c.first_name ?? "")} {(c.last_name ?? "")}
              </div>
              <div style={{ opacity: 0.75 }}>{c.email ?? "Sans email"}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Status: {c.status ?? "—"} • {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

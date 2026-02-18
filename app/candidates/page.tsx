"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
};

export default function CandidatesPage() {
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      const { data: list } = await supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });

      setCandidates(list || []);
      setLoading(false);
    })();
  }, [router]);

  const addCandidate = async () => {
    if (!firstName || !lastName || !email) return;

    const { data, error } = await supabase
      .from("candidates")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        status: "new",
      })
      .select()
      .single();

    if (!error && data) {
      setCandidates([data, ...candidates]);
      setFirstName("");
      setLastName("");
      setEmail("");
    }
  };

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
            <h1 style={{ margin: 0 }}>Candidats</h1>
            <div style={{ opacity: 0.6, marginTop: 6 }}>
              Gérez et suivez vos talents.
            </div>
          </div>

          {/* FORMULAIRE AJOUT */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, marginBottom: 20 }}>
            <input
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <button
              onClick={addCandidate}
              className="tp-gradient-bg"
              style={{
                padding: "12px 20px",
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Ajouter
            </button>
          </div>

          {/* TABLEAU */}
          {loading ? (
            <div>Chargement...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(148,163,184,0.3)" }}>
                    <th style={thStyle}>Nom</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid rgba(148,163,184,0.15)" }}>
                      <td style={tdStyle}>
                        {c.first_name} {c.last_name}
                      </td>
                      <td style={tdStyle}>{c.email}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: "rgba(124,58,237,0.1)",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "rgba(255,255,255,0.8)",
};

const thStyle: React.CSSProperties = {
  padding: "12px 8px",
  fontWeight: 700,
  fontSize: 14,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 8px",
  fontSize: 14,
};

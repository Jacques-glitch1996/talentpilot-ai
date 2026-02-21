"use client";

import TopNav from "@/components/TopNav";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

export default function CandidatesPage() {
  const router = useRouter();

  const [list, setList] = useState<Candidate[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setList(data as Candidate[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      await load();
    })();
  }, [router, load]);

  const add = async () => {
    setErrorMsg("");

    // Validation locale AVANT Supabase
    if (!email.trim() && !phone.trim()) {
      setErrorMsg("Un email ou un téléphone est requis.");
      return;
    }

    const { error } = await supabase.from("candidates").insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
    });

    if (error) {
      if (error.message.includes("candidates_email_format")) {
        setErrorMsg("Format email invalide.");
      } else if (error.message.includes("candidates_phone_format")) {
        setErrorMsg("Format téléphone invalide.");
      } else if (error.message.includes("candidates_email_or_phone_required")) {
        setErrorMsg("Un email ou un téléphone est requis.");
      } else {
        setErrorMsg(error.message);
      }
      return;
    }

    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    await load();
  };

  return (
    <>
      <TopNav />

      <div style={{ padding: 22, maxWidth: 1100, margin: "0 auto" }}>
        <div className="tp-section-header">
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Candidats</div>
            <div className="tp-muted" style={{ marginTop: 6 }}>
              Ajoutez et consultez votre base candidats.
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
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.4)",
                background: "rgba(255,255,255,0.85)",
                outline: "none",
              }}
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.4)",
                background: "rgba(255,255,255,0.85)",
                outline: "none",
              }}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optionnel si téléphone)"
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.4)",
                background: "rgba(255,255,255,0.85)",
                outline: "none",
              }}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Téléphone (optionnel si email)"
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.4)",
                background: "rgba(255,255,255,0.85)",
                outline: "none",
              }}
            />

            {errorMsg ? (
              <div style={{ color: "crimson", fontWeight: 800 }}>
                ❌ {errorMsg}
              </div>
            ) : null}

            <button
              onClick={add}
              className="tp-gradient-bg"
              style={{
                padding: "12px 18px",
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
                width: 180,
              }}
            >
              Ajouter
            </button>
          </div>
        </div>

        <div style={{ height: 16 }} />

        <div style={{ display: "grid", gap: 12 }}>
          {list.map((c) => (
            <div
              key={c.id}
              style={{
                padding: 14,
                borderRadius: 18,
                background: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(148,163,184,0.25)",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                {c.first_name} {c.last_name}
              </div>
              <div className="tp-muted" style={{ marginTop: 6 }}>
                {c.email || c.phone || "—"}
              </div>
            </div>
          ))}

          {list.length === 0 ? (
            <div className="tp-muted">Aucun candidat pour le moment.</div>
          ) : null}
        </div>
      </div>
    </>
  );
}

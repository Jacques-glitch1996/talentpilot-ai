"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      load();
    })();
  }, [router]);

  const load = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setList(data);
  };

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
    load();
  };

  return (
    <>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        <div className="tp-glass" style={{ padding: 20, borderRadius: 18 }}>
          <h1 style={{ marginTop: 0 }}>Candidats</h1>

          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            <input
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {errorMsg && (
              <div style={{ color: "crimson", fontWeight: 600 }}>
                ❌ {errorMsg}
              </div>
            )}

            <button
              onClick={add}
              className="tp-gradient-bg"
              style={{
                padding: 10,
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Ajouter
            </button>
          </div>

          <div>
            {list.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.05)",
                  marginBottom: 8,
                }}
              >
                <b>
                  {c.first_name} {c.last_name}
                </b>
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  {c.email || c.phone}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
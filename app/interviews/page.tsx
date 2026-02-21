"use client";

import TopNav from "@/components/TopNav";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Interview = {
  id: string;
  candidate_id: string;
  type: string;
  status: string;
  scheduled_at: string | null;
  notes: string | null;
  created_at: string;
};

const inputStyle: CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "rgba(255,255,255,0.85)",
  outline: "none",
  width: "100%",
};

const ghostBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(255,255,255,0.85)",
  cursor: "pointer",
  fontWeight: 900,
};

function toIsoOrNull(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function InterviewsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [list, setList] = useState<Interview[]>([]);

  // Form
  const [candidateId, setCandidateId] = useState("");
  const [type, setType] = useState("Téléphonique");
  const [status, setStatus] = useState("planned");
  const [scheduledAt, setScheduledAt] = useState(""); // datetime-local
  const [notes, setNotes] = useState("");

  const refresh = useCallback(async () => {
    setErr("");

    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setList([]);
      return;
    }

    setList((data ?? []) as Interview[]);
  }, []);

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
  }, [router, refresh]);

  const add = async () => {
    setErr("");

    if (!candidateId.trim()) {
      setErr("Candidate ID est requis.");
      return;
    }

    const payload = {
      candidate_id: candidateId.trim(),
      type: type.trim() || "Téléphonique",
      status: status.trim() || "planned",
      scheduled_at: toIsoOrNull(scheduledAt),
      notes: notes.trim() || null,
    };

    const { data, error } = await supabase
      .from("interviews")
      .insert(payload)
      .select()
      .single();

    if (error) {
      setErr(error.message);
      return;
    }

    setList((prev) => [data as Interview, ...prev]);
    setCandidateId("");
    setType("Téléphonique");
    setStatus("planned");
    setScheduledAt("");
    setNotes("");
  };

  const human = useMemo(() => {
    return (iso: string | null) => {
      if (!iso) return "—";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    };
  }, []);

  return (
    <>
      <TopNav />

      <div style={{ padding: 22, maxWidth: 1200, margin: "0 auto" }}>
        <div className="tp-section-header">
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Entrevues</div>
            <div className="tp-muted" style={{ marginTop: 6 }}>
              Planifiez et suivez vos entrevues.
            </div>
          </div>

          <div className="tp-actions">
            <button onClick={refresh} style={ghostBtn} title="Recharger">
              Actualiser
            </button>
          </div>
        </div>

        {/* FORM */}
        <div
          className="tp-glass"
          style={{
            padding: 16,
            borderRadius: 22,
            border: "1px solid rgba(148,163,184,0.25)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 220px 180px 260px",
              gap: 12,
              alignItems: "center",
            }}
          >
            <input
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              placeholder="Candidate ID"
              style={inputStyle}
            />

            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="Téléphonique">Téléphonique</option>
              <option value="Technique">Technique</option>
              <option value="Client">Client</option>
              <option value="RH">RH</option>
              <option value="Autre">Autre</option>
            </select>

            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              <option value="planned">Planned</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ height: 12 }} />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optionnel)"
            rows={4}
            style={inputStyle}
          />

          {err ? (
            <div style={{ marginTop: 12, color: "crimson", fontWeight: 900 }}>
              ❌ {err}
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
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
              }}
            >
              Ajouter
            </button>
            <button
              onClick={() => {
                setCandidateId("");
                setType("Téléphonique");
                setStatus("planned");
                setScheduledAt("");
                setNotes("");
                setErr("");
              }}
              style={ghostBtn}
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div style={{ height: 16 }} />

        {/* LIST */}
        {loading ? (
          <div>Chargement...</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {list.map((it) => (
              <div
                key={it.id}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(148,163,184,0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>
                    {it.type || "Entrevue"} • {it.status || "—"}
                  </div>
                  <div className="tp-muted" style={{ fontSize: 12 }}>
                    {human(it.created_at)}
                  </div>
                </div>

                <div style={{ marginTop: 8, fontSize: 13 }}>
                  <div>
                    <b>Candidate ID :</b> {it.candidate_id}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <b>Planifiée :</b> {human(it.scheduled_at)}
                  </div>
                </div>

                {it.notes ? (
                  <div style={{ marginTop: 10, whiteSpace: "pre-wrap", opacity: 0.9 }}>
                    {it.notes}
                  </div>
                ) : null}
              </div>
            ))}

            {list.length === 0 ? <div className="tp-muted">Aucune entrevue pour le moment.</div> : null}
          </div>
        )}
      </div>
    </>
  );
}

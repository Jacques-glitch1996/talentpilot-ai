"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type CandidateStatus = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";
type CandidateSource = "LinkedIn" | "Indeed" | "Referral" | "Website" | "Other";

type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  role_title: string | null;
  status: CandidateStatus | null;
  source: CandidateSource | string | null;
  ai_score: number | null;
  ai_analysis: string | null;
  last_activity_date: string | null;
  follow_up_notes: string | null;
  created_at: string;
};

const STATUSES: Array<{ key: CandidateStatus; label: string }> = [
  { key: "new", label: "New" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

const SOURCES: CandidateSource[] = ["LinkedIn", "Indeed", "Referral", "Website", "Other"];

function humanDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function CandidateDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [busySave, setBusySave] = useState(false);
  const [busyAi, setBusyAi] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [c, setC] = useState<Candidate | null>(null);

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [status, setStatus] = useState<CandidateStatus>("new");
  const [source, setSource] = useState<string>("Other");
  const [followUpNotes, setFollowUpNotes] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      await load();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    setErr("");
    setOk("");

    if (!id) return;

    const { data, error } = await supabase.from("candidates").select("*").eq("id", id).single();
    if (error) {
      setErr(error.message);
      setC(null);
      return;
    }

    const row = data as Candidate;
    setC(row);

    setFirstName(row.first_name || "");
    setLastName(row.last_name || "");
    setEmail(row.email || "");
    setPhone(row.phone || "");
    setLocation(row.location || "");
    setRoleTitle(row.role_title || "");
    setStatus((row.status || "new") as CandidateStatus);
    setSource((row.source || "Other") as string);
    setFollowUpNotes(row.follow_up_notes || "");
  };

  const aiTone = useMemo(() => {
    const score = c?.ai_score ?? 0;
    if (score >= 80) return "tp-badge-success";
    if (score >= 50) return "tp-badge-warning";
    return "tp-badge-info";
  }, [c?.ai_score]);

  const save = async () => {
    if (!id) return;

    setErr("");
    setOk("");
    setBusySave(true);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      location: location.trim() || null,
      role_title: roleTitle.trim() || null,
      status,
      source,
      follow_up_notes: followUpNotes.trim() || null,
      last_activity_date: new Date().toISOString(),
    };

    const { error } = await supabase.from("candidates").update(payload).eq("id", id);
    setBusySave(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk("Enregistré.");
    await load();
  };

  const runAiAnalysis = async () => {
    if (!id) return;

    setErr("");
    setOk("");
    setBusyAi(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setBusyAi(false);
      router.push("/login");
      return;
    }

    // MVP: on envoie un prompt structuré à votre endpoint existant
    const input = [
      `Rôle ciblé: ${roleTitle || "N/A"}`,
      `Localisation: ${location || "N/A"}`,
      `Notes/follow-up: ${followUpNotes || "N/A"}`,
      `Profil: ${firstName} ${lastName} | ${email || ""} | ${phone || ""}`,
      "",
      "Donne: (1) un score de matching 0-100, (2) un résumé en 5 bullets, (3) 3 risques/points à valider.",
      "Format JSON strict: {\"score\":number,\"summary\":\"...\",\"risks\":\"...\"}",
    ].join("\n");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "automation", input }),
      });

      const json = await res.json();
      setBusyAi(false);

      if (!res.ok) {
        setErr(json?.error ?? "Erreur IA");
        return;
      }

      // Parse JSON output (best-effort)
      const raw = String(json.output ?? "");
      let score = 0;
      let analysis = raw;

      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.score === "number") score = Math.max(0, Math.min(100, Math.round(parsed.score)));
        analysis = `Résumé:\n${parsed.summary ?? ""}\n\nRisques:\n${parsed.risks ?? ""}`.trim();
      } catch {
        // fallback: extraction simple
        const m = raw.match(/(\d{1,3})/);
        if (m) score = Math.max(0, Math.min(100, Number(m[1])));
      }

      const { error } = await supabase
        .from("candidates")
        .update({
          ai_score: score,
          ai_analysis: analysis,
          last_activity_date: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        setErr(error.message);
        return;
      }

      setOk("Analyse IA mise à jour.");
      await load();
    } catch (e: any) {
      setBusyAi(false);
      setErr(e?.message ?? "Erreur IA");
    }
  };

  if (loading) {
    return <div className="tp-page tp-muted">Chargement...</div>;
  }

  if (!c) {
    return (
      <div className="tp-page">
        <div className="tp-badge tp-badge-error">❌ {err || "Candidat introuvable"}</div>
        <div style={{ height: 12 }} />
        <Link className="tp-btn tp-btn-secondary" href="/candidates">
          Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1">
            {c.first_name} {c.last_name}
          </h1>
          <p className="tp-subtitle">
            Créé le {humanDate(c.created_at)} • Dernière activité: {humanDate(c.last_activity_date)}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="tp-btn tp-btn-secondary" href="/candidates">
            Retour
          </Link>
          <button className="tp-btn tp-btn-secondary" onClick={load}>
            Rafraîchir
          </button>
          <button className="tp-btn tp-btn-primary" onClick={save} disabled={busySave} style={{ opacity: busySave ? 0.7 : 1 }}>
            {busySave ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>

      {err ? (
        <div className="tp-badge tp-badge-error" style={{ marginBottom: 12 }}>
          ❌ {err}
        </div>
      ) : null}
      {ok ? (
        <div className="tp-badge tp-badge-success" style={{ marginBottom: 12 }}>
          ✅ {ok}
        </div>
      ) : null}

      {/* Info grid */}
      <div className="tp-grid">
        <div className="tp-card tp-col-8">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Informations</div>

          <div className="tp-grid">
            <div className="tp-col-6">
              <input className="tp-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
            </div>
            <div className="tp-col-6">
              <input className="tp-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
            </div>

            <div className="tp-col-6">
              <input className="tp-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            </div>
            <div className="tp-col-6">
              <input className="tp-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" />
            </div>

            <div className="tp-col-6">
              <input className="tp-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Localisation" />
            </div>
            <div className="tp-col-6">
              <input className="tp-input" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Poste ciblé" />
            </div>

            <div className="tp-col-6">
              <select className="tp-input" value={status} onChange={(e) => setStatus(e.target.value as CandidateStatus)} style={{ borderRadius: 16 }}>
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="tp-col-6">
              <select className="tp-input" value={source} onChange={(e) => setSource(e.target.value)} style={{ borderRadius: 16 }}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="tp-card tp-col-4">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Score IA</div>
            <span className={`tp-badge ${aiTone}`}>{c.ai_score ?? 0}/100</span>
          </div>

          <div className="tp-muted" style={{ fontSize: 13, marginTop: 8 }}>
            Analyse rapide basée sur vos informations (MVP).
          </div>

          <button
            className="tp-btn tp-btn-primary"
            onClick={runAiAnalysis}
            disabled={busyAi}
            style={{ marginTop: 12, width: "100%", opacity: busyAi ? 0.7 : 1 }}
          >
            {busyAi ? "Analyse..." : "Analyser (IA)"}
          </button>

          <div style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13, opacity: 0.9 }}>
            {c.ai_analysis ? c.ai_analysis : "—"}
          </div>
        </div>

        <div className="tp-card tp-col-12">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Suivi / Notes</div>
          <textarea
            className="tp-input"
            value={followUpNotes}
            onChange={(e) => setFollowUpNotes(e.target.value)}
            rows={5}
            style={{ height: "auto", paddingTop: 12, paddingBottom: 12, borderRadius: 16 }}
            placeholder="Notes de suivi, relances, contexte, points à valider..."
          />
        </div>
      </div>
    </div>
  );
}
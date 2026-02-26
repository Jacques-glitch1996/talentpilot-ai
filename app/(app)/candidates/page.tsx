"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  RefreshCcw,
  Plus,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Tag,
  Users,
  Search,
} from "lucide-react";

type CandidateStatus = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";
type CandidateSource = "LinkedIn" | "Indeed" | "Referral" | "Website" | "Other";

type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: CandidateStatus | null;
  source: CandidateSource | null;
  created_at: string;
};

const SOURCES: CandidateSource[] = ["LinkedIn", "Indeed", "Referral", "Website", "Other"];

const STATUSES: Array<{ key: CandidateStatus; label: string; tone: "info" | "warning" | "success" | "error" }> = [
  { key: "new", label: "Nouveau", tone: "info" },
  { key: "screening", label: "Présélection", tone: "warning" },
  { key: "interview", label: "Entrevue", tone: "info" },
  { key: "offer", label: "Offre", tone: "warning" },
  { key: "hired", label: "Embauché", tone: "success" },
  { key: "rejected", label: "Rejeté", tone: "error" },
];

function badgeTone(tone: "info" | "warning" | "success" | "error") {
  if (tone === "success") return "tp-badge-success";
  if (tone === "warning") return "tp-badge-warning";
  if (tone === "error") return "tp-badge-error";
  return "tp-badge-info";
}

function safeText(x: any) {
  return String(x ?? "").trim();
}

export default function CandidatesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [list, setList] = useState<Candidate[]>([]);

  // Create
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<CandidateSource>("LinkedIn");
  const [status, setStatus] = useState<CandidateStatus>("new");
  const [errorMsg, setErrorMsg] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<CandidateSource | "all">("all");
  const [q, setQ] = useState("");

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
  }, [router]);

  const load = async () => {
    setErrorMsg("");

    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setList([]);
      return;
    }

    setList((data ?? []) as Candidate[]);
  };

  const add = async () => {
    setErrorMsg("");

    if (!email.trim() && !phone.trim()) {
      setErrorMsg("Un email ou un téléphone est requis.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.from("candidates").insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      source,
      status,
    });

    setBusy(false);

    if (error) {
      // messages custom si contraintes SQL
      if (error.message.includes("candidates_email_format")) setErrorMsg("Format email invalide.");
      else if (error.message.includes("candidates_phone_format")) setErrorMsg("Format téléphone invalide.");
      else if (error.message.includes("candidates_email_or_phone_required")) setErrorMsg("Un email ou un téléphone est requis.");
      else setErrorMsg(error.message);
      return;
    }

    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setSource("LinkedIn");
    setStatus("new");
    await load();
  };

  const updateStatus = async (id: string, next: CandidateStatus) => {
    setErrorMsg("");
    const { error } = await supabase.from("candidates").update({ status: next }).eq("id", id);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, status: next } : c)));
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return list.filter((c) => {
      const st = (c.status || "new") as CandidateStatus;
      const src = (c.source || "Other") as CandidateSource;

      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (sourceFilter !== "all" && src !== sourceFilter) return false;

      if (!query) return true;

      const hay = `${c.first_name} ${c.last_name}\n${c.email || ""}\n${c.phone || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [list, q, statusFilter, sourceFilter]);

  const byStatus = useMemo(() => {
    const map = new Map<CandidateStatus, Candidate[]>();
    for (const s of STATUSES) map.set(s.key, []);
    for (const c of filtered) {
      const st = (c.status || "new") as CandidateStatus;
      map.set(st, [...(map.get(st) ?? []), c]);
    }
    return map;
  }, [filtered]);

  return (
    <div className="tp-page">
      {/* Header */}
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Users size={18} />
            Candidats
          </h1>
          <p className="tp-subtitle">Pipeline, filtres et actions rapides.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="tp-btn tp-btn-secondary" onClick={load}>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <RefreshCcw size={16} />
              Rafraîchir
            </span>
          </button>

          <a className="tp-btn tp-btn-primary" href="#create" style={{ textDecoration: "none" }}>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <Plus size={16} />
              Ajouter
            </span>
          </a>
        </div>
      </div>

      {/* Create */}
      <div id="create" className="tp-card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Ajouter un candidat</div>

        <div className="tp-grid">
          <div className="tp-col-6">
            <input className="tp-input" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="tp-col-6">
            <input className="tp-input" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>

          <div className="tp-col-6">
            <input className="tp-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="tp-col-6">
            <input className="tp-input" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="tp-col-6">
            <select className="tp-input" value={source} onChange={(e) => setSource(e.target.value as CandidateSource)} style={{ borderRadius: 16 }}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="tp-col-6">
            <select className="tp-input" value={status} onChange={(e) => setStatus(e.target.value as CandidateStatus)} style={{ borderRadius: 16 }}>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div className="tp-col-12" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="tp-btn tp-btn-primary" onClick={add} disabled={busy} style={{ opacity: busy ? 0.7 : 1 }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <Plus size={16} />
                {busy ? "Ajout..." : "Ajouter"}
              </span>
            </button>
            <button className="tp-btn tp-btn-secondary" onClick={() => { setFirstName(""); setLastName(""); setEmail(""); setPhone(""); }}>
              Réinitialiser
            </button>
          </div>
        </div>

        {errorMsg ? (
          <div className="tp-badge tp-badge-error" style={{ marginTop: 12, gap: 8 }}>
            <XCircle size={14} />
            {errorMsg}
          </div>
        ) : null}
      </div>

      {/* Filters */}
      <div className="tp-card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Filtres</div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 240px 1fr", gap: 12 }}>
          <select className="tp-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ borderRadius: 16 }}>
            <option value="all">Tous les statuts</option>
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          <select className="tp-input" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)} style={{ borderRadius: 16 }}>
            <option value="all">Toutes les sources</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 13, opacity: 0.6 }} />
            <input className="tp-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Recherche (nom, email, téléphone)..." style={{ paddingLeft: 36 }} />
          </div>
        </div>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="tp-muted">Chargement...</div>
      ) : (
        <div className="tp-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Pipeline</div>
            <span className="tp-badge tp-badge-info" style={{ gap: 8 }}>
              <Tag size={14} />
              {filtered.length} candidat(s)
            </span>
          </div>

          <div className="hide-scrollbar" style={{ display: "flex", gap: 12, overflowX: "auto", marginTop: 12, paddingBottom: 6 }}>
            {STATUSES.map((s) => {
              const col = byStatus.get(s.key) ?? [];
              return (
                <div
                  key={s.key}
                  style={{
                    minWidth: 320,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.25)",
                    background: "rgba(255,255,255,0.65)",
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{s.label}</div>
                    <span className={`tp-badge ${badgeTone(s.tone)}`}>{col.length}</span>
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {col.map((c) => {
                      const current = ((c.status || "new") as CandidateStatus);
                      const idx = STATUSES.findIndex((x) => x.key === current);
                      const prev = idx > 0 ? STATUSES[idx - 1].key : null;
                      const next = idx < STATUSES.length - 1 ? STATUSES[idx + 1].key : null;

                      return (
                        <div
                          key={c.id}
                          style={{
                            borderRadius: 14,
                            border: "1px solid rgba(148,163,184,0.22)",
                            background: "rgba(255,255,255,0.85)",
                            padding: 12,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 900 }}>
                              {safeText(c.first_name)} {safeText(c.last_name)}
                            </div>

                            {/* “Fiche” : lien simple vers le hash id (MVP) */}
                            <Link
                              className="tp-btn tp-btn-ghost tp-btn-sm"
                              href={`/candidates#${c.id}`}
                              style={{ textDecoration: "none" }}
                              title="Aller à la fiche (MVP)"
                            >
                              Fiche
                            </Link>
                          </div>

                          <div className="tp-muted" style={{ fontSize: 13, marginTop: 3 }}>
                            {c.email || c.phone || "—"}
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                            {prev ? (
                              <button className="tp-btn tp-btn-ghost tp-btn-sm" onClick={() => updateStatus(c.id, prev)} title="Étape précédente">
                                <ChevronLeft size={16} />
                              </button>
                            ) : null}
                            {next ? (
                              <button className="tp-btn tp-btn-ghost tp-btn-sm" onClick={() => updateStatus(c.id, next)} title="Étape suivante">
                                <ChevronRight size={16} />
                              </button>
                            ) : null}

                            <span className="tp-badge tp-badge-info" style={{ marginLeft: "auto", gap: 8 }}>
                              <Tag size={14} />
                              {String(c.source || "Other")}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {col.length === 0 ? (
                      <div className="tp-badge tp-badge-info" style={{ justifyContent: "center" }}>
                        Aucun candidat
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  CalendarClock,
  RefreshCcw,
  MessageSquare,
  FileText,
  Wand2,
  Play,
  Copy,
  Trash2,
  Pencil,
  Power,
  Search,
  Filter,
} from "lucide-react";

type AiType = "job_description" | "outreach" | "interview" | "automation";

type AutomationTemplate = {
  id: string;
  icon: React.ReactNode;
  color: "blue" | "violet" | "green" | "orange" | "pink" | "indigo";
  title: string;
  desc: string;
  trigger: string;
  type: AiType;
  prompt: string;
};

type DbAutomation = {
  id: string;
  user_id: string;
  name: string;
  template_id: string | null;
  ai_type: string;
  trigger: string | null;
  prompt: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type DbRun = {
  id: string;
  user_id: string;
  automation_id: string | null;
  ai_type: string;
  input: string;
  output: string | null;
  status: string;
  created_at: string;
};

function clampText(txt: string, n = 110) {
  const t = (txt || "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n) + "…";
}

function iconBg(color: AutomationTemplate["color"]) {
  const m: Record<AutomationTemplate["color"], string> = {
    blue: "rgba(30,64,175,0.14)",
    violet: "rgba(124,58,237,0.14)",
    green: "rgba(22,163,74,0.14)",
    orange: "rgba(217,119,6,0.14)",
    pink: "rgba(236,72,153,0.14)",
    indigo: "rgba(99,102,241,0.14)",
  };
  return m[color];
}

const TYPES: Array<{ value: AiType; label: string; desc: string }> = [
  { value: "job_description", label: "Offre d’emploi", desc: "Description structurée (Québec/Canada)" },
  { value: "outreach", label: "Prospection", desc: "Message email/LinkedIn personnalisé" },
  { value: "interview", label: "Kit d’entrevue", desc: "Questions + grille d’évaluation" },
  { value: "automation", label: "Assistant", desc: "Résumé, note, document, analyse" },
];

function humanDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function AIPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [userId, setUserId] = useState<string>("");

  const [type, setType] = useState<AiType>("job_description");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // DB state
  const [automations, setAutomations] = useState<DbAutomation[]>([]);
  const [runs, setRuns] = useState<DbRun[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // Selected automation
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(null);

  // Editor state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AiType>("automation");
  const [editTrigger, setEditTrigger] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [busyEdit, setBusyEdit] = useState(false);

  // Filters (automations)
  const [autoQ, setAutoQ] = useState("");
  const [autoOnlyActive, setAutoOnlyActive] = useState(false);
  const [autoSort, setAutoSort] = useState<"recent" | "az">("recent");

  // Filters (runs)
  const [runQ, setRunQ] = useState("");
  const [runStatus, setRunStatus] = useState<"all" | "success" | "error">("all");

  const DEFAULT_TEMPLATES: AutomationTemplate[] = useMemo(
    () => [
      {
        id: "welcome-email",
        icon: <Mail size={18} />,
        color: "blue",
        title: "Email de bienvenue",
        desc: "Envoyer un email automatique aux nouveaux candidats",
        trigger: "Nouveau candidat ajouté",
        type: "outreach",
        prompt:
          "Écris un email de bienvenue professionnel en français (Québec/Canada) pour un nouveau candidat.\nContexte:\n- Poste ciblé: (à préciser)\n- Ton: chaleureux, professionnel\n- CTA: proposer un appel de 15 minutes\nSignature: TalentPilot AI\n",
      },
      {
        id: "interview-reminder",
        icon: <CalendarClock size={18} />,
        color: "violet",
        title: "Rappel d’entrevue",
        desc: "Envoyer un rappel 24h avant l’entrevue",
        trigger: "24h avant entrevue",
        type: "automation",
        prompt:
          "Rédige un rappel d’entrevue en français (Québec/Canada).\nInclure:\n- Date/heure\n- Lien (si applicable)\n- Conseils de préparation\nTon: concis, professionnel\n",
      },
      {
        id: "status-update",
        icon: <RefreshCcw size={18} />,
        color: "green",
        title: "Mise à jour de statut",
        desc: "Notifier le candidat lors d’un changement de statut",
        trigger: "Changement de statut",
        type: "outreach",
        prompt:
          "Rédige un message au candidat en français (Québec/Canada) pour l’informer d’un changement de statut.\nStatut: (ex: Entrevue / Offre / Refus)\nTon: respectueux, clair\n",
      },
      {
        id: "rejection-email",
        icon: <MessageSquare size={18} />,
        color: "orange",
        title: "Email de refus",
        desc: "Envoyer un email bienveillant de refus",
        trigger: "Statut = Refusé",
        type: "outreach",
        prompt:
          "Rédige un email de refus bienveillant en français (Québec/Canada).\nInclure:\n- Remerciement\n- Message respectueux\n- Possibilité de garder le CV\nTon: humain, professionnel\n",
      },
      {
        id: "offer-followup",
        icon: <FileText size={18} />,
        color: "pink",
        title: "Suivi d’offre",
        desc: "Relancer le candidat après envoi d’offre",
        trigger: "48h après offre",
        type: "outreach",
        prompt:
          "Rédige une relance en français (Québec/Canada) 48h après l’envoi d’une offre.\nInclure:\n- Rappel bref\n- Question ouverte\n- CTA: proposer un appel\n",
      },
      {
        id: "cv-analysis",
        icon: <Wand2 size={18} />,
        color: "indigo",
        title: "Analyse CV automatique",
        desc: "Analyser et scorer les CV avec l’IA",
        trigger: "CV uploadé",
        type: "automation",
        prompt:
          "Analyse un CV et donne:\n1) Score 0-100\n2) Points forts (5)\n3) Risques (3)\n4) Recommandation\nFormat clair en français.\n",
      },
    ],
    []
  );

  useEffect(() => {
    const t = (sp?.get("type") || "").trim() as AiType;
    if (t && TYPES.some((x) => x.value === t)) setType(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? "";
      setUserId(uid);

      await refreshDb();
      setLoadingDb(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const selected = useMemo(() => TYPES.find((x) => x.value === type)!, [type]);

  const kpiTop = useMemo(() => {
    const total = automations.length;
    const actives = automations.filter((x) => x.active).length;
    const exec = runs.length;
    return { total, actives, exec };
  }, [automations, runs]);

  const canRun = !busy && input.trim().length > 0;

  const refreshDb = async () => {
    setErr("");

    const [a, r] = await Promise.all([
      supabase.from("automations").select("*").order("created_at", { ascending: false }),
      supabase.from("automation_runs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    if (a.error) {
      setErr(a.error.message);
      setAutomations([]);
    } else {
      setAutomations((a.data ?? []) as DbAutomation[]);
    }

    if (r.error) {
      setErr((prev) => prev || r.error!.message);
      setRuns([]);
    } else {
      setRuns((r.data ?? []) as DbRun[]);
    }
  };

  const scrollToStudio = () => {
    setTimeout(() => {
      const el = document.getElementById("tp-studio");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const scrollToEdit = () => {
    setTimeout(() => {
      const el = document.getElementById("tp-edit");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const createAutomationFromTemplate = async (t: AutomationTemplate) => {
    setErr("");
    setOk("");

    if (!userId) {
      setErr("Utilisateur non détecté.");
      return null;
    }

    const { data, error } = await supabase
      .from("automations")
      .insert({
        user_id: userId,
        name: t.title,
        template_id: t.id,
        ai_type: t.type,
        trigger: t.trigger,
        prompt: t.prompt,
        active: true,
      })
      .select()
      .single();

    if (error) {
      setErr(error.message);
      return null;
    }

    setOk("Automatisation créée.");
    await refreshDb();
    return data as DbAutomation;
  };

  const useTemplate = async (t: AutomationTemplate) => {
    const created = await createAutomationFromTemplate(t);

    setType(t.type);
    setInput(t.prompt);
    setOutput("");
    setCopied(false);

    scrollToStudio();

    if (created?.id) setSelectedAutomationId(created.id);
  };

  const toggleAutomation = async (id: string, next: boolean) => {
    setErr("");
    setOk("");

    const { error } = await supabase.from("automations").update({ active: next }).eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }

    setOk(next ? "Automatisation activée." : "Automatisation désactivée.");
    await refreshDb();
  };

  const deleteAutomation = async (id: string) => {
    setErr("");
    setOk("");

    const { error } = await supabase.from("automations").delete().eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }

    setOk("Automatisation supprimée.");
    if (selectedAutomationId === id) setSelectedAutomationId(null);
    if (editId === id) setEditId(null);
    await refreshDb();
  };

  const startEdit = (a: DbAutomation) => {
    setEditId(a.id);
    setEditName(a.name || "");
    setEditType(((a.ai_type as AiType) || "automation") as AiType);
    setEditTrigger(a.trigger || "");
    setEditPrompt(a.prompt || "");
    setOk("");
    setErr("");
    scrollToEdit();
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditType("automation");
    setEditTrigger("");
    setEditPrompt("");
  };

  const saveEdit = async () => {
    if (!editId) return;

    setErr("");
    setOk("");

    if (!editName.trim()) {
      setErr("Le nom est requis.");
      return;
    }
    if (!editPrompt.trim()) {
      setErr("Le prompt est requis.");
      return;
    }

    setBusyEdit(true);

    const { error } = await supabase
      .from("automations")
      .update({
        name: editName.trim(),
        ai_type: editType,
        trigger: editTrigger.trim() || null,
        prompt: editPrompt,
      })
      .eq("id", editId);

    setBusyEdit(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk("Automatisation mise à jour.");
    await refreshDb();
  };

  const run = async () => {
    setErr("");
    setOk("");
    setCopied(false);
    setBusy(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setBusy(false);
      router.push("/login");
      return;
    }

    let generated = "";
    let status = "success";

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, input }),
      });

      const json = await res.json();

      if (!res.ok) {
        status = "error";
        setErr(json?.error ?? "Erreur inconnue");
        setBusy(false);
      } else {
        generated = String(json.output ?? "");
        setOutput(generated);
        setOk("Génération terminée.");
        if (json?.error) setErr(json.error);
        setBusy(false);
      }
    } catch (e: any) {
      status = "error";
      setBusy(false);
      setErr(e?.message ?? "Erreur réseau");
    }

    try {
      if (userId) {
        await supabase.from("automation_runs").insert({
          user_id: userId,
          automation_id: selectedAutomationId,
          ai_type: type,
          input,
          output: status === "success" ? generated : null,
          status,
        });
        await refreshDb();
      }
    } catch {
      // ignore
    }
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const copyRunOutput = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt || "");
      setOk("Résultat copié.");
      setTimeout(() => setOk(""), 1200);
    } catch {
      // ignore
    }
  };

  const clearStudio = () => {
    setErr("");
    setOk("");
    setOutput("");
    setInput("");
    setCopied(false);
    setSelectedAutomationId(null);
  };

  const createBlankAutomation = async () => {
    setErr("");
    setOk("");

    if (!userId) {
      setErr("Utilisateur non détecté.");
      return;
    }

    const { data, error } = await supabase
      .from("automations")
      .insert({
        user_id: userId,
        name: "Nouvelle automatisation",
        template_id: null,
        ai_type: "automation",
        trigger: "Manuel",
        prompt: "",
        active: true,
      })
      .select()
      .single();

    if (error) {
      setErr(error.message);
      return;
    }

    setOk("Automatisation créée.");
    await refreshDb();

    const created = data as DbAutomation;
    setSelectedAutomationId(created.id);
    setType("automation");
    setInput("");
    setOutput("");
    setCopied(false);
    scrollToStudio();
    startEdit(created);
  };

  const filteredAutomations = useMemo(() => {
    const q = autoQ.trim().toLowerCase();

    let list = [...automations];

    if (autoOnlyActive) list = list.filter((a) => a.active);

    if (q) {
      list = list.filter((a) => {
        const hay = `${a.name}\n${a.trigger || ""}\n${a.ai_type}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (autoSort === "az") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }

    return list;
  }, [automations, autoQ, autoOnlyActive, autoSort]);

  const filteredRuns = useMemo(() => {
    const q = runQ.trim().toLowerCase();

    let list = [...runs];

    if (runStatus !== "all") list = list.filter((r) => r.status === runStatus);

    if (q) {
      list = list.filter((r) => {
        const hay = `${r.ai_type}\n${r.input}\n${r.output || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [runs, runQ, runStatus]);

  return (
    <div className="tp-page">
      {/* Header */}
      <div className="tp-page-header" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link className="tp-btn tp-btn-ghost tp-btn-sm" href="/dashboard">
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <ArrowLeft size={16} /> Retour
            </span>
          </Link>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="tp-badge tp-badge-info" style={{ gap: 8 }}>
              <Zap size={14} /> IA
            </span>
            <span style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.02em" }}>
              Génération intelligente
            </span>
            <span className="tp-badge tp-badge-success" style={{ gap: 8 }}>
              <CheckCircle2 size={14} /> Actif
            </span>
          </div>

          <div className="tp-muted" style={{ fontSize: 14, marginTop: 4 }}>
            Automatisez vos processus de recrutement
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="tp-btn tp-btn-primary" onClick={createBlankAutomation}>
            + Nouvelle automatisation
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="tp-grid" style={{ marginBottom: 14 }}>
        <Kpi icon={<Zap size={20} />} label="Total" value={automations.length} tone="info" />
        <Kpi icon={<CheckCircle2 size={20} />} label="Actives" value={automations.filter((x) => x.active).length} tone="success" />
        <Kpi icon={<Play size={20} />} label="Exec." value={runs.length} tone="info" />
      </div>

      {/* Flash */}
      {(err || ok) ? (
        <div style={{ marginBottom: 12 }}>
          {err ? (
            <div className="tp-badge tp-badge-error" style={{ gap: 8 }}>
              <XCircle size={14} /> {err}
            </div>
          ) : null}
          {ok ? (
            <div className="tp-badge tp-badge-success" style={{ marginTop: err ? 8 : 0, gap: 8 }}>
              <CheckCircle2 size={14} /> {ok}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Templates */}
      <div style={{ marginTop: 6 }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Modèles disponibles</div>

        <div className="tp-grid">
          {DEFAULT_TEMPLATES.map((t) => (
            <div key={t.id} className="tp-card tp-col-4" style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: iconBg(t.color),
                    border: "1px solid rgba(148,163,184,0.25)",
                  }}
                >
                  {t.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{t.title}</div>
                  <div className="tp-muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {t.desc}
                  </div>
                </div>
              </div>

              <div style={{ height: 10 }} />

              <div className="tp-badge tp-badge-info" style={{ width: "100%", justifyContent: "center", borderRadius: 12, padding: "8px 10px", gap: 8 }}>
                <Clock size={14} /> {t.trigger}
              </div>

              <div style={{ height: 10 }} />

              <button className="tp-btn tp-btn-secondary" style={{ width: "100%" }} onClick={() => useTemplate(t)}>
                + Utiliser
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Studio */}
      <div id="tp-studio" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Studio IA</div>
            <div className="tp-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Configurez, générez, puis copiez le résultat.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="tp-btn tp-btn-secondary" onClick={clearStudio}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <Trash2 size={16} /> Effacer
              </span>
            </button>
            <button className="tp-btn tp-btn-secondary" onClick={copyOutput} disabled={!output.trim()} style={{ opacity: output.trim() ? 1 : 0.6 }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <Copy size={16} /> {copied ? "Copié" : "Copier"}
              </span>
            </button>
            <button className="tp-btn tp-btn-primary" onClick={run} disabled={!canRun} style={{ opacity: canRun ? 1 : 0.65 }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <Play size={16} /> {busy ? "Génération..." : "Générer"}
              </span>
            </button>
          </div>
        </div>

        <div className="tp-grid" style={{ marginTop: 12 }}>
          <div className="tp-card tp-col-6" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900 }}>Mode</div>
            <div className="tp-muted" style={{ fontSize: 13, marginTop: 4 }}>
              {selected.desc}
            </div>

            <div style={{ height: 12 }} />

            <select
              className="tp-input"
              value={type}
              onChange={(e) => {
                setType(e.target.value as AiType);
                setErr("");
                setOk("");
                setOutput("");
                setCopied(false);
                setSelectedAutomationId(null);
              }}
              style={{ borderRadius: 16 }}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <div style={{ height: 12 }} />

            <textarea
              className="tp-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Décrivez votre besoin (contexte, contraintes, ton, contenu attendu)…"
              rows={10}
              style={{ height: "auto", paddingTop: 12, paddingBottom: 12, borderRadius: 16 }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <span className="tp-muted" style={{ fontSize: 12 }}>
                {selectedAutomationId ? `Studio lié: ${selectedAutomationId.slice(0, 8)}…` : "—"}
              </span>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="tp-btn tp-btn-ghost tp-btn-sm" href="/history">
                  Historique IA
                </Link>
                <Link className="tp-btn tp-btn-ghost tp-btn-sm" href="/performance">
                  Insights
                </Link>
              </div>
            </div>
          </div>

          <div className="tp-card tp-col-6" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Résultat</div>
              <span className="tp-badge tp-badge-info" style={{ gap: 8 }}>
                {busy ? <Clock size={14} /> : <CheckCircle2 size={14} />} {busy ? "En cours" : output.trim() ? "Prêt" : "—"}
              </span>
            </div>

            <div style={{ height: 12 }} />

            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.25)",
                background: "rgba(255,255,255,0.75)",
                padding: 14,
                minHeight: 320,
              }}
            >
              {busy ? (
                <div className="tp-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Clock size={16} /> Génération en cours…
                </div>
              ) : output.trim() ? (
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 14, lineHeight: 1.5 }}>
                  {output.trim()}
                </pre>
              ) : (
                <div className="tp-muted">Aucun résultat — utilisez un modèle ou écrivez un prompt.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      {editId ? (
        <div id="tp-edit" style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Éditer une automatisation</div>

          <div className="tp-card" style={{ padding: 16 }}>
            <div className="tp-grid">
              <div className="tp-col-6">
                <div className="tp-muted" style={{ fontSize: 12, marginBottom: 6 }}>Nom</div>
                <input className="tp-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div className="tp-col-3">
                <div className="tp-muted" style={{ fontSize: 12, marginBottom: 6 }}>Type IA</div>
                <select className="tp-input" value={editType} onChange={(e) => setEditType(e.target.value as AiType)} style={{ borderRadius: 16 }}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="tp-col-3">
                <div className="tp-muted" style={{ fontSize: 12, marginBottom: 6 }}>Déclencheur</div>
                <input className="tp-input" value={editTrigger} onChange={(e) => setEditTrigger(e.target.value)} />
              </div>

              <div className="tp-col-12">
                <div className="tp-muted" style={{ fontSize: 12, marginBottom: 6 }}>Prompt</div>
                <textarea className="tp-input" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={8} style={{ height: "auto", borderRadius: 16 }} />
              </div>

              <div className="tp-col-12" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="tp-btn tp-btn-primary" onClick={saveEdit} disabled={busyEdit} style={{ opacity: busyEdit ? 0.7 : 1 }}>
                  <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                    <CheckCircle2 size={16} /> {busyEdit ? "Sauvegarde..." : "Sauvegarder"}
                  </span>
                </button>

                <button className="tp-btn tp-btn-secondary" onClick={() => {
                  setSelectedAutomationId(editId);
                  setType(editType);
                  setInput(editPrompt);
                  setOutput("");
                  setCopied(false);
                  scrollToStudio();
                }}>
                  Charger dans le studio
                </button>

                <button className="tp-btn tp-btn-secondary" onClick={cancelEdit}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mes automatisations */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Mes automatisations</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: 13, opacity: 0.6 }} />
              <input className="tp-input" value={autoQ} onChange={(e) => setAutoQ(e.target.value)} placeholder="Recherche…" style={{ width: 240, paddingLeft: 36 }} />
            </div>

            <button className={`tp-btn ${autoOnlyActive ? "tp-btn-primary" : "tp-btn-secondary"} tp-btn-sm`} onClick={() => setAutoOnlyActive((v) => !v)}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <Filter size={16} /> {autoOnlyActive ? "Actives ✓" : "Actives"}
              </span>
            </button>

            <select className="tp-input" value={autoSort} onChange={(e) => setAutoSort(e.target.value as any)} style={{ width: 180, borderRadius: 16 }}>
              <option value="recent">Plus récentes</option>
              <option value="az">A → Z</option>
            </select>
          </div>
        </div>

        <div className="tp-card" style={{ padding: 18 }}>
          {loadingDb ? (
            <div className="tp-muted">Chargement...</div>
          ) : filteredAutomations.length === 0 ? (
            <div className="tp-muted">Aucune automatisation (filtre/recherche).</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredAutomations.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.22)",
                    background: "rgba(255,255,255,0.80)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "grid", gap: 3 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ fontWeight: 900 }}>{a.name}</div>
                      {selectedAutomationId === a.id ? <span className="tp-badge tp-badge-info">Studio</span> : null}
                      <span className={`tp-badge ${a.active ? "tp-badge-success" : "tp-badge-warning"}`} style={{ gap: 8 }}>
                        {a.active ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                        {a.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="tp-muted" style={{ fontSize: 12 }}>
                      {a.trigger ? `⏱ ${a.trigger}` : "⏱ Manuel"} • {a.ai_type} • {humanDate(a.created_at)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      className={`tp-btn ${a.active ? "tp-btn-secondary" : "tp-btn-primary"} tp-btn-sm`}
                      onClick={() => toggleAutomation(a.id, !a.active)}
                    >
                      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                        <Power size={16} /> {a.active ? "Désactiver" : "Activer"}
                      </span>
                    </button>

                    <button className="tp-btn tp-btn-secondary tp-btn-sm" onClick={() => startEdit(a)}>
                      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                        <Pencil size={16} /> Éditer
                      </span>
                    </button>

                    <button
                      className="tp-btn tp-btn-secondary tp-btn-sm"
                      onClick={() => {
                        setSelectedAutomationId(a.id);
                        setType((a.ai_type as AiType) || "automation");
                        setInput(a.prompt || "");
                        setOutput("");
                        setCopied(false);
                        scrollToStudio();
                      }}
                    >
                      Ouvrir
                    </button>

                    <button className="tp-btn tp-btn-danger tp-btn-sm" onClick={() => deleteAutomation(a.id)}>
                      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                        <Trash2 size={16} /> Supprimer
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historique */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Historique d’exécutions</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: 13, opacity: 0.6 }} />
              <input className="tp-input" value={runQ} onChange={(e) => setRunQ(e.target.value)} placeholder="Recherche…" style={{ width: 240, paddingLeft: 36 }} />
            </div>

            <select className="tp-input" value={runStatus} onChange={(e) => setRunStatus(e.target.value as any)} style={{ width: 170, borderRadius: 16 }}>
              <option value="all">Tous</option>
              <option value="success">Succès</option>
              <option value="error">Erreur</option>
            </select>
          </div>
        </div>

        <div className="tp-card" style={{ padding: 18 }}>
          {loadingDb ? (
            <div className="tp-muted">Chargement...</div>
          ) : filteredRuns.length === 0 ? (
            <div className="tp-muted">Aucune exécution.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredRuns.map((x) => (
                <div
                  key={x.id}
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.22)",
                    background: "rgba(255,255,255,0.80)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "grid", gap: 3, minWidth: 260 }}>
                    <div style={{ fontWeight: 900, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {x.ai_type}
                      <span className={`tp-badge ${x.status === "success" ? "tp-badge-success" : "tp-badge-error"}`} style={{ gap: 8 }}>
                        {x.status === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {x.status === "success" ? "Succès" : "Erreur"}
                      </span>
                    </div>
                    <div className="tp-muted" style={{ fontSize: 12 }}>
                      {x.automation_id ? `Automation: ${x.automation_id.slice(0, 8)}…` : "Automation: —"}
                    </div>
                    <div className="tp-muted" style={{ fontSize: 12 }}>
                      Input: {clampText(x.input || "", 140)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {x.output ? (
                      <button className="tp-btn tp-btn-secondary tp-btn-sm" onClick={() => copyRunOutput(x.output || "")}>
                        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                          <Copy size={16} /> Copier output
                        </span>
                      </button>
                    ) : (
                      <span className="tp-muted" style={{ fontSize: 12 }}>—</span>
                    )}
                    <div className="tp-muted" style={{ fontSize: 12 }}>{humanDate(x.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 6 }} />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "info" | "success";
}) {
  return (
    <div className="tp-card tp-col-4" style={{ padding: 16 }}>
      <div style={{ display: "grid", placeItems: "center", gap: 6, minHeight: 110 }}>
        <div style={{ opacity: 0.9 }}>{icon}</div>
        <div className="tp-muted" style={{ fontWeight: 700 }}>{label}</div>
        <div style={{ fontWeight: 900, fontSize: 40, lineHeight: "40px", color: tone === "success" ? "var(--tp-success)" : "inherit" }}>
          {value}
        </div>
      </div>
    </div>
  );
}
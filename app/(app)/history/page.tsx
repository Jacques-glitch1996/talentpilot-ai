"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  History,
  RefreshCcw,
  Search,
  Filter,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock,
  XCircle,
  CheckCircle2,
} from "lucide-react";

type AiLog = {
  id: string;
  type: string;
  input: string;
  output: string;
  created_at: string;
};

function humanDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function short(txt: string, n = 220) {
  const t = (txt ?? "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n) + "…";
}

export default function HistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [logs, setLogs] = useState<AiLog[]>([]);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);

  // UI
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const refresh = async () => {
    setErr("");
    setOk("");

    const { data, error } = await supabase
      .from("ai_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      setErr(error.message);
      setLogs([]);
      return;
    }

    setLogs((data ?? []) as AiLog[]);
  };

  const types = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.type || "unknown"));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [logs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return logs.filter((l) => {
      const okType = typeFilter === "all" ? true : (l.type || "") === typeFilter;
      if (!okType) return false;

      if (!q) return true;

      const hay = `${l.type}\n${l.input}\n${l.output}`.toLowerCase();
      return hay.includes(q);
    });
  }, [logs, typeFilter, query]);

  const copyOut = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setOk("Copié.");
      setTimeout(() => {
        setCopiedId(null);
        setOk("");
      }, 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <History size={18} />
            Historique
          </h1>
          <p className="tp-subtitle">Journal des générations IA (audit, traçabilité, qualité).</p>
        </div>

        <button className="tp-btn tp-btn-secondary" onClick={refresh}>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <RefreshCcw size={16} />
            Actualiser
          </span>
        </button>
      </div>

      {(err || ok) ? (
        <div style={{ marginBottom: 12 }}>
          {err ? (
            <div className="tp-badge tp-badge-error" style={{ gap: 8 }}>
              <XCircle size={14} />
              {err}
            </div>
          ) : null}
          {ok ? (
            <div className="tp-badge tp-badge-success" style={{ marginTop: err ? 8 : 0, gap: 8 }}>
              <CheckCircle2 size={14} />
              {ok}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Filters */}
      <div className="tp-card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <Filter size={16} />
          Filtres
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 160px auto", gap: 12, alignItems: "center" }}>
          <select className="tp-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ borderRadius: 16 }}>
            {types.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "Tous les types" : t}
              </option>
            ))}
          </select>

          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 13, opacity: 0.6 }} />
            <input
              className="tp-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Recherche (type, input, output)…"
              style={{ paddingLeft: 36 }}
            />
          </div>

          <select className="tp-input" value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} style={{ borderRadius: 16 }}>
            <option value="25">25 derniers</option>
            <option value="50">50 derniers</option>
            <option value="100">100 derniers</option>
            <option value="200">200 derniers</option>
          </select>

          <button className="tp-btn tp-btn-secondary" onClick={refresh} title="Appliquer limite / recharger">
            Appliquer
          </button>
        </div>
      </div>

      {/* List */}
      <div className="tp-card">
        {loading ? (
          <div className="tp-muted">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="tp-badge tp-badge-info" style={{ justifyContent: "center" }}>
            Aucun élément ne correspond à vos filtres
          </div>
        ) : (
          <>
            <div className="tp-muted" style={{ fontSize: 13, marginBottom: 12 }}>
              {filtered.length} résultat(s)
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {filtered.map((l) => {
                const expanded = expandedId === l.id;

                return (
                  <div
                    key={l.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(148,163,184,0.25)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="tp-badge tp-badge-info">{l.type || "unknown"}</span>

                        <span className="tp-muted" style={{ fontSize: 12, display: "inline-flex", gap: 8, alignItems: "center" }}>
                          <Clock size={14} />
                          {humanDate(l.created_at)}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="tp-btn tp-btn-secondary tp-btn-sm"
                          onClick={() => copyOut(l.id, l.output || "")}
                          title="Copier le résultat"
                        >
                          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                            <Copy size={16} />
                            {copiedId === l.id ? "Copié" : "Copier"}
                          </span>
                        </button>

                        <button
                          className="tp-btn tp-btn-secondary tp-btn-sm"
                          onClick={() => setExpandedId(expanded ? null : l.id)}
                        >
                          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {expanded ? "Réduire" : "Détails"}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div style={{ height: 10 }} />

                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      <b>Input :</b> {expanded ? (l.input || "—") : short(l.input || "—")}
                    </div>

                    <div style={{ height: 10 }} />

                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                      <b>Output :</b> {expanded ? (l.output || "—") : short(l.output || "—")}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AiLog = {
  id: string;
  type: string;
  input: string;
  output: string;
  created_at: string;
};

export default function HistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [logs, setLogs] = useState<AiLog[]>([]);

  // Filtres
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

  const humanDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const short = (txt: string, n = 220) => {
    const t = (txt ?? "").trim();
    if (t.length <= n) return t;
    return t.slice(0, n) + "…";
  };

  const copy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1">Historique</h1>
          <p className="tp-subtitle">
            Journal des générations AI (audit, traçabilité, qualité).
          </p>
        </div>

        <button className="tp-btn tp-btn-primary" onClick={refresh}>
          Actualiser
        </button>
      </div>

      <div className="tp-card">
        {/* Filtres */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr 160px auto",
            gap: 12,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <select
            className="tp-input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ borderRadius: 16 }}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "Tous les types" : t}
              </option>
            ))}
          </select>

          <input
            className="tp-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Recherche (type, input, output)…"
          />

          <select
            className="tp-input"
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ borderRadius: 16 }}
          >
            <option value="25">25 derniers</option>
            <option value="50">50 derniers</option>
            <option value="100">100 derniers</option>
            <option value="200">200 derniers</option>
          </select>

          <button className="tp-btn tp-btn-secondary" onClick={refresh} title="Appliquer limite / recharger">
            Appliquer
          </button>
        </div>

        {err ? (
          <div className="tp-badge tp-badge-error" style={{ marginBottom: 14 }}>
            ❌ {err}
          </div>
        ) : null}

        {/* Liste */}
        {loading ? (
          <div className="tp-muted">Chargement...</div>
        ) : (
          <>
            <div className="tp-muted" style={{ fontSize: 13, marginBottom: 12 }}>
              {filtered.length} résultat(s) affiché(s)
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {filtered.map((l) => {
                const expanded = expandedId === l.id;

                return (
                  <div
                    key={l.id}
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(148,163,184,0.25)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="tp-badge tp-badge-info">{l.type || "unknown"}</span>
                        <span className="tp-muted" style={{ fontSize: 12 }}>
                          {humanDate(l.created_at)}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="tp-btn tp-btn-ghost tp-btn-sm"
                          onClick={() => copy(l.id, l.output || "")}
                          title="Copier le résultat"
                        >
                          {copiedId === l.id ? "✅ Copié" : "Copier"}
                        </button>

                        <button
                          className="tp-btn tp-btn-ghost tp-btn-sm"
                          onClick={() => setExpandedId(expanded ? null : l.id)}
                        >
                          {expanded ? "Réduire" : "Détails"}
                        </button>
                      </div>
                    </div>

                    <div style={{ height: 10 }} />

                    <div className="tp-muted" style={{ fontSize: 13 }}>
                      <b>Input :</b> {expanded ? (l.input || "—") : short(l.input || "—")}
                    </div>

                    <div style={{ height: 10 }} />

                    <div className="tp-muted" style={{ fontSize: 13 }}>
                      <b>Output :</b> {expanded ? (l.output || "—") : short(l.output || "—")}
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 ? (
                <div className="tp-badge tp-badge-info" style={{ justifyContent: "center" }}>
                  Aucun élément ne correspond à vos filtres.
                </div>
              ) : null}
            </div>

            {/* Responsive: si écran étroit, on empile naturellement */}
            <div style={{ height: 2 }} />
          </>
        )}
      </div>
    </div>
  );
}
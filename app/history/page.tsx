"use client";

import TopNav from "@/components/TopNav";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AiLog = {
  id: string;
  type: string;
  input: string;
  output: string;
  created_at: string;
};

const inputStyle: CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "rgba(255,255,255,0.85)",
  outline: "none",
};

const ghostBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(255,255,255,0.85)",
  cursor: "pointer",
  fontWeight: 800,
};

export default function HistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [logs, setLogs] = useState<AiLog[]>([]);

  // Filtres
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);

  // UI
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(
    async (nextLimit?: number) => {
      setErr("");

      const effectiveLimit = nextLimit ?? limit;

      const { data, error } = await supabase
        .from("ai_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(effectiveLimit);

      if (error) {
        setErr(error.message);
        setLogs([]);
        return;
      }

      setLogs((data ?? []) as AiLog[]);
    },
    [limit]
  );

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
      // fallback: rien
    }
  };

  return (
    <>
      <TopNav />

      <div style={{ padding: 22, maxWidth: 1200, margin: "0 auto" }}>
        <div className="tp-section-header">
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Historique</div>
            <div className="tp-muted" style={{ marginTop: 6 }}>
              Journal des générations AI (audit, traçabilité, qualité).
            </div>
          </div>

          <div className="tp-actions">
            <button
              onClick={() => refresh()}
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
              Actualiser
            </button>
          </div>
        </div>

        {/* Filtres */}
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
              gridTemplateColumns: "240px 1fr 160px auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={inputStyle}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "Tous les types" : t}
                </option>
              ))}
            </select>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Recherche (type, input, output)…"
              style={inputStyle}
            />

            <select
              value={String(limit)}
              onChange={(e) => {
                const next = Number(e.target.value);
                setLimit(next);
                refresh(next); // ✅ plus de closure périmée
              }}
              style={inputStyle}
            >
              <option value="25">25 derniers</option>
              <option value="50">50 derniers</option>
              <option value="100">100 derniers</option>
              <option value="200">200 derniers</option>
            </select>

            <button
              onClick={() => refresh()}
              style={ghostBtn}
              title="Recharger avec la limite courante"
            >
              Appliquer
            </button>
          </div>

          {err ? (
            <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 900 }}>
              ❌ {err}
            </div>
          ) : null}
        </div>

        <div style={{ height: 16 }} />

        {/* Liste */}
        {loading ? (
          <div>Chargement...</div>
        ) : (
          <>
            <div className="tp-muted" style={{ marginBottom: 10 }}>
              {filtered.length} résultat(s) affiché(s)
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {filtered.map((l) => {
                const expanded = expandedId === l.id;

                return (
                  <div
                    key={l.id}
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.8)",
                      border: "1px solid rgba(148,163,184,0.3)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900 }}>
                          {l.type || "unknown"}
                        </div>
                        <div className="tp-muted" style={{ fontSize: 13 }}>
                          {humanDate(l.created_at)}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => copy(l.id, l.output || "")}
                          style={ghostBtn}
                          title="Copier le résultat"
                        >
                          {copiedId === l.id ? "✅ Copié" : "Copier"}
                        </button>

                        <button
                          onClick={() => setExpandedId(expanded ? null : l.id)}
                          style={ghostBtn}
                        >
                          {expanded ? "Réduire" : "Détails"}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>
                          Input :
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {expanded ? l.input || "—" : short(l.input || "—")}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>
                          Output :
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {expanded ? l.output || "—" : short(l.output || "—")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 ? (
                <div className="tp-muted">
                  Aucun élément ne correspond à vos filtres.
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </>
  );
}

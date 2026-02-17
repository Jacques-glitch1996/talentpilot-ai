"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Kind = "AI" | "Message" | "Entrevue" | "Document";

type Row = {
  kind: Kind;
  at: string; // ISO
  title: string;
  detail: string;
  refId: string;
};

type Range = "7d" | "30d" | "90d";

export default function HistoryPage() {
  const router = useRouter();

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<Row[]>([]);
  const [limit, setLimit] = useState<50 | 100 | 200>(100);

  const [range, setRange] = useState<Range>("30d");
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<"All" | Kind>("All");

  const [selected, setSelected] = useState<Row | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<string>("");
  const [detailLoading, setDetailLoading] = useState(false);

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
  }, [router]);

  const fromISO = useMemo(() => {
    const d = new Date();
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    d.setDate(d.getDate() - (days - 1));
    return d.toISOString();
  }, [range]);

  const load = async () => {
    setErr("");
    setLoading(true);

    const n = limit;

    const [ai, msg, interviews, docs] = await Promise.all([
      supabase
        .from("ai_logs")
        .select("id, type, input, output, created_at")
        .gte("created_at", fromISO)
        .order("created_at", { ascending: false })
        .limit(n),

      supabase
        .from("messages")
        .select("id, channel, created_at, content")
        .gte("created_at", fromISO)
        .order("created_at", { ascending: false })
        .limit(n),

      supabase
        .from("interviews")
        .select("id, interview_date, created_at, notes")
        .gte("created_at", fromISO)
        .order("created_at", { ascending: false })
        .limit(n),

      supabase
        .from("documents")
        .select("id, file_type, created_at, file_url")
        .gte("created_at", fromISO)
        .order("created_at", { ascending: false })
        .limit(n),
    ]);

    const errors = [ai.error, msg.error, interviews.error, docs.error]
      .filter(Boolean)
      .map((e: any) => e.message);

    if (errors.length) setErr(errors.join(" | "));

    const combined: Row[] = [];

    (ai.data ?? []).forEach((r: any) =>
      combined.push({
        kind: "AI",
        at: r.created_at,
        title: `AI • ${r.type ?? "génération"}`,
        detail: (r.input ?? "").slice(0, 180),
        refId: r.id,
      })
    );

    (msg.data ?? []).forEach((r: any) =>
      combined.push({
        kind: "Message",
        at: r.created_at,
        title: `Message • ${r.channel ?? "—"}`,
        detail: (r.content ?? "").slice(0, 180),
        refId: r.id,
      })
    );

    (interviews.data ?? []).forEach((r: any) =>
      combined.push({
        kind: "Entrevue",
        at: r.created_at,
        title: `Entrevue • ${
          r.interview_date ? new Date(r.interview_date).toLocaleString() : "—"
        }`,
        detail: (r.notes ?? "").slice(0, 180),
        refId: r.id,
      })
    );

    (docs.data ?? []).forEach((r: any) =>
      combined.push({
        kind: "Document",
        at: r.created_at,
        title: `Document • ${r.file_type ?? "—"}`,
        detail: (r.file_url ?? "").slice(0, 180),
        refId: r.id,
      })
    );

    combined.sort((a, b) => (a.at < b.at ? 1 : -1));
    setRows(combined.slice(0, n));
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "All" && r.kind !== kindFilter) return false;
      if (!query) return true;
      return (
        r.title.toLowerCase().includes(query) ||
        r.detail.toLowerCase().includes(query) ||
        r.refId.toLowerCase().includes(query)
      );
    });
  }, [rows, q, kindFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const day = new Date(r.at).toISOString().slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), r]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filtered]);

  const openDetail = async (row: Row) => {
    setSelected(row);
    setSelectedDetail("");
    setDetailLoading(true);
    setErr("");

    try {
      if (row.kind === "AI") {
        const { data, error } = await supabase
          .from("ai_logs")
          .select("type, input, output, created_at")
          .eq("id", row.refId)
          .single();
        if (error) throw error;

        setSelectedDetail(
          `Type: ${data.type}\nDate: ${new Date(data.created_at).toLocaleString()}\n\nINPUT:\n${data.input}\n\nOUTPUT:\n${data.output}`
        );
      } else if (row.kind === "Message") {
        const { data, error } = await supabase
          .from("messages")
          .select("channel, content, created_at, candidate_id")
          .eq("id", row.refId)
          .single();
        if (error) throw error;

        setSelectedDetail(
          `Canal: ${data.channel}\nDate: ${new Date(data.created_at).toLocaleString()}\nCandidate ID: ${data.candidate_id}\n\n${data.content ?? ""}`
        );
      } else if (row.kind === "Entrevue") {
        const { data, error } = await supabase
          .from("interviews")
          .select("interview_date, notes, created_at, candidate_id, job_post_id")
          .eq("id", row.refId)
          .single();
        if (error) throw error;

        setSelectedDetail(
          `Date entrevue: ${data.interview_date ? new Date(data.interview_date).toLocaleString() : "—"}\nCréé: ${new Date(
            data.created_at
          ).toLocaleString()}\nCandidate ID: ${data.candidate_id}\nJob Post ID: ${data.job_post_id}\n\nNotes:\n${data.notes ?? ""}`
        );
      } else {
        const { data, error } = await supabase
          .from("documents")
          .select("file_type, file_url, created_at, candidate_id")
          .eq("id", row.refId)
          .single();
        if (error) throw error;

        setSelectedDetail(
          `Type: ${data.file_type}\nDate: ${new Date(data.created_at).toLocaleString()}\nCandidate ID: ${data.candidate_id}\n\nPath:\n${data.file_url ?? ""}`
        );
      }
    } catch (e: any) {
      setErr(e?.message ?? "Erreur détail");
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCSV = () => {
    const header = ["date_time", "type", "title", "detail", "refId"];
    const lines = [header.join(",")];

    for (const r of filtered) {
      const vals = [
        new Date(r.at).toISOString(),
        r.kind,
        r.title,
        r.detail,
        r.refId,
      ].map((v) => csvEscape(String(v ?? "")));
      lines.push(vals.join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `talentpilot_history_${range}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <TopNav />
      <div style={{ padding: 20, maxWidth: 1100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ marginBottom: 6 }}>Historique</h1>
            <div style={{ opacity: 0.7 }}>Recherche, filtres, export et détails.</div>
          </div>

          <button
            onClick={exportCSV}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "white",
              cursor: "pointer",
              height: 42,
            }}
          >
            Export CSV
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="90d">90 jours</option>
          </select>

          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as any)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="All">Tous</option>
            <option value="AI">AI</option>
            <option value="Message">Messages</option>
            <option value="Entrevue">Entrevues</option>
            <option value="Document">Documents</option>
          </select>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) as any)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (titre, texte, id...)"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minWidth: 260 }}
          />

          <button
            onClick={load}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "none",
              background: "#1E40AF",
              color: "white",
              cursor: "pointer",
            }}
          >
            Actualiser
          </button>
        </div>

        {err ? <div style={{ color: "crimson", marginTop: 12 }}>❌ {err}</div> : null}
        {loading ? <div style={{ marginTop: 12 }}>Chargement...</div> : null}

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: selected ? "1.2fr 0.8fr" : "1fr", gap: 12 }}>
          <div style={{ display: "grid", gap: 14 }}>
            {grouped.length === 0 ? (
              <div style={{ opacity: 0.7 }}>Aucun résultat.</div>
            ) : null}

            {grouped.map(([day, items]) => (
              <div key={day} style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>{day}</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {items.map((r) => (
                    <button
                      key={r.refId}
                      onClick={() => openDetail(r)}
                      style={{
                        textAlign: "left",
                        border: "1px solid #f0f0f0",
                        borderRadius: 12,
                        padding: 12,
                        background: selected?.refId === r.refId ? "rgba(124,58,237,0.08)" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 800 }}>{r.title}</div>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>{new Date(r.at).toLocaleTimeString()}</div>
                      </div>
                      {r.detail ? <div style={{ marginTop: 6, opacity: 0.8 }}>{r.detail}</div> : null}
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.55 }}>Type: {r.kind}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selected ? (
            <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, height: "fit-content" }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Détails</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
                {selected.kind} • {new Date(selected.at).toLocaleString()}
              </div>

              {detailLoading ? <div>Chargement...</div> : null}

              <textarea
                readOnly
                value={selectedDetail}
                rows={18}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                }}
              />

              <button
                onClick={() => setSelected(null)}
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Fermer
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function csvEscape(s: string) {
  const needs = /[",\n]/.test(s);
  const out = s.replace(/"/g, '""');
  return needs ? `"${out}"` : out;
}

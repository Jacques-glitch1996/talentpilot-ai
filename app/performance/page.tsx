"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type DailyRow = {
  day: string; // YYYY-MM-DD
  messages_count?: number;
  interviews_count?: number;
  documents_count?: number;
  ai_calls_count?: number;
};

export default function PerformancePage() {
  const router = useRouter();

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [messagesDaily, setMessagesDaily] = useState<DailyRow[]>([]);
  const [interviewsDaily, setInterviewsDaily] = useState<DailyRow[]>([]);
  const [documentsDaily, setDocumentsDaily] = useState<DailyRow[]>([]);
  const [aiDaily, setAiDaily] = useState<DailyRow[]>([]);

  const [days, setDays] = useState<7 | 30>(7);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      await loadAll(7);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadAll = async (n: 7 | 30) => {
    setErr("");
    setLoading(true);
    setDays(n);

    const fromDay = new Date();
    fromDay.setDate(fromDay.getDate() - (n - 1));
    const fromISO = fromDay.toISOString().slice(0, 10); // YYYY-MM-DD

    const [m, i, d, a] = await Promise.all([
      supabase.from("v_messages_daily").select("day, messages_count").gte("day", fromISO).order("day", { ascending: true }),
      supabase.from("v_interviews_daily").select("day, interviews_count").gte("day", fromISO).order("day", { ascending: true }),
      supabase.from("v_documents_daily").select("day, documents_count").gte("day", fromISO).order("day", { ascending: true }),
      supabase.from("v_ai_daily").select("day, ai_calls_count").gte("day", fromISO).order("day", { ascending: true }),
    ]);

    const errors = [m.error, i.error, d.error, a.error].filter(Boolean).map((e: any) => e.message);
    if (errors.length) setErr(errors.join(" | "));

    setMessagesDaily((m.data as any[]) ?? []);
    setInterviewsDaily((i.data as any[]) ?? []);
    setDocumentsDaily((d.data as any[]) ?? []);
    setAiDaily((a.data as any[]) ?? []);

    setLoading(false);
  };

  const kpis = useMemo(() => {
    const sum = (arr: any[], key: string) => arr.reduce((acc, r) => acc + (Number(r[key] ?? 0) || 0), 0);
    return {
      messages: sum(messagesDaily, "messages_count"),
      interviews: sum(interviewsDaily, "interviews_count"),
      documents: sum(documentsDaily, "documents_count"),
      ai: sum(aiDaily, "ai_calls_count"),
    };
  }, [messagesDaily, interviewsDaily, documentsDaily, aiDaily]);

  return (
    <>
      <TopNav />
      <div style={{ padding: 20, maxWidth: 1000 }}>
        <h1>Performances</h1>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => loadAll(7)}
            style={{
              padding: 10,
              borderRadius: 10,
              border: days === 7 ? "1px solid #7C3AED" : "1px solid #e5e7eb",
              background: days === 7 ? "#7C3AED" : "white",
              color: days === 7 ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            7 jours
          </button>
          <button
            onClick={() => loadAll(30)}
            style={{
              padding: 10,
              borderRadius: 10,
              border: days === 30 ? "1px solid #7C3AED" : "1px solid #e5e7eb",
              background: days === 30 ? "#7C3AED" : "white",
              color: days === 30 ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            30 jours
          </button>
        </div>

        {err ? <div style={{ color: "crimson", marginTop: 12 }}>❌ {err}</div> : null}
        {loading ? <div style={{ marginTop: 12 }}>Chargement...</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 16 }}>
          <KpiCard title="Messages" value={kpis.messages} />
          <KpiCard title="Entrevues" value={kpis.interviews} />
          <KpiCard title="Documents" value={kpis.documents} />
          <KpiCard title="Appels AI" value={kpis.ai} />
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <MiniTable title="Messages / jour" rows={messagesDaily} keyName="messages_count" />
          <MiniTable title="Entrevues / jour" rows={interviewsDaily} keyName="interviews_count" />
          <MiniTable title="Documents / jour" rows={documentsDaily} keyName="documents_count" />
          <MiniTable title="AI / jour" rows={aiDaily} keyName="ai_calls_count" />
        </div>
      </div>
    </>
  );
}

function KpiCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function MiniTable({
  title,
  rows,
  keyName,
}: {
  title: string;
  rows: any[];
  keyName: string;
}) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {rows.length === 0 ? <div style={{ opacity: 0.7 }}>Aucune donnée.</div> : null}
        {rows.map((r) => (
          <div key={r.day} style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ opacity: 0.75 }}>{r.day}</div>
            <div style={{ fontWeight: 700 }}>{r[keyName] ?? 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

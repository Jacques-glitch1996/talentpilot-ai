"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CandidateLite = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type MessageRow = {
  id: string;
  candidate_id: string;
  sender_id: string | null;
  content: string | null;
  channel: string | null;
  created_at: string;
};

export default function MessagesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [candidates, setCandidates] = useState<CandidateLite[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);

  const [candidateId, setCandidateId] = useState("");
  const [channel, setChannel] = useState<"LinkedIn" | "Email">("LinkedIn");
  const [content, setContent] = useState("");

  const candidateLabel = useMemo(() => {
    const c = candidates.find((x) => x.id === candidateId);
    if (!c) return "";
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Candidat";
    return c.email ? `${name} — ${c.email}` : name;
  }, [candidateId, candidates]);

  // protection + bootstrap
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      await Promise.all([loadCandidates(), loadMessages()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, first_name, last_name, email")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setErr(error.message);
      return;
    }
    setCandidates((data as CandidateLite[]) ?? []);
    if (!candidateId && data?.[0]?.id) setCandidateId(data[0].id);
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, candidate_id, sender_id, content, channel, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setErr(error.message);
      return;
    }
    setMessages((data as MessageRow[]) ?? []);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      setErr(userErr.message);
      return;
    }
    const userId = userData.user?.id;
    if (!userId) {
      router.push("/login");
      return;
    }

    if (!candidateId) {
      setErr("Veuillez sélectionner un candidat.");
      return;
    }

    const { error } = await supabase.from("messages").insert({
      candidate_id: candidateId,
      sender_id: userId,
      content,
      channel,
      // organization_id: inutile si DEFAULT current_org_id() est configuré
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setContent("");
    await loadMessages();
  };

  return (
    <>
      <TopNav />
      <div style={{ padding: 20 }}>
        <h1>Messages</h1>

        {err ? <div style={{ color: "crimson", marginBottom: 12 }}>❌ {err}</div> : null}
        {loading ? <div>Chargement...</div> : null}

        <form onSubmit={send} style={{ display: "grid", gap: 10, maxWidth: 900, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minWidth: 320 }}
            >
              {candidates.map((c) => {
                const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Candidat";
                const label = c.email ? `${name} — ${c.email}` : name;
                return (
                  <option key={c.id} value={c.id}>
                    {label}
                  </option>
                );
              })}
            </select>

            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as any)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            >
              <option value="LinkedIn">LinkedIn</option>
              <option value="Email">Email</option>
            </select>

            <button
              type="submit"
              disabled={!content.trim()}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "none",
                background: "#1E40AF",
                color: "white",
                cursor: "pointer",
              }}
            >
              Envoyer
            </button>
          </div>

          <textarea
            placeholder={`Message (${channel}) — ${candidateLabel || "Sélectionnez un candidat"}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
        </form>

        <div style={{ marginTop: 18, display: "grid", gap: 10, maxWidth: 900 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ padding: 12, borderRadius: 12, border: "1px solid #eee" }}>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {m.channel ?? "—"} • {new Date(m.created_at).toLocaleString()}
              </div>
              <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{m.content ?? ""}</div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.55 }}>
                Candidate: {m.candidate_id}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

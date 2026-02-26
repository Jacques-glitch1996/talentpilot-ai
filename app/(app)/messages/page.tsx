"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  RefreshCcw,
  Plus,
  Send,
  Loader2,
  XCircle,
  Mail,
  Phone,
  AtSign,
  MessageSquare,
} from "lucide-react";

type MessageRow = {
  id: string;
  content: string;
  channel: string;
  created_at: string;
};

function humanDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function channelMeta(channel: string) {
  const ch = (channel || "").toLowerCase();
  if (ch === "email") return { label: "Email", icon: <Mail size={14} />, tone: "tp-badge-info" };
  if (ch === "phone") return { label: "Téléphone", icon: <Phone size={14} />, tone: "tp-badge-warning" };
  if (ch === "linkedin") return { label: "LinkedIn", icon: <AtSign size={14} />, tone: "tp-badge-success" };
  return { label: channel || "Message", icon: <MessageSquare size={14} />, tone: "tp-badge-info" };
}

export default function MessagesPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState("email");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setMessages([]);
      return;
    }

    setMessages((data ?? []) as MessageRow[]);
  };

  const addMessage = async () => {
    setErr("");
    if (!content.trim()) return;

    setBusy(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        content: content.trim(),
        channel,
      })
      .select()
      .single();

    setBusy(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setMessages([data as MessageRow, ...messages]);
    setContent("");
  };

  const stats = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of messages) map.set(m.channel, (map.get(m.channel) ?? 0) + 1);
    return {
      total: messages.length,
      email: map.get("email") ?? 0,
      linkedin: map.get("linkedin") ?? 0,
      phone: map.get("phone") ?? 0,
    };
  }, [messages]);

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <MessageSquare size={18} />
            Communication
          </h1>
          <p className="tp-subtitle">Centralisez vos échanges candidats.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="tp-btn tp-btn-secondary" onClick={refresh}>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <RefreshCcw size={16} />
              Rafraîchir
            </span>
          </button>

          <a className="tp-btn tp-btn-primary" href="#create" style={{ textDecoration: "none" }}>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <Plus size={16} />
              Nouveau message
            </span>
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="tp-grid" style={{ marginBottom: 14 }}>
        <div className="tp-card tp-col-4" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900 }}>Total</div>
          <div className="tp-gradient-text" style={{ marginTop: 10, fontSize: 28, fontWeight: 900, lineHeight: "28px" }}>
            {stats.total}
          </div>
          <div className="tp-muted" style={{ marginTop: 8, fontSize: 13 }}>Messages enregistrés</div>
        </div>

        <div className="tp-card tp-col-4" style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 900 }}>
            <Mail size={16} /> Email
          </div>
          <div className="tp-gradient-text" style={{ marginTop: 10, fontSize: 28, fontWeight: 900, lineHeight: "28px" }}>
            {stats.email}
          </div>
          <div className="tp-muted" style={{ marginTop: 8, fontSize: 13 }}>Canal email</div>
        </div>

        <div className="tp-card tp-col-4" style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 900 }}>
            <AtSign size={16} /> LinkedIn
          </div>
          <div className="tp-gradient-text" style={{ marginTop: 10, fontSize: 28, fontWeight: 900, lineHeight: "28px" }}>
            {stats.linkedin}
          </div>
          <div className="tp-muted" style={{ marginTop: 8, fontSize: 13 }}>Canal LinkedIn</div>
        </div>
      </div>

      {/* Create */}
      <div id="create" className="tp-card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Nouveau message</div>

        <div className="tp-grid">
          <div className="tp-col-4">
            <select className="tp-input" value={channel} onChange={(e) => setChannel(e.target.value)} style={{ borderRadius: 16 }}>
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="phone">Téléphone</option>
            </select>
          </div>

          <div className="tp-col-8">
            <textarea
              className="tp-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              style={{ height: "auto", paddingTop: 12, paddingBottom: 12, borderRadius: 16, resize: "none" }}
              placeholder="Contenu du message…"
            />
          </div>

          <div className="tp-col-12" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="tp-btn tp-btn-primary"
              onClick={addMessage}
              disabled={busy || !content.trim()}
              style={{ opacity: busy || !content.trim() ? 0.7 : 1 }}
            >
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {busy ? "Ajout..." : "Ajouter"}
              </span>
            </button>

            <button className="tp-btn tp-btn-secondary" onClick={() => setContent("")} disabled={busy}>
              Effacer
            </button>
          </div>
        </div>

        {err ? (
          <div className="tp-badge tp-badge-error" style={{ marginTop: 12, gap: 8 }}>
            <XCircle size={14} />
            {err}
          </div>
        ) : null}
      </div>

      {/* List */}
      <div className="tp-card">
        {loading ? (
          <div className="tp-muted">Chargement...</div>
        ) : messages.length === 0 ? (
          <div className="tp-badge tp-badge-info" style={{ justifyContent: "center" }}>
            Aucun message pour le moment
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {messages.map((msg) => {
              const meta = channelMeta(msg.channel);
              return (
                <div
                  key={msg.id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.85)",
                    border: "1px solid rgba(148,163,184,0.25)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span className={`tp-badge ${meta.tone}`} style={{ gap: 8 }}>
                      {meta.icon}
                      {meta.label}
                    </span>
                    <div className="tp-muted" style={{ fontSize: 12 }}>{humanDate(msg.created_at)}</div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 14, whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
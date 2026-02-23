"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Message = {
  id: string;
  content: string;
  channel: string;
  created_at: string;
};

export default function MessagesPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState("email");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      const { data: list } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      setMessages(list || []);
      setLoading(false);
    })();
  }, [router]);

  const addMessage = async () => {
    if (!content) return;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        content,
        channel,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages([data, ...messages]);
      setContent("");
    }
  };

  return (
    <>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 50px" }}>
        <div
          className="tp-glass"
          style={{
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 20px 40px rgba(2,6,23,0.08)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0 }}>Communication</h1>
            <div style={{ opacity: 0.6, marginTop: 6 }}>
              Centralisez vos échanges candidats.
            </div>
          </div>

          {/* FORMULAIRE */}
          <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              style={inputStyle}
            >
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="phone">Téléphone</option>
            </select>

            <textarea
              placeholder="Contenu du message"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              style={inputStyle}
            />

            <button
              onClick={addMessage}
              className="tp-gradient-bg"
              style={{
                padding: "12px 20px",
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
                width: 200,
              }}
            >
              Ajouter message
            </button>
          </div>

          {/* LISTE */}
          {loading ? (
            <div>Chargement...</div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.85)",
                    border: "1px solid rgba(148,163,184,0.3)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(124,58,237,0.1)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {msg.channel}
                    </span>

                    <div style={{ fontSize: 12, opacity: 0.6 }}>
                      {new Date(msg.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ fontSize: 14 }}>{msg.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "rgba(255,255,255,0.85)",
};

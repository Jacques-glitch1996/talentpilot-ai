"use client";

import TopNav from "@/components/TopNav";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type DocRow = {
  id: string;
  candidate_id: string;
  file_url: string;
  file_type: string;
  created_at: string;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Erreur upload";
}

const inputStyle: CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "rgba(255,255,255,0.85)",
  outline: "none",
};

export default function DocumentsPage() {
  const router = useRouter();

  const [items, setItems] = useState<DocRow[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [fileType, setFileType] = useState("CV");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const refresh = useCallback(async () => {
    setErr("");
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setItems([]);
      return;
    }
    setItems((data ?? []) as DocRow[]);
  }, []);

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

  const upload = async () => {
    setErr("");
    setOk("");

    if (!candidateId.trim()) {
      setErr("Candidate ID est requis.");
      return;
    }
    if (!file) {
      setErr("Veuillez sélectionner un fichier.");
      return;
    }

    setBusy(true);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `org/${candidateId.trim()}/${Date.now()}_${safeName}`;

      // 1) Upload storage
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (upErr) {
        setBusy(false);
        setErr(upErr.message);
        return;
      }

      // 2) URL signée (optionnel pour ouvrir en cliquant)
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(path, 60 * 60); // 1h

      // 3) Insert table documents (on garde path, et on stocke aussi l’url signée pour MVP)
      const { data: row, error: insErr } = await supabase
        .from("documents")
        .insert({
          candidate_id: candidateId.trim(),
          file_type: fileType,
          file_url: signed?.signedUrl ?? path,
        })
        .select()
        .single();

      if (insErr) {
        setBusy(false);
        setErr(insErr.message);
        return;
      }

      setItems((prev) => [row as DocRow, ...prev]);
      setFile(null);
      setOk("Document ajouté avec succès.");
      setBusy(false);
    } catch (e: unknown) {
      setBusy(false);
      setErr(getErrorMessage(e));
    }
  };

  const openDoc = async (doc: DocRow) => {
    setErr("");

    // Si file_url est déjà une URL signée (MVP), on ouvre direct.
    if (doc.file_url.startsWith("http")) {
      window.open(doc.file_url, "_blank");
      return;
    }

    // Sinon, on signe à la volée (si on a stocké un path)
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_url, 60 * 60);

    if (error) {
      setErr(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  return (
    <>
      <TopNav />

      <div style={{ padding: 22, maxWidth: 1100, margin: "0 auto" }}>
        <div className="tp-section-header">
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Documents</div>
            <div className="tp-muted" style={{ marginTop: 6 }}>
              Centralisez CV, rapports et fichiers générés.
            </div>
          </div>
        </div>

        {/* UPLOAD */}
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
              gridTemplateColumns: "1fr 220px 1fr auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <input
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              placeholder="Candidate ID"
              style={inputStyle}
            />

            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              style={inputStyle}
            >
              <option value="CV">CV</option>
              <option value="Rapport">Rapport</option>
              <option value="Fichier IA">Fichier IA</option>
              <option value="Autre">Autre</option>
            </select>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={inputStyle}
            />

            <button
              onClick={upload}
              disabled={busy}
              className="tp-gradient-bg"
              style={{
                padding: "12px 18px",
                borderRadius: 999,
                border: "none",
                color: "white",
                fontWeight: 900,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.85 : 1,
              }}
            >
              {busy ? "Upload..." : "Ajouter"}
            </button>
          </div>

          {err ? (
            <div style={{ marginTop: 12, color: "crimson", fontWeight: 800 }}>
              ❌ {err}
            </div>
          ) : null}

          {ok ? (
            <div style={{ marginTop: 12, color: "green", fontWeight: 800 }}>
              ✅ {ok}
            </div>
          ) : null}
        </div>

        <div style={{ height: 16 }} />

        {/* LIST */}
        {loading ? (
          <div>Chargement...</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(148,163,184,0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>{d.file_type}</div>
                  <div className="tp-muted" style={{ fontSize: 12 }}>
                    {new Date(d.created_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                  <div>
                    <b>Candidate ID :</b> {d.candidate_id}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => openDoc(d)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.35)",
                      background: "white",
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    Ouvrir
                  </button>

                  <span className="tp-muted" style={{ fontSize: 12 }}>
                    {d.file_url.startsWith("http") ? "URL signée" : "Path storage"}
                  </span>
                </div>
              </div>
            ))}

            {items.length === 0 ? (
              <div className="tp-muted">Aucun document pour le moment.</div>
            ) : null}
          </div>
        )}

        <div style={{ height: 10 }} />

        <button
          onClick={refresh}
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(255,255,255,0.85)",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          Actualiser
        </button>
      </div>
    </>
  );
}

"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type DocRow = {
  id: string;
  candidate_id: string;
  file_url: string;
  file_type: string;
  created_at: string;
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
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setItems([]);
      return;
    }
    setItems((data ?? []) as DocRow[]);
  };

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
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `org/${candidateId.trim()}/${Date.now()}_${safeName}`;

      // 1) Upload storage
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

      if (upErr) {
        setBusy(false);
        setErr(upErr.message);
        return;
      }

      // 2) URL signée (optionnel pour ouvrir en cliquant)
      const { data: signed, error: signErr } = await supabase.storage
        .from("documents")
        .createSignedUrl(path, 60 * 60); // 1h

      if (signErr) {
        // pas bloquant
      }

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

      setItems([row as DocRow, ...items]);
      setFile(null);
      setOk("Document ajouté avec succès.");
      setBusy(false);
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message ?? "Erreur upload");
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
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_url, 60 * 60);
    if (error) {
      setErr(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <>
      <TopNav />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 50px" }}>
        <div
          className="tp-glass"
          style={{
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 20px 40px rgba(2,6,23,0.08)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0 }}>Documents</h1>
            <div style={{ opacity: 0.6, marginTop: 6 }}>
              Centralisez CV, rapports et fichiers générés.
            </div>
          </div>

          {/* UPLOAD */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 1fr auto", gap: 12, marginBottom: 18 }}>
            <input
              placeholder="Candidate ID (uuid)"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              style={inputStyle}
            />

            <select value={fileType} onChange={(e) => setFileType(e.target.value)} style={inputStyle}>
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
                fontWeight: 800,
                cursor: "pointer",
                opacity: busy ? 0.75 : 1,
              }}
            >
              {busy ? "Upload..." : "Ajouter"}
            </button>
          </div>

          {err ? <div style={{ color: "crimson", marginBottom: 12 }}>❌ {err}</div> : null}
          {ok ? <div style={{ color: "#166534", marginBottom: 12 }}>✅ {ok}</div> : null}

          {/* LIST */}
          {loading ? (
            <div>Chargement...</div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {items.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.85)",
                    border: "1px solid rgba(148,163,184,0.25)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "rgba(30,64,175,0.10)",
                          fontSize: 12,
                          fontWeight: 700,
                          marginRight: 10,
                        }}
                      >
                        {d.file_type}
                      </span>
                      Document
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.65 }}>
                      {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                    <b>Candidate ID :</b> {d.candidate_id}
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
                        fontWeight: 700,
                      }}
                    >
                      Ouvrir
                    </button>

                    <div style={{ fontSize: 12, opacity: 0.65, alignSelf: "center" }}>
                      {d.file_url.startsWith("http") ? "URL signée" : "Path storage"}
                    </div>
                  </div>
                </div>
              ))}

              {items.length === 0 ? <div style={{ opacity: 0.7 }}>Aucun document pour le moment.</div> : null}
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

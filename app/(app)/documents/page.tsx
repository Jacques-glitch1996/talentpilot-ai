"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Upload,
  ExternalLink,
  RefreshCcw,
  XCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Tag,
  Paperclip,
} from "lucide-react";

type DocRow = {
  id: string;
  candidate_id: string;
  file_url: string;
  file_type: string;
  created_at: string;
};

function humanDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function DocumentsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

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
    setOk("");

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

  const pickFile = () => fileRef.current?.click();

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

      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

      if (upErr) {
        setBusy(false);
        setErr(upErr.message);
        return;
      }

      const { data: signed } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60);

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
      if (fileRef.current) fileRef.current.value = "";
      setOk("Document ajouté avec succès.");
      setBusy(false);
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message ?? "Erreur upload");
    }
  };

  const openDoc = async (doc: DocRow) => {
    setErr("");

    if (doc.file_url.startsWith("http")) {
      window.open(doc.file_url, "_blank");
      return;
    }

    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_url, 60 * 60);
    if (error) {
      setErr(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-h1" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <FileText size={18} />
            Documents
          </h1>
          <p className="tp-subtitle">Centralisez CV, rapports et fichiers générés.</p>
        </div>

        <button className="tp-btn tp-btn-secondary" onClick={refresh}>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <RefreshCcw size={16} />
            Rafraîchir
          </span>
        </button>
      </div>

      {/* Upload */}
      <div className="tp-card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Ajouter un document</div>

        <div className="tp-grid">
          {/* Candidate ID sur toute la largeur */}
          <div className="tp-col-12">
            <input
              className="tp-input"
              placeholder="Candidate ID (uuid)"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
            />
          </div>

          {/* Type */}
          <div className="tp-col-4">
            <select
              className="tp-input"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              style={{ borderRadius: 16 }}
            >
              <option value="CV">CV</option>
              <option value="Rapport">Rapport</option>
              <option value="Fichier IA">Fichier IA</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          {/* File picker custom */}
          <div className="tp-col-8">
            <div
              className="tp-input"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 16,
                padding: "0 12px",
                height: 42,
              }}
            >
              <button
                type="button"
                className="tp-btn tp-btn-secondary tp-btn-sm"
                onClick={pickFile}
                style={{ height: 34 }}
              >
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <Paperclip size={16} />
                  Choisir un fichier
                </span>
              </button>

              <span className="tp-muted" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file ? file.name : "Aucun fichier sélectionné"}
              </span>

              <input
                ref={fileRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="tp-col-12" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="tp-btn tp-btn-primary"
              onClick={upload}
              disabled={busy}
              style={{ opacity: busy ? 0.75 : 1 }}
            >
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {busy ? "Upload..." : "Ajouter"}
              </span>
            </button>

            <span className="tp-muted" style={{ fontSize: 12 }}>
              Conseil : utilisez des noms de fichiers simples (sans caractères spéciaux).
            </span>
          </div>
        </div>

        {err ? (
          <div className="tp-badge tp-badge-error" style={{ marginTop: 12, gap: 8 }}>
            <XCircle size={14} />
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="tp-badge tp-badge-success" style={{ marginTop: 12, gap: 8 }}>
            <CheckCircle2 size={14} />
            {ok}
          </div>
        ) : null}
      </div>

      {/* List */}
      <div className="tp-card">
        {loading ? (
          <div className="tp-muted">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="tp-badge tp-badge-info" style={{ justifyContent: "center" }}>
            Aucun document pour le moment
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(148,163,184,0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="tp-badge tp-badge-info" style={{ gap: 8 }}>
                      <Tag size={14} />
                      {d.file_type}
                    </span>
                    <div style={{ fontWeight: 900 }}>Document</div>
                  </div>

                  <div className="tp-muted" style={{ fontSize: 12 }}>{humanDate(d.created_at)}</div>
                </div>

                <div className="tp-muted" style={{ marginTop: 8, fontSize: 13 }}>
                  <b>Candidate ID :</b> {d.candidate_id}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button className="tp-btn tp-btn-secondary" onClick={() => openDoc(d)}>
                    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <ExternalLink size={16} />
                      Ouvrir
                    </span>
                  </button>

                  <div className="tp-muted" style={{ fontSize: 12 }}>
                    {d.file_url.startsWith("http") ? "URL signée" : "Path storage"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
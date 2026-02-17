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

type DocRow = {
  id: string;
  candidate_id: string;
  file_url: string | null;   // on stocke le PATH storage (ex: orgId/candidateId/filename.pdf)
  file_type: string | null;
  created_at: string;
};

export default function DocumentsPage() {
  const router = useRouter();

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [candidates, setCandidates] = useState<CandidateLite[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);

  const [candidateId, setCandidateId] = useState("");
  const [fileType, setFileType] = useState<"CV" | "Rapport" | "Fichier IA">("CV");
  const [file, setFile] = useState<File | null>(null);

  const candidateMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of candidates) {
      const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Candidat";
      m.set(c.id, c.email ? `${name} — ${c.email}` : name);
    }
    return m;
  }, [candidates]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      await Promise.all([loadCandidates(), loadDocs()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, first_name, last_name, email")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setErr(error.message);
      return;
    }
    const rows = (data as CandidateLite[]) ?? [];
    setCandidates(rows);
    if (!candidateId && rows[0]?.id) setCandidateId(rows[0].id);
  };

  const loadDocs = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("id, candidate_id, file_url, file_type, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setErr(error.message);
      return;
    }
    setDocs((data as DocRow[]) ?? []);
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!candidateId) return setErr("Veuillez sélectionner un candidat.");
    if (!file) return setErr("Veuillez choisir un fichier.");

    // 1) récupérer org_id depuis la fonction SQL (RPC)
    const { data: orgId, error: orgErr } = await supabase.rpc("current_org_id");
    if (orgErr) return setErr(orgErr.message);
    if (!orgId) return setErr("Organization ID introuvable (current_org_id).");

    // 2) construire un chemin Storage sécurisé: orgId/candidateId/filename
    const safeName = file.name.replaceAll(" ", "_");
    const path = `${orgId}/${candidateId}/${Date.now()}_${safeName}`;

    // 3) upload dans le bucket "documents"
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(path, file, { upsert: false });

    if (upErr) return setErr(upErr.message);

    // 4) enregistrer la ligne en DB (file_url = path storage)
    const { error: insErr } = await supabase.from("documents").insert({
      candidate_id: candidateId,
      file_url: path,
      file_type: fileType,
    });

    if (insErr) return setErr(insErr.message);

    setFile(null);
    // reset input file visuellement: on recharge page state
    await loadDocs();
  };

  const download = async (doc: DocRow) => {
    setErr("");
    if (!doc.file_url) return;

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_url, 60); // 60 secondes

    if (error) {
      setErr(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <>
      <TopNav />
      <div style={{ padding: 20 }}>
        <h1>Documents</h1>

        {err ? <div style={{ color: "crimson", marginBottom: 12 }}>❌ {err}</div> : null}
        {loading ? <div>Chargement...</div> : null}

        <form onSubmit={upload} style={{ display: "grid", gap: 10, maxWidth: 900, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minWidth: 320 }}
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {candidateMap.get(c.id) ?? "Candidat"}
                </option>
              ))}
            </select>

            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as any)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            >
              <option value="CV">CV</option>
              <option value="Rapport">Rapport</option>
              <option value="Fichier IA">Fichier IA</option>
            </select>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />

            <button
              type="submit"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "none",
                background: "#1E40AF",
                color: "white",
                cursor: "pointer",
              }}
            >
              Uploader
            </button>
          </div>
        </form>

        <div style={{ marginTop: 18, display: "grid", gap: 10, maxWidth: 900 }}>
          {docs.map((d) => (
            <div key={d.id} style={{ padding: 12, borderRadius: 12, border: "1px solid #eee" }}>
              <div style={{ fontWeight: 700 }}>
                {candidateMap.get(d.candidate_id) ?? d.candidate_id}
              </div>
              <div style={{ opacity: 0.8 }}>
                Type : <b>{d.file_type ?? "—"}</b>
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                {d.file_url ?? "—"} • {new Date(d.created_at).toLocaleString()}
              </div>

              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => download(d)}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  Télécharger (lien temporaire)
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

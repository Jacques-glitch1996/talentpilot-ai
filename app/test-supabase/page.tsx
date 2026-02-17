"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestSupabase() {
  const [status, setStatus] = useState("Test en cours...");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id")
        .limit(1);

      if (error) {
        setStatus("❌ Erreur Supabase: " + error.message);
      } else {
        setStatus("✅ Supabase connecté. Lignes trouvées: " + (data?.length ?? 0));
      }
    })();
  }, []);

  return <div style={{ padding: 20, fontSize: 18 }}>{status}</div>;
}

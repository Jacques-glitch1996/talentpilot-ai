"use client";

import TopNav from "@/components/TopNav";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? "");
    })();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <TopNav />
      <div style={{ padding: 20 }}>
        <h1>Dashboard</h1>
        <p>
          Connecté : <b>{email || "…"}</b>
        </p>

        <button
          onClick={logout}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          Déconnexion
        </button>
      </div>
    </>
  );
}


import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

type ReqBody = {
  type: string;
  input: string;
  access_token?: string;
};

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const body = (JSON.parse(raw || "{}") as ReqBody);
    const authHeader = req.headers.get("authorization") || "";
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const token = (body.access_token || headerToken || "").trim();

    if (!token) {
    return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    if (!body?.type || !body?.input) {
    return NextResponse.json({ error: "Missing type or input" }, { status: 400 });
    }

    // Supabase client "impersonate user" (RLS + current_org_id() fonctionnent)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Appel Claude (Haiku = option économique)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const model = "claude-haiku-4-5"; // alternative: "claude-3-haiku-20240307"

    const system =
      "Tu es un assistant RH pour recruteurs au Canada/Québec. Style: professionnel, clair, sans jargon inutile. " +
      "Ne fais pas de promesses irréalistes. Donne un résultat immédiatement exploitable.";

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 800,
      system,
      messages: [
        {
          role: "user",
          content: `TYPE: ${body.type}\n\nINPUT:\n${body.input}`,
        },
      ],
    });

    // Extraire texte
    const output =
      msg.content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n\n") || "";

    // Log en DB (RLS: organization_id par DEFAULT current_org_id())
    const { error: logErr } = await supabase.from("ai_logs").insert({
      type: body.type,
      input: body.input,
      output,
    });

    if (logErr) {
      return NextResponse.json({ error: `AI ok but log failed: ${logErr.message}`, output }, { status: 200 });
    }

    return NextResponse.json({ output }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

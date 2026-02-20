import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

type ReqBody = {
  type: string;
  input: string;
};

const LIMIT_PER_HOUR = 100;

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return "";
  return authHeader.slice(7).trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;

    if (!body?.type || !body?.input) {
      return NextResponse.json({ error: "Missing type or input" }, { status: 400 });
    }

    // ✅ Token uniquement via Authorization header
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!supabaseUrl?.startsWith("http")) {
      return NextResponse.json({ error: "Invalid NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    }
    if (!supabaseAnon) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY" }, { status: 500 });
    }

    // Supabase client "impersonate user" -> RLS + current_org_id() OK
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    // Vérifier la session
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized (invalid session)" }, { status: 401 });
    }

    // Rate limit 100/h (par org, car RLS filtre ai_logs sur org)
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabase
      .from("ai_logs")
      .select("*", { head: true, count: "exact" })
      .gte("created_at", since);

    if (countErr) {
      return NextResponse.json({ error: `Rate-limit check failed: ${countErr.message}` }, { status: 500 });
    }

    if ((count ?? 0) >= LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Max ${LIMIT_PER_HOUR} calls per hour.` },
        { status: 429 }
      );
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Modèle économique
    const model = "claude-3-haiku-20240307";

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

    const output =
      msg.content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n\n") || "";

    // Log en DB (organization_id + user_id par DEFAULT + RLS)
    const { error: logErr } = await supabase.from("ai_logs").insert({
      type: body.type,
      input: body.input,
      output,
    });

    if (logErr) {
      // On ne bloque pas l'utilisateur si la génération est OK
      return NextResponse.json({ output, error: `AI ok but log failed: ${logErr.message}` }, { status: 200 });
    }

    return NextResponse.json({ output }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
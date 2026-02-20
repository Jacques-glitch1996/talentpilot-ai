import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

type ReqBody = {
  type: string;
  input: string;
};

const LIMIT_PER_HOUR_PER_USER = 100;
const LIMIT_PER_HOUR_PER_ORG = 500; // filet de sécurité (ajustable)
const MAX_INPUT_CHARS = 8000;

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

    const input = String(body.input ?? "");
    if (input.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        { error: `Input too long. Max ${MAX_INPUT_CHARS} characters.` },
        { status: 413 }
      );
    }

    // Token via Authorization header uniquement
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

    // Supabase "impersonate user" => RLS actif
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    // Vérifier session + récupérer user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized (invalid session)" }, { status: 401 });
    }
    const userId = userData.user.id;

    // Fenêtre 60 minutes
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // 1) Rate-limit par utilisateur
    const { count: userCount, error: userCountErr } = await supabase
      .from("ai_logs")
      .select("*", { head: true, count: "exact" })
      .eq("user_id", userId)
      .gte("created_at", since);

    if (userCountErr) {
      return NextResponse.json({ error: `Rate-limit check failed: ${userCountErr.message}` }, { status: 500 });
    }

    if ((userCount ?? 0) >= LIMIT_PER_HOUR_PER_USER) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Max ${LIMIT_PER_HOUR_PER_USER} calls per hour (per user).` },
        { status: 429 }
      );
    }

    // 2) Filet de sécurité par org (RLS restreint déjà aux lignes de l'org)
    const { count: orgCount, error: orgCountErr } = await supabase
      .from("ai_logs")
      .select("*", { head: true, count: "exact" })
      .gte("created_at", since);

    if (orgCountErr) {
      return NextResponse.json({ error: `Rate-limit check failed: ${orgCountErr.message}` }, { status: 500 });
    }

    if ((orgCount ?? 0) >= LIMIT_PER_HOUR_PER_ORG) {
      return NextResponse.json(
        { error: `Organization rate limit exceeded. Please try again later.` },
        { status: 429 }
      );
    }

    // Appel IA (Claude)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });
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
          content: `TYPE: ${body.type}\n\nINPUT:\n${input}`,
        },
      ],
    });

    const output =
      msg.content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n\n") || "";

    // Log DB (org_id + user_id via DEFAULT + RLS)
    const { error: logErr } = await supabase.from("ai_logs").insert({
      type: body.type,
      input,
      output,
    });

    if (logErr) {
      return NextResponse.json({ output, error: `AI ok but log failed: ${logErr.message}` }, { status: 200 });
    }

    return NextResponse.json({ output }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
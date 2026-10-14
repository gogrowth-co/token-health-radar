/**
 * lifecycle-emails — the welcome series, sent through Resend.
 *
 *   welcome  every new signup, right away
 *   day3     free accounts, 3 to 7 days after signup, unless they opted out
 *   pro      when plan becomes 'pro'
 *
 * A trigger on subscribers POSTs here right after a signup or an upgrade to pro,
 * so those emails go out within seconds. pg_cron also POSTs every 10 minutes as
 * the safety net (retries, day3). Both use x-cron-secret = LIFECYCLE_CRON_SECRET.
 * public.lifecycle_claim() marks due rows 'sending' and returns only the rows this
 * run won, so a trigger run and a cron run never email the same person twice.
 * Rows that existed before launch were backfilled as 'skipped'.
 *
 * POST {"test_to": "...", "key": "welcome|day3|pro"} sends one email to a test
 * address without touching the database.
 * Unsubscribe (ENG-075): only a POST with ?unsub=<user_id>&sig=<hmac> opts a user out of
 * day3. That covers RFC 8058 one-click (List-Unsubscribe-Post) and the button on
 * tokenhealthscan.com/unsubscribe, which the email footer links to. A GET changes
 * nothing: email security scanners open every link in a message, so a GET that
 * unsubscribed would opt people out silently. A GET here redirects to the confirm page.
 * A bad signature gets 403.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://tokenhealthscan.com";
const FROM = "Gabriel from Token Health Scan <team@tokenhealthscan.com>";
const FN_URL = "https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/lifecycle-emails";
const MAX_ATTEMPTS = 3;
// Postal address required in commercial email (CAN-SPAM).
const ADDRESS = "Token Health Scan · Rod. José Carlos Daux, 4150, Florianópolis, CEP 88032-005, Brazil";

type Key = "welcome" | "day3" | "pro";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function isAuthorized(req: Request): boolean {
  const cron = req.headers.get("x-cron-secret");
  if (cron && cron === Deno.env.get("LIFECYCLE_CRON_SECRET")) return true;
  const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  return !!auth && auth === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

async function sign(userId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(Deno.env.get("LIFECYCLE_CRON_SECRET")!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function link(path: string, campaign: Key): string {
  return `${SITE}${path}?utm_source=email&utm_medium=lifecycle&utm_campaign=${campaign}`;
}

// ---- templates (copy approved 2026-10-13: token-health-scan/campaigns/welcome-series/emails.md)

type Block = { p: string } | { list: string[] } | { ol: string[] } | { button: [string, string] };

function render(preview: string, blocks: Block[], extraFooter = ""): { html: string; text: string } {
  const footer = extraFooter ? `${extraFooter}<br>${ADDRESS}` : ADDRESS;
  const html: string[] = [];
  const text: string[] = [];
  for (const b of blocks) {
    if ("p" in b) {
      html.push(`<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1F2937;">${b.p}</p>`);
      text.push(b.p.replace(/<[^>]+>/g, ""));
    } else if ("list" in b || "ol" in b) {
      const items = "list" in b ? b.list : b.ol;
      const tag = "list" in b ? "ul" : "ol";
      html.push(
        `<${tag} style="margin:0 0 16px;padding-left:22px;font-size:16px;line-height:1.6;color:#1F2937;">` +
          items.map((i) => `<li style="margin:0 0 6px;">${i}</li>`).join("") + `</${tag}>`,
      );
      text.push(items.map((i, n) => ("list" in b ? "- " : `${n + 1}. `) + i.replace(/<[^>]+>/g, "")).join("\n"));
    } else {
      const [label, url] = b.button;
      html.push(
        `<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#3B66FF;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:16px;padding:12px 24px;border-radius:8px;">${label}</a></p>`,
      );
      text.push(`${label}: ${url}`);
    }
  }
  const sig = `<p style="margin:24px 0 0;font-size:16px;line-height:1.6;color:#1F2937;">Gabriel<br>Founder, Token Health Scan</p>`;
  const foot = footer
    ? `<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6B7280;">${footer}</p>`
    : "";
  return {
    html: `<div style="display:none;max-height:0;overflow:hidden;">${preview}</div>` +
      `<div style="background:#F4F6FB;padding:32px 16px;font-family:Inter,Helvetica,Arial,sans-serif;">` +
      `<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:32px;">` +
      `<p style="margin:0 0 24px;font-size:15px;font-weight:700;color:#3B66FF;">Token Health Scan</p>` +
      html.join("") + sig + foot + `</div></div>`,
    text: text.join("\n\n") + "\n\nGabriel\nFounder, Token Health Scan" +
      (footer ? "\n\n" + footer.replace(/<br>/g, "\n").replace(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g, "$2: $1").replace(/<[^>]+>/g, "") : ""),
  };
}

async function buildEmail(key: Key, userId: string) {
  if (key === "welcome") {
    return {
      subject: "Your 3 Pro Scans are ready",
      ...render("They don't expire. Here's how to get the most from them.", [
        { p: "Hi," },
        { p: "Thanks for creating a Token Health Scan account." },
        { p: "Your account comes with 3 Pro Scans. They don't expire. A Pro Scan gives you the full report on any token: security, tokenomics, liquidity, community and developer activity. You get one score, plus a ranked list of what to fix." },
        { p: "Here's how to get the most from your first one:" },
        { ol: [
          "Search for a token you hold, or one you plan to buy.",
          "Read the security section first. Mint functions, honeypot flags and whale concentration are where bad tokens show up.",
          "Ask the Copilot on the result page about price, the 7-day trend or the top pools.",
        ] },
        { button: ["Run your first Pro Scan", link("/", "welcome")] },
        { p: "Reply and tell me which token you scanned. I read every reply." },
      ]),
    };
  }
  if (key === "day3") {
    const qs = `unsub=${userId}&sig=${await sign(userId)}`;
    const unsub = `${FN_URL}?${qs}`; // List-Unsubscribe header: mail clients POST here
    const confirmPage = `${SITE}/unsubscribe?${qs}`; // footer link: a page with a button
    return {
      subject: "How I read a token health score",
      unsub,
      ...render("The score is the start. The fix list is the point.", [
        { p: "Hi," },
        { p: "Quick tip on reading your scan." },
        { p: "The score tells you where a token stands. The ranked fix list tells you why. I read it in this order:" },
        { ol: [
          "<strong>Security.</strong> A live mint function or honeypot flag outweighs everything else.",
          "<strong>Liquidity.</strong> Thin liquidity means you can't exit at the price you see.",
          "<strong>Holder distribution.</strong> A few wallets holding most of the supply can move the price at will.",
          "<strong>Community and developer activity.</strong> These show if anyone is still building.",
        ] },
        { p: "You have 3 Pro Scans on your account. When you need more, PRO gives you 10 Pro Scans every month. It's $20 per month, or $120 per year." },
        { button: ["See PRO plans", link("/pricing", "day3")] },
        { p: "If a result confused you, reply and I'll walk you through it." },
      ], `You got this because you created a Token Health Scan account. <a href="${confirmPage}" style="color:#6B7280;">Unsubscribe from tips</a>.`),
    };
  }
  return {
    subject: "PRO is active on your account",
    ...render("10 Pro Scans a month, starting now.", [
      { p: "Hi," },
      { p: "Thank you for upgrading to Token Health Scan PRO. Your plan is active now." },
      { p: "What PRO gives you:" },
      { list: [
        "10 Pro Scans per month, reset at each billing date",
        "Advanced security analysis",
        "Tokenomics, liquidity, community and developer activity checks",
      ] },
      { p: "You can manage or cancel your plan any time from your dashboard." },
      { button: ["Open your dashboard", link("/dashboard", "pro")] },
      { p: "I'd like to know what made you upgrade, and which tokens you track. Reply and tell me. It decides what I build next." },
    ]),
  };
}

async function sendViaResend(to: string, key: Key, userId: string, idempotencyKey?: string) {
  const email = await buildEmail(key, userId);
  const headers: Record<string, string> = {};
  if ("unsub" in email && email.unsub) {
    headers["List-Unsubscribe"] = `<${email.unsub}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  // RESEND_API_KEY is the Lovable Resend connector's connection key, so calls go
  // through Lovable's connector gateway, not straight to api.resend.com.
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": Deno.env.get("RESEND_API_KEY")!,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: "team@tokenhealthscan.com",
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers,
      tags: [{ name: "lifecycle", value: key }],
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body.id as string;
}

function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The confirm page on tokenhealthscan.com calls this with fetch, so POST answers need CORS.
const UNSUB_CORS = {
  "Access-Control-Allow-Origin": SITE,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

async function handleUnsubscribe(req: Request, url: URL): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: UNSUB_CORS });
  const userId = url.searchParams.get("unsub") || "";
  const sig = url.searchParams.get("sig") || "";
  const reply = (msg: string, status: number) =>
    new Response(msg, { status, headers: { ...UNSUB_CORS, "Content-Type": "text/plain; charset=utf-8" } });
  if (!/^[0-9a-f-]{36}$/.test(userId) || !sameHex(sig, await sign(userId))) {
    return reply("This unsubscribe link is not valid.", 403);
  }
  // GET/HEAD never change anything (link scanners prefetch them). Send people to the confirm page.
  if (req.method !== "POST") {
    const qs = new URLSearchParams({ unsub: userId, sig }).toString();
    return new Response(null, { status: 303, headers: { Location: `${SITE}/unsubscribe?${qs}` } });
  }
  const { error } = await supabase.from("subscribers").update({ email_opt_out: true }).eq("id", userId);
  if (error) {
    console.error(`[lifecycle] unsubscribe ${userId} failed: ${error.message}`);
    return reply("Something went wrong. Reply to any email and I'll remove you by hand.", 500);
  }
  return reply("You're unsubscribed from tips. You'll still get emails about your account and billing.", 200);
}

async function runDue(): Promise<Record<string, number>> {
  const counts = { sent: 0, failed: 0 };
  const { data: due, error } = await supabase.rpc("lifecycle_claim", { p_limit: 50 });
  if (error) throw new Error(`lifecycle_claim: ${error.message}`);
  for (const row of due ?? []) {
    const { user_id, email, email_key, attempts } = row as {
      user_id: string; email: string; email_key: Key; attempts: number;
    };
    try {
      const id = await sendViaResend(email, email_key, user_id, `${user_id}-${email_key}`);
      await supabase.from("lifecycle_emails").upsert(
        { user_id, email_key, status: "sent", resend_id: id, attempts: attempts + 1, error: null, sent_at: new Date().toISOString() },
        { onConflict: "user_id,email_key" },
      );
      counts.sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[lifecycle] ${email_key} ${user_id} failed: ${msg}`);
      await supabase.from("lifecycle_emails").upsert(
        { user_id, email_key, status: attempts + 1 >= MAX_ATTEMPTS ? "failed" : "retry", attempts: attempts + 1, error: msg.slice(0, 500) },
        { onConflict: "user_id,email_key" },
      );
      counts.failed++;
    }
    await new Promise((r) => setTimeout(r, 600)); // stay under Resend's 2 requests/second
  }
  return counts;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.has("unsub")) return handleUnsubscribe(req, url);
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    if (body.test_to) {
      const key = (body.key || "welcome") as Key;
      if (!["welcome", "day3", "pro"].includes(key)) throw new Error("bad key");
      // Test sends use a fixed fake user id; its unsubscribe link signs but matches no row.
      const id = await sendViaResend(body.test_to, key, "00000000-0000-0000-0000-000000000000");
      return Response.json({ test: true, key, id });
    }
    const counts = await runDue();
    console.log(`[lifecycle] run: ${JSON.stringify(counts)}`);
    return Response.json(counts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[lifecycle] error: ${msg}`);
    return Response.json({ error: msg }, { status: 500 });
  }
});

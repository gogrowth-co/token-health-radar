// Token Health Scan on Apify. Each token is scored by the Token Health Scan API; a scored result is
// charged once (pay-per-event "token-scan"), a token without enough verified data is returned free.
import { Actor, log } from "apify";

const ENDPOINT = process.env.THS_PARTNER_SCAN_URL || "https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/partner-scan";
const MAX_TOKENS = 100;
const CONCURRENCY = 3;

await Actor.init();
const input = (await Actor.getInput()) ?? {};
const key = process.env.THS_PARTNER_KEY;
if (!key) await Actor.fail("THS_PARTNER_KEY is not configured on this Actor.");

const lines = (input.tokens ?? []).map((t) => String(t).trim()).filter(Boolean);
if (lines.length === 0) await Actor.fail('Add at least one token as chain:address, e.g. "base:0x940181a94a35a4569e4529a3cdfb74e38fd98631".');
if (lines.length > MAX_TOKENS) log.warning(`Scanning the first ${MAX_TOKENS} of ${lines.length} tokens.`);

const jobs = [...new Set(lines)].slice(0, MAX_TOKENS).map((line) => {
  const i = line.indexOf(":");
  return { line, chain: i > 0 ? line.slice(0, i).trim().toLowerCase() : "", address: i > 0 ? line.slice(i + 1).trim() : line };
});

let limitReached = false;
let charged = 0;

async function scan(job) {
  if (limitReached) return;
  const base = { chain: job.chain, address: job.address, input: job.line };
  let res, body;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-partner-key": key },
        body: JSON.stringify({ chain: job.chain, address: job.address }),
        signal: AbortSignal.timeout(90_000),
      });
      body = await res.json().catch(() => ({}));
      if (res.status < 500) break;
    } catch (e) {
      body = { error: e.message };
    }
  }
  const status = res?.status;
  if (status === 200) {
    if (input.includeEvidence === false) delete body.evidence;
    // Charge before handing over the result; stop the run once the user's spending limit is reached.
    const { eventChargeLimitReached } = await Actor.charge({ eventName: "token-scan" });
    charged++;
    await Actor.pushData({ status: "scored", charged: true, ...body, input: job.line });
    if (eventChargeLimitReached) limitReached = true;
    log.info(`${job.line}: ${body.verdict}`);
  } else if (status === 422) {
    await Actor.pushData({ ...base, status: "not_scored", charged: false, verdict: "Not scored: not enough verified data. Not charged.", partial: body.partial ?? null });
    log.info(`${job.line}: not scored (free)`);
  } else if (status === 400) {
    await Actor.pushData({ ...base, status: "invalid_input", charged: false, error: body.error });
    log.warning(`${job.line}: ${body.error}`);
  } else {
    await Actor.pushData({ ...base, status: "failed", charged: false, error: body?.error ?? `HTTP ${status}` });
    log.warning(`${job.line}: scan failed (${body?.error ?? status}), not charged`);
  }
}

const queue = [...jobs];
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
  while (queue.length && !limitReached) await scan(queue.shift());
}));
if (limitReached) log.warning("Your maximum charge for this run was reached; remaining tokens were not scanned.");
await Actor.setStatusMessage(`Scored ${charged} of ${jobs.length} token(s).`);
await Actor.exit();

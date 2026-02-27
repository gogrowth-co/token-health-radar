import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = "https://qaqebpcqespvzbfwawlp.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3ODkxNzEsImV4cCI6MjA2MzM2NTE3MX0.11hoagaFRKXswTNtXTwDM4NDHpPMO5EDEUhyFS3N8v4";
const INTERNAL_API_SECRET = Deno.env.get("INTERNAL_API_SECRET")!;

Deno.test("sync-agent-tokens runs and populates table", async () => {
  console.log("INTERNAL_API_SECRET length:", INTERNAL_API_SECRET?.length ?? "NOT SET");

  const syncRes = await fetch(`${SUPABASE_URL}/functions/v1/sync-agent-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${INTERNAL_API_SECRET}`,
    },
    body: JSON.stringify({}),
  });

  const syncBody = await syncRes.text();
  console.log("Sync Status:", syncRes.status);
  console.log("Sync Response:", syncBody);
  assertEquals(syncRes.status, 200, `Sync failed: ${syncRes.status} - ${syncBody}`);

  const syncData = JSON.parse(syncBody);
  console.log(`Synced: ${syncData.synced}, New: ${syncData.new_tokens}, Errors: ${syncData.errors?.length}`);

  // Query agent_tokens table
  const queryRes = await fetch(
    `${SUPABASE_URL}/rest/v1/agent_tokens?select=coingecko_id,name,current_price_usd,market_cap_usd&order=market_cap_rank.asc&limit=100`,
    {
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
      },
    }
  );

  const queryBody = await queryRes.text();
  const tokens = JSON.parse(queryBody);
  console.log(`Total rows: ${tokens.length}`);

  const withPrice = tokens.filter((t: any) => t.current_price_usd !== null);
  const withoutPrice = tokens.filter((t: any) => t.current_price_usd === null);
  console.log(`With current_price_usd: ${withPrice.length}`);
  console.log(`Without current_price_usd (null): ${withoutPrice.length}`);

  for (const t of tokens.slice(0, 10)) {
    console.log(`  ${t.name} (${t.coingecko_id}): price=$${t.current_price_usd}, mcap=$${t.market_cap_usd}`);
  }
});

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = "https://qaqebpcqespvzbfwawlp.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3ODkxNzEsImV4cCI6MjA2MzM2NTE3MX0.11hoagaFRKXswTNtXTwDM4NDHpPMO5EDEUhyFS3N8v4";

Deno.test("sync-agent-tokens runs and populates table", async () => {
  // Step 1: Invoke the sync function
  const syncRes = await fetch(`${SUPABASE_URL}/functions/v1/sync-agent-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({}),
  });

  const syncBody = await syncRes.text();
  console.log("Sync Status:", syncRes.status);
  console.log("Sync Response:", syncBody);
  assertEquals(syncRes.status, 200, `Sync failed: ${syncRes.status} - ${syncBody}`);

  const syncData = JSON.parse(syncBody);
  console.log(`Synced: ${syncData.synced}, New: ${syncData.new_tokens}, Errors: ${syncData.errors?.length}`);

  // Step 2: Query agent_tokens table
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
  console.log("Query Status:", queryRes.status);
  
  const tokens = JSON.parse(queryBody);
  console.log(`Total rows: ${tokens.length}`);
  
  const withPrice = tokens.filter((t: any) => t.current_price_usd !== null);
  const withoutPrice = tokens.filter((t: any) => t.current_price_usd === null);
  console.log(`With current_price_usd: ${withPrice.length}`);
  console.log(`Without current_price_usd (null): ${withoutPrice.length}`);
  
  // Show first 5
  for (const t of tokens.slice(0, 5)) {
    console.log(`  ${t.name} (${t.coingecko_id}): price=$${t.current_price_usd}, mcap=$${t.market_cap_usd}`);
  }
});

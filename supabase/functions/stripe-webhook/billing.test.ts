import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?dts";
import { getPlanFromPriceId, isThsPrice, planForSubscription } from "./billing.ts";

const MONTHLY = "price_1RQK5tD41aNWIHmd4YspKxDi";
const ANNUAL = "price_1RQK5tD41aNWIHmd1p46UCwl";
const OTHER_PRODUCT = "price_1SDTNsD41aNWIHmdTwjodLDJ"; // R$50/year, not THS

Deno.test("only the two THS PRO prices count as THS", () => {
  assertEquals(isThsPrice(MONTHLY), true);
  assertEquals(isThsPrice(ANNUAL), true);
  assertEquals(isThsPrice(OTHER_PRODUCT), false);
  assertEquals(isThsPrice(undefined), false);
  assertEquals(getPlanFromPriceId(OTHER_PRODUCT), "free");
});

Deno.test("subscription status maps to plan", () => {
  assertEquals(planForSubscription("active", MONTHLY), "pro");
  assertEquals(planForSubscription("trialing", ANNUAL), "pro");
  assertEquals(planForSubscription("past_due", MONTHLY), "pro");
  assertEquals(planForSubscription("canceled", MONTHLY), "free");
  assertEquals(planForSubscription("unpaid", MONTHLY), "free");
  assertEquals(planForSubscription("incomplete_expired", MONTHLY), "free");
});

// Builds a Stripe-Signature header the way Stripe does: HMAC-SHA256 of "t.payload".
async function signHeader(payload: string, secret: string): Promise<string> {
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${t},v1=${hex}`;
}

// Regression: the sync constructEvent throws in Deno on every request.
Deno.test("signed events verify with constructEventAsync in Deno", async () => {
  const stripe = new Stripe("sk_test_dummy", {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });
  const provider = Stripe.createSubtleCryptoProvider();
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed", data: { object: {} } });
  const header = await signHeader(payload, secret);

  const event = await stripe.webhooks.constructEventAsync(payload, header, secret, undefined, provider);
  assertEquals(event.id, "evt_test");

  await assertRejects(() =>
    stripe.webhooks.constructEventAsync(payload, header, "whsec_wrong", undefined, provider)
  );
});

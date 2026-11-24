import { assertEquals, assert } from 'jsr:@std/assert@1';
import { state } from './security-test-fixtures.ts';

Deno.env.set('SUPABASE_URL', 'https://app.supabase.test');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-test');
Deno.env.set('SUPABASE_ANON_KEY', 'public-test');
Deno.env.set('HUBSPOT_API_KEY', 'hubspot-test');
Deno.env.set('STRIPE_SECRET_KEY', 'stripe-test');
const originalServe = Deno.serve;
Deno.serve = ((handler: (request: Request) => Promise<Response>) => { state.handlers.push(handler); }) as typeof Deno.serve;
const handlers: Record<string, (request: Request) => Promise<Response>> = {};
for (const name of ['hubspot-sync', 'generate-token-report', 'regenerate-cms-snapshot', 'scan-report', 'create-checkout', 'customer-portal']) {
  await import(`../${name}/index.ts`);
  const handler = state.handlers.pop();
  if (!handler) throw new Error(`Missing handler: ${name}`);
  handlers[name] = handler;
}
Deno.serve = originalServe;
const request = (body: unknown, token = 'signed-session') => new Request('https://app.test', {
  method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
});

Deno.test('real publishing and snapshot handlers reject ordinary users before reading content', async () => {
  state.role = 'user';
  for (const name of ['hubspot-sync', 'generate-token-report', 'regenerate-cms-snapshot']) {
    state.reads = [];
    const result = await handlers[name](request({ userId: 'known-admin', remove: true, slug: 'test' }));
    assertEquals(result.status, 403);
    assertEquals(state.reads, []);
  }
});
Deno.test('real contact sync retains authenticated admin test access', async () => {
  state.role = 'admin';
  assertEquals((await handlers['hubspot-sync'](request({ test: true }))).status, 200);
});
Deno.test('real contact sync errors never return an internal stack', async () => {
  state.role = 'admin'; state.failQuery = true;
  try {
    const result = await handlers['hubspot-sync'](request({}));
    assertEquals(result.status, 500);
    assertEquals(await result.json(), { error: 'Contact sync failed', success: false });
  } finally { state.failQuery = false; }
});
Deno.test('real snapshot handler rejects traversal even for administrators', async () => {
  state.role = 'admin'; state.reads = [];
  assertEquals((await handlers['regenerate-cms-snapshot'](request({ remove: true, slug: '../../sitemaps' }))).status, 400);
  assertEquals(state.reads, []);
});
Deno.test('real paid report query excludes other users private scans', async () => {
  state.role = 'user'; state.filters = [];
  const result = await handlers['scan-report'](request({ token_address: '0x123', chain_id: '0x1' }));
  assertEquals(result.status, 404);
  assertEquals(state.filters, [['or', 'user_id.eq.11111111-1111-4111-8111-111111111111,and(user_id.is.null,is_anonymous.eq.true)']]);
});
Deno.test('real billing handlers reject foreign return URLs before Stripe operations', async () => {
  state.stripeCalls = 0;
  assertEquals((await handlers['create-checkout'](request({ priceId: 'price-test', successUrl: 'https://evil.test', cancelUrl: 'https://tokenhealthscan.com/pricing' }))).status, 400);
  assertEquals((await handlers['customer-portal'](request({ returnUrl: 'https://evil.test' }))).status, 400);
  assertEquals(state.stripeCalls, 0);
});
Deno.test('real billing handlers retain trusted app returns', async () => {
  assertEquals((await handlers['create-checkout'](request({ priceId: 'price-test', successUrl: 'https://tokenhealthscan.com/dashboard', cancelUrl: 'https://tokenhealthscan.com/pricing' }))).status, 200);
  assertEquals((await handlers['customer-portal'](request({ returnUrl: 'https://tokenhealthscan.com/dashboard' }))).status, 200);
  assert(state.stripeCalls > 0);
});
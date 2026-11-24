// F1 2026-11-23: callers use the new keys from SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS, legacy env only as a fallback.
import { assertEquals } from 'jsr:@std/assert@1';
import { callerToken, newKeyRole, publishableKey, serviceHeaders, serviceKey } from './keys.ts';

Deno.test('new keys win over the legacy env vars', () => {
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'legacy-service');
  Deno.env.set('SUPABASE_ANON_KEY', 'legacy-anon');
  Deno.env.set('SUPABASE_SECRET_KEYS', JSON.stringify({ other: 'sb_secret_b', default: 'sb_secret_a' }));
  Deno.env.set('SUPABASE_PUBLISHABLE_KEYS', JSON.stringify({ default: 'sb_publishable_a' }));
  assertEquals(serviceKey(), 'sb_secret_a');
  assertEquals(publishableKey(), 'sb_publishable_a');
  assertEquals(serviceHeaders({ 'Content-Type': 'application/json' }), { apikey: 'sb_secret_a', Authorization: 'Bearer sb_secret_a', 'Content-Type': 'application/json' });
  assertEquals(newKeyRole('sb_secret_b'), 'service_role');
  assertEquals(newKeyRole('legacy-service'), null);
  assertEquals(newKeyRole(''), null);
});

Deno.test('missing or broken dictionaries fall back to the legacy env vars', () => {
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'legacy-service');
  Deno.env.set('SUPABASE_ANON_KEY', 'legacy-anon');
  Deno.env.delete('SUPABASE_SECRET_KEYS');
  Deno.env.set('SUPABASE_PUBLISHABLE_KEYS', '{not json');
  assertEquals(serviceKey(), 'legacy-service');
  assertEquals(publishableKey(), 'legacy-anon');
});

Deno.test('callerToken reads the Bearer, else the apikey header', () => {
  assertEquals(callerToken(new Request('http://x', { headers: { Authorization: 'Bearer abc', apikey: 'zzz' } })), 'abc');
  assertEquals(callerToken(new Request('http://x', { headers: { apikey: 'sb_secret_a' } })), 'sb_secret_a');
  assertEquals(callerToken(new Request('http://x')), null);
});

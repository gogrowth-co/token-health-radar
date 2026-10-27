// 2026-10-27: a function deployed with verify_jwt = false must not trust a token's decoded payload; a project key counts only when it is
// one of this project's keys or Supabase accepts it.
import { assertEquals } from 'jsr:@std/assert@1';
import { projectKeyRole } from './authGuard.ts';

const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (claims: Record<string, unknown>) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.sig${Math.random().toString(36).slice(2)}`;
Deno.env.set('SUPABASE_URL', 'https://proj.supabase.test');
Deno.env.set('SUPABASE_ANON_KEY', 'anon-key-exact');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_exact');
const later = Math.floor(Date.now() / 1000) + 3600;

Deno.test('the project keys match exactly without a network call', async () => {
  const never = (() => { throw new Error('must not fetch'); }) as unknown as typeof fetch;
  assertEquals(await projectKeyRole('anon-key-exact', never), 'anon');
  assertEquals(await projectKeyRole('sb_secret_exact', never), 'service_role');
});

Deno.test('a forged token is refused: Supabase rejects it on the probe', async () => {
  const probes: string[] = [];
  const reject = (async (url: string) => { probes.push(String(url)); return new Response('no', { status: 401 }); }) as unknown as typeof fetch;
  assertEquals(await projectKeyRole(jwt({ role: 'service_role', exp: later }), reject), null);
  assertEquals(await projectKeyRole(jwt({ role: 'anon', exp: later }), reject), null);
  assertEquals(probes, ['https://proj.supabase.test/auth/v1/admin/users?per_page=1', 'https://proj.supabase.test/auth/v1/settings']);
});

Deno.test('a real legacy key is accepted once Supabase accepts it; expired, unknown roles and non-JWTs never are', async () => {
  const accept = (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
  const never = (() => { throw new Error('must not fetch'); }) as unknown as typeof fetch;
  const legacy = jwt({ role: 'service_role', exp: later });
  assertEquals(await projectKeyRole(legacy, accept), 'service_role');
  assertEquals(await projectKeyRole(legacy, never), 'service_role');   // cached
  assertEquals(await projectKeyRole(jwt({ role: 'anon', exp: 100 }), never), null);
  assertEquals(await projectKeyRole(jwt({ role: 'authenticated', exp: later }), never), null);
  assertEquals(await projectKeyRole('not-a-jwt', never), null);
});

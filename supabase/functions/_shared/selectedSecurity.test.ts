import { assertEquals } from 'jsr:@std/assert@1';
import { adminAccess } from './adminAccess.ts';
import { billingReturnUrl } from './billingReturnUrl.ts';

function client(userId: string | null, admin: boolean) {
  return {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) },
    rpc: async (_name: string, args: Record<string, unknown>): Promise<{ data: boolean; error: unknown }> => {
      assertEquals(args._user_id, userId);
      assertEquals(args._role, 'admin');
      return { data: admin, error: null };
    },
  };
}
const request = (token?: string) => new Request('https://app.test', {
  method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {},
  body: JSON.stringify({ userId: 'known-admin-id', user_id: 'another-account' }),
});

Deno.test('anonymous contact sync and snapshot requests cannot impersonate body accounts', async () => {
  assertEquals(await adminAccess(request(), client(null, false)), { allowed: false, status: 401 });
});
Deno.test('ordinary users cannot publish reports by supplying an administrator identifier', async () => {
  assertEquals(await adminAccess(request('ordinary-session'), client('actual-user', false), async () => null), { allowed: false, status: 403 });
});
Deno.test('authenticated administrators retain publishing and snapshot access', async () => {
  assertEquals(await adminAccess(request('admin-session'), client('verified-admin', true), async () => null), { allowed: true, via: 'admin', userId: 'verified-admin' });
});
Deno.test('verified service credentials retain automation access', async () => {
  assertEquals(await adminAccess(request('service-key'), client(null, false), async () => 'service_role'), { allowed: true, via: 'service' });
});
Deno.test('public project keys cannot authorize privileged actions', async () => {
  assertEquals(await adminAccess(request('public-key'), client(null, false), async () => 'anon'), { allowed: false, status: 401 });
});
Deno.test('role lookup failure denies privileged access', async () => {
  const db = client('verified-admin', true);
  db.rpc = async () => ({ data: true, error: new Error('unavailable') });
  assertEquals(await adminAccess(request('admin-session'), db, async () => null), { allowed: false, status: 403 });
});
Deno.test('checkout success and cancellation stay on the app', () => {
  assertEquals(billingReturnUrl('https://tokenhealthscan.com/dashboard?subscription=success'), 'https://tokenhealthscan.com/dashboard?subscription=success');
  assertEquals(billingReturnUrl('https://tokenhealthscan.com/pricing?subscription=canceled'), 'https://tokenhealthscan.com/pricing?subscription=canceled');
  assertEquals(billingReturnUrl('https://phishing.test/checkout'), null);
});
Deno.test('billing portal returns cannot trust unrelated hosted apps or disguised origins', () => {
  for (const value of ['https://evil.lovable.app/dashboard', 'https://tokenhealthscan.com.evil.test', 'https://tokenhealthscan.com@evil.test', 'https://evil@tokenhealthscan.com/dashboard', 'http://tokenhealthscan.com', 'javascript:alert(1)', '//evil.test', 'https://tokenhealthscan.com:444/dashboard']) {
    assertEquals(billingReturnUrl(value), null);
  }
});
Deno.test('this project preview retains billing return support', () => {
  const url = 'https://id-preview--77bad5d3-4413-4c36-8c05-5c134751e1f5.lovable.app/dashboard';
  assertEquals(billingReturnUrl(url), url);
});
// In-memory dependencies for exercising real handlers without paid operations.
export const state = {
  handlers: [] as Array<(request: Request) => Promise<Response>>,
  filters: [] as Array<[string, unknown]>,
  reads: [] as string[],
  role: 'user',
  failQuery: false,
  stripeCalls: 0,
};
export const serve = (handler: (request: Request) => Promise<Response>) => { state.handlers.push(handler); };
export function createClient() {
  return {
    auth: { getUser: async (token: string) => ({ data: { user: token === 'signed-session' ? { id: '11111111-1111-4111-8111-111111111111', email: 'private@example.test' } : null }, error: null }) },
    rpc: async (name: string) => ({ data: name === 'has_role' ? state.role === 'admin' : state.role, error: null }),
    from: (table: string) => {
      state.reads.push(table);
      const q = {
        select: () => q, eq: () => q, in: () => q, not: () => q,
        order: () => q, limit: () => q,
        or: (filter: string) => { state.filters.push(['or', filter]); return q; },
        maybeSingle: async () => ({ data: { plan: 'pro' }, error: null }),
        single: async () => ({ data: { stripe_customer_id: 'customer-test' }, error: null }),
        then: (resolve: (result: unknown) => unknown, reject: (error: Error) => unknown) => {
          if (state.failQuery) return Promise.reject(new Error('private internal stack')).then(resolve, reject);
          return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        },
      };
      return q;
    },
  };
}
export default class Stripe {
  static createFetchHttpClient() { return {}; }
  customers = { create: async () => { state.stripeCalls++; return { id: 'customer-test' }; } };
  prices = { retrieve: async () => ({}) };
  checkout = { sessions: { create: async () => { state.stripeCalls++; return { url: 'https://checkout.stripe.com/test' }; } } };
  billingPortal = { sessions: { create: async () => { state.stripeCalls++; return { url: 'https://billing.stripe.com/test' }; } } };
}
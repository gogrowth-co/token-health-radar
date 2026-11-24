import { projectKeyRole } from './authGuard.ts';
import { callerToken } from './keys.ts';

type AdminClient = {
  auth: { getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

export function safeSecretEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** No caller-supplied user identifier can authorize a privileged action. */
export async function adminAccess(req: Request, db: AdminClient, keyRole = projectKeyRole): Promise<
  { allowed: true; via: 'service' | 'admin'; userId?: string } | { allowed: false; status: number }
> {
  const token = callerToken(req);
  if (!token) return { allowed: false, status: 401 };
  if (await keyRole(token) === 'service_role') return { allowed: true, via: 'service' };
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return { allowed: false, status: 401 };
  const role = await db.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  if (role.error || role.data !== true) return { allowed: false, status: 403 };
  return { allowed: true, via: 'admin', userId: user.id };
}

/**
 * Authorize privileged generators, webhook senders, and test endpoints via:
 * - x-internal-secret matching INTERNAL_API_SECRET
 * - x-cron-secret matching CRON_SECRET (or optional extra cron env var)
 * - verified service_role bearer key or verified admin user session
 */
export async function privilegedAccess(
  req: Request,
  db: AdminClient,
  options: { keyRole?: typeof projectKeyRole; cronEnvNames?: string[] } = {},
): Promise<
  { allowed: true; via: 'service' | 'admin' | 'internal' | 'cron'; userId?: string } | { allowed: false; status: number }
> {
  const internalSecret = Deno.env.get('INTERNAL_API_SECRET') ?? '';
  const providedInternal = req.headers.get('x-internal-secret') ?? '';
  if (internalSecret && safeSecretEqual(providedInternal, internalSecret)) {
    return { allowed: true, via: 'internal' };
  }

  const providedCron = req.headers.get('x-cron-secret') ?? '';
  if (providedCron) {
    const envNames = options.cronEnvNames ?? ['CRON_SECRET'];
    for (const envName of envNames) {
      const expected = Deno.env.get(envName) ?? '';
      if (expected && safeSecretEqual(providedCron, expected)) {
        return { allowed: true, via: 'cron' };
      }
    }
  }

  return await adminAccess(req, db, options.keyRole ?? projectKeyRole);
}
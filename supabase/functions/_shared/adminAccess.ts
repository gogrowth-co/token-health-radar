import { projectKeyRole } from './authGuard.ts';

type AdminClient = {
  auth: { getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

/** No caller-supplied user identifier can authorize a privileged action. */
export async function adminAccess(req: Request, db: AdminClient, keyRole = projectKeyRole): Promise<
  { allowed: true; via: 'service' | 'admin'; userId?: string } | { allowed: false; status: number }
> {
  const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { allowed: false, status: 401 };
  if (await keyRole(token) === 'service_role') return { allowed: true, via: 'service' };
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return { allowed: false, status: 401 };
  const role = await db.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  if (role.error || role.data !== true) return { allowed: false, status: 403 };
  return { allowed: true, via: 'admin', userId: user.id };
}
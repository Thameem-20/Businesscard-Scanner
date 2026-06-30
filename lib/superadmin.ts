import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function getSuperAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if ((session.user as { role?: string }).role !== 'superadmin') return null;
  return session;
}

export async function requireSuperAdmin() {
  const session = await getSuperAdminSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { queryOne } from './db';
import { getAuthBaseUrl } from './auth-url';
import { isMfaEnabled } from './settings';
import { verifyLoginOtp } from './mfa';

const authBaseUrl = getAuthBaseUrl();

export type DbUser = {
  id: number;
  email: string;
  name: string;
  password: string;
  role: string;
  organization_id: number | null;
  is_active: boolean | number | null;
};

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  return queryOne<DbUser>(
    'SELECT * FROM users WHERE email = ?',
    [email.trim()]
  );
}

export async function verifyUserPassword(user: DbUser, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password);
}

async function authorizeUser(
  credentials: { email?: string; password?: string; otp?: string } | undefined,
  options?: { requireSuperAdmin?: boolean }
) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const user = await findUserByEmail(credentials.email);

  if (!user) {
    return null;
  }

  if (options?.requireSuperAdmin && user.role !== 'superadmin') {
    return null;
  }

  if (user.is_active === false || user.is_active === 0) {
    throw new Error('Your account has been deactivated. Please contact an administrator.');
  }

  const isValidPassword = await verifyUserPassword(user, credentials.password);
  if (!isValidPassword) {
    return null;
  }

  const skipMfa = options?.requireSuperAdmin || user.role === 'superadmin';
  if (!skipMfa && (await isMfaEnabled())) {
    const otpOk = await verifyLoginOtp(user.email, credentials.otp || '');
    if (!otpOk) {
      throw new Error('A valid email verification code is required.');
    }
  }

  return {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organization_id ?? null,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  ...(authBaseUrl ? { url: authBaseUrl } : {}),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        return authorizeUser(credentials);
      },
    }),
    CredentialsProvider({
      id: 'superadmin',
      name: 'SuperAdmin',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        return authorizeUser(credentials, { requireSuperAdmin: true });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};

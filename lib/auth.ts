import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { queryOne } from './db';
import { getAuthBaseUrl } from './auth-url';

const authBaseUrl = getAuthBaseUrl();

type DbUser = {
  id: number;
  email: string;
  name: string;
  password: string;
  role: string;
  organization_id: number | null;
  is_active: boolean | number | null;
};

async function authorizeUser(
  credentials: { email: string; password: string } | undefined,
  options?: { requireSuperAdmin?: boolean }
) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const user = await queryOne<DbUser>(
    'SELECT * FROM users WHERE email = ?',
    [credentials.email]
  );

  if (!user) {
    return null;
  }

  if (options?.requireSuperAdmin && user.role !== 'superadmin') {
    return null;
  }

  if (user.is_active === false || user.is_active === 0) {
    throw new Error('Your account has been deactivated. Please contact an administrator.');
  }

  const isValidPassword = await bcrypt.compare(
    credentials.password,
    user.password
  );

  if (!isValidPassword) {
    return null;
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


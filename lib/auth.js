import bcrypt from "bcryptjs";
import CredentialsProviderModule from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import db, { ensureDatabase, sanitizeUser } from "./db.js";

ensureDatabase();

const CredentialsProvider =
  CredentialsProviderModule.default || CredentialsProviderModule;

export function getDashboardPath(role) {
  return role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
}

export const authOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: {
          label: "Email",
          type: "email"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error("Email and password are required.");
        }

        const user = db
          .prepare(`
            SELECT id, full_name, email, password_hash, role, is_active
            FROM users
            WHERE email = ?
          `)
          .get(email);

        if (!user) {
          throw new Error("Invalid email or password.");
        }

        if (!user.is_active) {
          throw new Error("This account is inactive. Contact your admin.");
        }

        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
          throw new Error("Invalid email or password.");
        }

        const safeUser = sanitizeUser(user);

        return {
          id: String(safeUser.id),
          name: safeUser.full_name,
          email: safeUser.email,
          role: safeUser.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
      }

      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = Number(token.id);
        session.user.role = token.role;
        session.user.name = token.name || session.user.name;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (url.startsWith(baseUrl)) {
        return url;
      }

      return baseUrl;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

export async function requireSession(requiredRole) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      response: NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      )
    };
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return {
      response: NextResponse.json(
        { message: "You do not have access to this resource." },
        { status: 403 }
      )
    };
  }

  return { session };
}

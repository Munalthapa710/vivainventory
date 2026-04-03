import bcrypt from "bcryptjs";
import { queryOne, withTransaction } from "./db.js";

export const defaultAccounts = {
  admin: {
    fullName: "VivaInventory Admin",
    email: "admin@vivainventory.com",
    password: "admin123",
    role: "admin"
  },
  employee: {
    fullName: "Rakesh Site Supervisor",
    email: "employee@vivainventory.com",
    password: "employee123",
    role: "employee"
  }
};

async function upsertDefaultAccount(account, client, resetPassword) {
  if (!resetPassword) {
    const existing = await queryOne(
      `
        SELECT id, full_name, email
        FROM users
        WHERE email = $1
      `,
      [account.email],
      client
    );

    if (existing) {
      return existing;
    }
  }

  return queryOne(
    `
      INSERT INTO users (
        full_name,
        email,
        password_hash,
        role,
        is_active,
        created_at
      )
      VALUES ($1, $2, $3, $4, TRUE, NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = CASE
          WHEN $5 THEN EXCLUDED.password_hash
          ELSE users.password_hash
        END,
        role = EXCLUDED.role,
        is_active = TRUE
      RETURNING id, full_name, email
    `,
    [
      account.fullName,
      account.email,
      bcrypt.hashSync(account.password, 10),
      account.role,
      resetPassword
    ],
    client
  );
}

export async function ensureDefaultAccounts(options = {}) {
  const { resetPassword = false } = options;

  return withTransaction(async (client) => {
    const admin = await upsertDefaultAccount(
      defaultAccounts.admin,
      client,
      resetPassword
    );
    const employee = await upsertDefaultAccount(
      defaultAccounts.employee,
      client,
      resetPassword
    );

    return {
      admin,
      employee
    };
  });
}

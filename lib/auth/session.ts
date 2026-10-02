import { cookies } from "next/headers";
import * as crypto from "crypto";
import { db } from "../db";
import * as schema from "../db/schema";
import { eq, and, gt } from "drizzle-orm";

export const SESSION_COOKIE_NAME = "hinglish_session";
export const SESSION_MAX_AGE_DAYS = 30;

export async function createSession(
  userId: string,
  drizzleDb: any = db
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  );

  await drizzleDb.insert(schema.sessions).values({
    id: token,
    userId,
    expiresAt,
  });

  return token;
}

export async function validateSessionToken(
  token: string,
  drizzleDb: any = db
): Promise<{
  user: schema.User | null;
  session: schema.Session | null;
}> {
  if (!token) return { user: null, session: null };

  const [res] = await drizzleDb
    .select({
      session: schema.sessions,
      user: schema.users,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(
      and(
        eq(schema.sessions.id, token),
        gt(schema.sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!res) {
    return { user: null, session: null };
  }

  return { user: res.user, session: res.session };
}

export async function getCurrentUser(): Promise<schema.User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const { user } = await validateSessionToken(token);
  return user;
}

export async function requireUser(): Promise<schema.User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireCustomer(): Promise<schema.User> {
  const user = await requireUser();
  if (user.role !== "customer") {
    throw new Error("FORBIDDEN_NOT_CUSTOMER");
  }
  return user;
}

export async function requireShopkeeper(): Promise<{
  user: schema.User;
  shop: schema.Shop;
}> {
  const user = await requireUser();
  if (user.role !== "shopkeeper") {
    throw new Error("FORBIDDEN_NOT_SHOPKEEPER");
  }

  const [shop] = await db
    .select()
    .from(schema.shops)
    .where(eq(schema.shops.ownerId, user.id))
    .limit(1);

  if (!shop) {
    throw new Error("SHOP_NOT_FOUND");
  }

  return { user, shop };
}

export async function invalidateSession(
  token: string,
  drizzleDb: any = db
): Promise<void> {
  if (token) {
    await drizzleDb.delete(schema.sessions).where(eq(schema.sessions.id, token));
  }
}

export async function deleteUserAccount(
  userId: string,
  drizzleDb: any = db
): Promise<void> {
  // Real cascade deletion of user and all related data
  await drizzleDb.delete(schema.users).where(eq(schema.users.id, userId));
}

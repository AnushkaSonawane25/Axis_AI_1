import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../lib/db/schema";
import { hashPassword, verifyPassword } from "../../lib/auth/password";
import { createSession, validateSessionToken, deleteUserAccount } from "../../lib/auth/session";
import { eq } from "drizzle-orm";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5434/hinglish_orders_test";

const testPool = new Pool({ connectionString: TEST_DB_URL });
const testDb = drizzle(testPool, { schema });

describe("Integration Tests: Auth & Account Lifecycle (Real Postgres)", () => {
  const testCustomerEmail = `test-cust-${Date.now()}@example.com`;
  let customerId = "";
  let sessionToken = "";

  afterAll(async () => {
    if (customerId) {
      await testDb.delete(schema.users).where(eq(schema.users.id, customerId));
    }
    await testPool.end();
  });

  it("hashes password with minimum 8 chars requirement", async () => {
    await expect(hashPassword("short")).rejects.toThrow();
    const hash = await hashPassword("SecurePass2026!");
    expect(hash).toBeTruthy();
    expect(await verifyPassword("SecurePass2026!", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("registers a customer in database with accepted terms version and timestamp", async () => {
    const passwordHash = await hashPassword("TestCustomer@2026");
    const [user] = await testDb
      .insert(schema.users)
      .values({
        name: "Test Customer One",
        email: testCustomerEmail,
        passwordHash,
        role: "customer",
        phone: "+91 99999 88888",
        acceptedTermsVersion: "1.0",
        acceptedTermsAt: new Date(),
      })
      .returning();

    expect(user.id).toBeTruthy();
    expect(user.email).toBe(testCustomerEmail);
    expect(user.role).toBe("customer");
    expect(user.acceptedTermsVersion).toBe("1.0");
    expect(user.acceptedTermsAt).toBeInstanceOf(Date);
    customerId = user.id;
  });

  it("creates and validates server-side session in database", async () => {
    // Generate session token
    sessionToken = await createSession(customerId, testDb);
    expect(sessionToken).toBeTruthy();

    const { user, session } = await validateSessionToken(sessionToken, testDb);
    expect(session).toBeTruthy();
    expect(user).toBeTruthy();
    expect(user?.id).toBe(customerId);
    expect(user?.email).toBe(testCustomerEmail);
  });

  it("performs real hard cascade deletion of user and sessions", async () => {
    await deleteUserAccount(customerId, testDb);

    // Verify user is gone
    const [user] = await testDb
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, customerId));
    expect(user).toBeUndefined();

    // Verify session was cascaded
    const { session } = await validateSessionToken(sessionToken, testDb);
    expect(session).toBeNull();

    customerId = "";
  });
});

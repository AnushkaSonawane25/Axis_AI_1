import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../lib/db/schema";
import { hashPassword } from "../../lib/auth/password";
import { eq, and } from "drizzle-orm";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5434/hinglish_orders_test";

const testPool = new Pool({ connectionString: TEST_DB_URL });
const testDb = drizzle(testPool, { schema });

describe("Integration Tests: Role & Tenant Isolation (Real Postgres)", () => {
  let customerAId: string;
  let customerBId: string;
  let shopkeeperAId: string;
  let shopkeeperBId: string;
  let shopAId: string;
  let shopBId: string;
  let orderAId: string;
  let productAId: string;

  beforeAll(async () => {
    const dummyHash = await hashPassword("IsolationPass123!");

    // 1. Create Customer A & Customer B
    const [custA] = await testDb
      .insert(schema.users)
      .values({
        name: "Customer A",
        email: `custA-${Date.now()}@example.com`,
        passwordHash: dummyHash,
        role: "customer",
      })
      .returning();
    customerAId = custA.id;

    const [custB] = await testDb
      .insert(schema.users)
      .values({
        name: "Customer B",
        email: `custB-${Date.now()}@example.com`,
        passwordHash: dummyHash,
        role: "customer",
      })
      .returning();
    customerBId = custB.id;

    // 2. Create Shopkeeper A & Shopkeeper B
    const [shopkeeperA] = await testDb
      .insert(schema.users)
      .values({
        name: "Shopkeeper A",
        email: `shopA-${Date.now()}@example.com`,
        passwordHash: dummyHash,
        role: "shopkeeper",
      })
      .returning();
    shopkeeperAId = shopkeeperA.id;

    const [shopkeeperB] = await testDb
      .insert(schema.users)
      .values({
        name: "Shopkeeper B",
        email: `shopB-${Date.now()}@example.com`,
        passwordHash: dummyHash,
        role: "shopkeeper",
      })
      .returning();
    shopkeeperBId = shopkeeperB.id;

    // 3. Create Shop A & Shop B
    const [shopA] = await testDb
      .insert(schema.shops)
      .values({
        ownerId: shopkeeperAId,
        name: "Shop A",
        slug: `shop-a-${Date.now()}`,
      })
      .returning();
    shopAId = shopA.id;

    const [shopB] = await testDb
      .insert(schema.shops)
      .values({
        ownerId: shopkeeperBId,
        name: "Shop B",
        slug: `shop-b-${Date.now()}`,
      })
      .returning();
    shopBId = shopB.id;

    // 4. Create Product in Shop A
    const [prodA] = await testDb
      .insert(schema.products)
      .values({
        shopId: shopAId,
        name: "Shop A Exclusive Atta",
        packSize: "5 kg",
        unit: "kg",
        pricePaise: 23000,
        stockQty: "10.00",
      })
      .returning();
    productAId = prodA.id;

    // 5. Customer A places Order in Shop A
    const [orderA] = await testDb
      .insert(schema.orders)
      .values({
        shopId: shopAId,
        customerId: customerAId,
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        status: "confirmed",
        subtotalPaise: 23000,
        totalPaise: 23000,
      })
      .returning();
    orderAId = orderA.id;
  });

  afterAll(async () => {
    await testDb.delete(schema.users).where(eq(schema.users.id, customerAId));
    await testDb.delete(schema.users).where(eq(schema.users.id, customerBId));
    await testDb.delete(schema.users).where(eq(schema.users.id, shopkeeperAId));
    await testDb.delete(schema.users).where(eq(schema.users.id, shopkeeperBId));
    await testPool.end();
  });

  it("Customer B CANNOT view Customer A's orders in queries", async () => {
    // Query orders for Customer B
    const customerBOrders = await testDb
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.customerId, customerBId));

    expect(customerBOrders.length).toBe(0);
    expect(customerBOrders.some((o) => o.id === orderAId)).toBe(false);

    // Direct attempt to read Customer A's order with Customer B's filter
    const unauthorizedQuery = await testDb
      .select()
      .from(schema.orders)
      .where(
        and(eq(schema.orders.id, orderAId), eq(schema.orders.customerId, customerBId))
      );
    expect(unauthorizedQuery.length).toBe(0);
  });

  it("Shopkeeper B CANNOT view or access Shop A's catalog", async () => {
    // Query catalog for Shop B
    const shopBProducts = await testDb
      .select()
      .from(schema.products)
      .where(eq(schema.products.shopId, shopBId));

    expect(shopBProducts.length).toBe(0);
    expect(shopBProducts.some((p) => p.id === productAId)).toBe(false);

    // Attempt to access Product A through Shop B's tenant filter
    const unauthorizedProd = await testDb
      .select()
      .from(schema.products)
      .where(
        and(eq(schema.products.id, productAId), eq(schema.products.shopId, shopBId))
      );
    expect(unauthorizedProd.length).toBe(0);
  });

  it("Shopkeeper B CANNOT access Shop A's orders", async () => {
    const shopBOrders = await testDb
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.shopId, shopBId));

    expect(shopBOrders.length).toBe(0);

    const unauthorizedOrder = await testDb
      .select()
      .from(schema.orders)
      .where(
        and(eq(schema.orders.id, orderAId), eq(schema.orders.shopId, shopBId))
      );
    expect(unauthorizedOrder.length).toBe(0);
  });
});

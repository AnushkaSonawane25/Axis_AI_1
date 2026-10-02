import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../lib/db/schema";
import { hashPassword } from "../../lib/auth/password";
import { calculateLineTotal } from "../../lib/money";
import { eq } from "drizzle-orm";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5434/hinglish_orders_test";

const testPool = new Pool({ connectionString: TEST_DB_URL, max: 10 });
const testDb = drizzle(testPool, { schema });

describe("Integration Tests: Confirm Transaction & Concurrency (Real Postgres)", () => {
  let userId: string;
  let shopId: string;

  beforeAll(async () => {
    const dummyHash = await hashPassword("TxPassword123!");

    const [user] = await testDb
      .insert(schema.users)
      .values({
        name: "Tx Test Customer",
        email: `tx-cust-${Date.now()}@example.com`,
        passwordHash: dummyHash,
        role: "customer",
      })
      .returning();
    userId = user.id;

    const [shopkeeper] = await testDb
      .insert(schema.users)
      .values({
        name: "Tx Shopkeeper",
        email: `tx-shop-${Date.now()}@example.com`,
        passwordHash: dummyHash,
        role: "shopkeeper",
      })
      .returning();

    const [shop] = await testDb
      .insert(schema.shops)
      .values({
        ownerId: shopkeeper.id,
        name: "Concurrency Test Shop",
        slug: `concurrency-shop-${Date.now()}`,
      })
      .returning();
    shopId = shop.id;
  });

  afterAll(async () => {
    await testDb.delete(schema.users).where(eq(schema.users.id, userId));
    await testPool.end();
  });

  // Reusable confirmation helper simulating the atomic server confirm route
  async function confirmOrderTransaction(orderId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const client = await testPool.connect();
    try {
      await client.query("BEGIN");

      // 1. Lock order
      const orderRes = await client.query(
        `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      );
      if (orderRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Order not found" };
      }
      const order = orderRes.rows[0];

      // 2. Lock items
      const itemsRes = await client.query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [orderId]
      );
      const items = itemsRes.rows;

      // 3. Lock products and check stock
      for (const item of items) {
        const prodRes = await client.query(
          `SELECT * FROM products WHERE id = $1 FOR UPDATE`,
          [item.product_id]
        );
        const product = prodRes.rows[0];
        const stock = parseFloat(product.stock_qty);
        const qty = parseFloat(item.quantity);

        if (stock < qty) {
          // Stock insufficient: send back to clarification
          await client.query(
            `UPDATE orders SET status = 'needs_clarification' WHERE id = $1`,
            [orderId]
          );
          await client.query("COMMIT");
          return { success: false, error: "INSUFFICIENT_STOCK" };
        }

        // Decrement stock
        const newStock = stock - qty;
        await client.query(
          `UPDATE products SET stock_qty = $1 WHERE id = $2`,
          [newStock.toFixed(2), product.id]
        );

        // Snapshot price into order_items
        const lineTotal = calculateLineTotal(qty, product.price_paise);
        await client.query(
          `UPDATE order_items 
           SET product_name_snapshot = $1,
               brand_snapshot = $2,
               pack_size_snapshot = $3,
               unit_price_paise_snapshot = $4,
               line_total_paise = $5,
               match_status = 'MATCHED'
           WHERE id = $6`,
          [
            product.name,
            product.brand,
            product.pack_size,
            product.price_paise,
            lineTotal,
            item.id,
          ]
        );
      }

      await client.query(
        `UPDATE orders SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1`,
        [orderId]
      );
      await client.query("COMMIT");
      return { success: true };
    } catch (e: any) {
      await client.query("ROLLBACK");
      return { success: false, error: e.message };
    } finally {
      client.release();
    }
  }

  it("atomically confirms an order, decrements stock, and snapshots prices", async () => {
    // 1. Create product with stock 5
    const [product] = await testDb
      .insert(schema.products)
      .values({
        shopId,
        name: "Basmati Rice Rozzana",
        brand: "India Gate",
        category: "Flours & Grains",
        packSize: "1 kg",
        unit: "kg",
        pricePaise: 9500,
        stockQty: "5.00",
      })
      .returning();

    // 2. Create order requesting 2 kg
    const [order] = await testDb
      .insert(schema.orders)
      .values({
        shopId,
        customerId: userId,
        orderNumber: `ORD-TX-${Date.now().toString().slice(-4)}`,
        status: "ready_to_confirm",
      })
      .returning();

    const [item] = await testDb
      .insert(schema.orderItems)
      .values({
        orderId: order.id,
        productId: product.id,
        rawText: "2 kg chawal",
        quantity: "2.00",
        matchStatus: "MATCHED",
      })
      .returning();

    // 3. Confirm order
    const result = await confirmOrderTransaction(order.id);
    expect(result.success).toBe(true);

    // 4. Verify product stock decremented from 5 to 3
    const [updatedProd] = await testDb
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, product.id));
    expect(parseFloat(updatedProd.stockQty)).toBe(3.0);

    // 5. Verify order item snapshot
    const [updatedItem] = await testDb
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.id, item.id));
    expect(updatedItem.productNameSnapshot).toBe("Basmati Rice Rozzana");
    expect(updatedItem.brandSnapshot).toBe("India Gate");
    expect(updatedItem.unitPricePaiseSnapshot).toBe(9500);
    expect(updatedItem.lineTotalPaise).toBe(19000); // 2 * 9500

    // 6. Verify order status
    const [updatedOrder] = await testDb
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order.id));
    expect(updatedOrder.status).toBe("confirmed");
    expect(updatedOrder.confirmedAt).toBeTruthy();
  });

  it("handles concurrent confirms competing for the last unit of stock", async () => {
    // 1. Create a product with ONLY 1 unit of stock
    const [limitedProduct] = await testDb
      .insert(schema.products)
      .values({
        shopId,
        name: "Rare Pure Ghee",
        brand: "Amul",
        category: "Dairy",
        packSize: "1 L",
        unit: "l",
        pricePaise: 65000,
        stockQty: "1.00", // Exactly 1 unit!
      })
      .returning();

    // 2. Order A requests 1 unit
    const [orderA] = await testDb
      .insert(schema.orders)
      .values({
        shopId,
        customerId: userId,
        orderNumber: `ORD-CONCUR-A-${Date.now().toString().slice(-4)}`,
        status: "ready_to_confirm",
      })
      .returning();

    await testDb.insert(schema.orderItems).values({
      orderId: orderA.id,
      productId: limitedProduct.id,
      rawText: "1 L amul ghee",
      quantity: "1.00",
      matchStatus: "MATCHED",
    });

    // 3. Order B requests 1 unit
    const [orderB] = await testDb
      .insert(schema.orders)
      .values({
        shopId,
        customerId: userId,
        orderNumber: `ORD-CONCUR-B-${Date.now().toString().slice(-4)}`,
        status: "ready_to_confirm",
      })
      .returning();

    await testDb.insert(schema.orderItems).values({
      orderId: orderB.id,
      productId: limitedProduct.id,
      rawText: "1 L amul ghee",
      quantity: "1.00",
      matchStatus: "MATCHED",
    });

    // 4. Execute both confirmations concurrently
    const [resultA, resultB] = await Promise.all([
      confirmOrderTransaction(orderA.id),
      confirmOrderTransaction(orderB.id),
    ]);

    // Exactly one should succeed, and one should fail due to stock depletion
    const successes = [resultA, resultB].filter((r) => r.success);
    const failures = [resultA, resultB].filter((r) => !r.success);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(failures[0].error).toBe("INSUFFICIENT_STOCK");

    // 5. Verify final product stock is exactly 0.00 and NEVER negative
    const [finalProduct] = await testDb
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, limitedProduct.id));

    expect(parseFloat(finalProduct.stockQty)).toBe(0.0);
  });
});

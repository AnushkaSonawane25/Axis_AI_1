import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["customer", "shopkeeper"] }).notNull(),
  phone: text("phone"),
  address: text("address"),
  acceptedTermsVersion: text("accepted_terms_version").notNull().default("1.0"),
  acceptedTermsAt: timestamp("accepted_terms_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // session token
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    phone: text("phone"),
    address: text("address"),
    deliveryNotes: text("delivery_notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("shops_owner_id_idx").on(table.ownerId),
    uniqueIndex("shops_slug_idx").on(table.slug),
  ]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    category: text("category").notNull().default("General"),
    packSize: text("pack_size").notNull(), // e.g. "1 kg", "500 g", "1 L", "100 g"
    unit: text("unit").notNull(), // "kg", "g", "l", "ml", "pack", "pcs", "dozen"
    pricePaise: integer("price_paise").notNull(), // Integer paise, e.g. 5200 = ₹52.00
    stockQty: numeric("stock_qty", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("products_shop_id_idx").on(table.shopId),
    index("products_name_trgm_idx").using(
      "gin",
      sql`${table.name} gin_trgm_ops`
    ),
  ]
);

export const productAliases = pgTable(
  "product_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(), // e.g. "cheeni", "shakkar", "refined oil"
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("product_aliases_product_id_idx").on(table.productId),
    index("product_aliases_alias_trgm_idx").using(
      "gin",
      sql`${table.alias} gin_trgm_ops`
    ),
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderNumber: text("order_number").notNull(),
    status: text("status", {
      enum: [
        "needs_clarification",
        "ready_to_confirm",
        "confirmed",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
    })
      .notNull()
      .default("needs_clarification"),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    deliveryAddress: text("delivery_address"),
    deliveryTimeText: text("delivery_time_text"),
    specialInstructions: text("special_instructions"),
    subtotalPaise: integer("subtotal_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull().default(0),
    idempotencyKey: text("idempotency_key").unique(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("orders_shop_id_idx").on(table.shopId),
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_status_idx").on(table.status),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    rawText: text("raw_text").notNull(), // original mention from message
    // Snapshots taken at confirmation time to ensure past bills never alter
    productNameSnapshot: text("product_name_snapshot"),
    brandSnapshot: text("brand_snapshot"),
    packSizeSnapshot: text("pack_size_snapshot"),
    unitPricePaiseSnapshot: integer("unit_price_paise_snapshot"),
    quantity: numeric("quantity", { precision: 10, scale: 2 })
      .notNull()
      .default("1"),
    lineTotalPaise: integer("line_total_paise").notNull().default(0),
    matchStatus: text("match_status", {
      enum: [
        "MATCHED",
        "AMBIGUOUS",
        "OUT_OF_STOCK",
        "INSUFFICIENT_STOCK",
        "NOT_FOUND",
      ],
    }).notNull(),
    matchMetadata: jsonb("match_metadata"), // candidates, scores, vague qty flag, alternative options
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_product_id_idx").on(table.productId),
  ]
);

export const orderMessages = pgTable(
  "order_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    senderRole: text("sender_role", {
      enum: ["customer", "system", "shopkeeper"],
    }).notNull(),
    messageText: text("message_text").notNull(),
    suggestedReplies: jsonb("suggested_replies"), // array of quick answer chips for customer
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("order_messages_order_id_idx").on(table.orderId)]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id"),
    userId: uuid("user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_log_shop_id_idx").on(table.shopId),
    index("audit_log_user_id_idx").on(table.userId),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductAlias = typeof productAliases.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderMessage = typeof orderMessages.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;

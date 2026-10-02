import Link from "next/link";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireShopkeeper } from "@/lib/auth/session";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { formatPaise } from "@/lib/money";
import {
  ShoppingBag,
  HelpCircle,
  Clock,
  CheckCircle2,
  Truck,
  ArrowRight,
  Store,
  Package,
} from "lucide-react";
import { eq, sql, desc } from "drizzle-orm";

export default async function ShopkeeperDashboardPage() {
  const { user, shop } = await requireShopkeeper();

  // Fetch real counts from DB
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      needsClarification: sql<number>`count(*) filter (where ${schema.orders.status} = 'needs_clarification')::int`,
      readyToConfirm: sql<number>`count(*) filter (where ${schema.orders.status} = 'ready_to_confirm')::int`,
      confirmed: sql<number>`count(*) filter (where ${schema.orders.status} = 'confirmed')::int`,
      outForDelivery: sql<number>`count(*) filter (where ${schema.orders.status} = 'out_for_delivery')::int`,
      delivered: sql<number>`count(*) filter (where ${schema.orders.status} = 'delivered')::int`,
    })
    .from(schema.orders)
    .where(eq(schema.orders.shopId, shop.id));

  // Catalog count
  const [catalogCountRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.products)
    .where(eq(schema.products.shopId, shop.id));

  const catalogCount = catalogCountRes?.count || 0;

  // Recent 5 orders
  const recentOrders = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.shopId, shop.id))
    .orderBy(desc(schema.orders.createdAt))
    .limit(5);

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="border border-[#e7e0d6] bg-white rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c2410c] uppercase tracking-wider">
            <Store className="w-4 h-4" />
            <span>Counter Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-[#18181b] mt-1">{shop.name}</h1>
          <p className="text-xs text-[#71717a] mt-0.5">
            Public Order Link:{" "}
            <Link
              href={`/s/${shop.slug}`}
              target="_blank"
              className="text-[#c2410c] font-mono hover:underline"
            >
              /s/{shop.slug}
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/catalog"
            className="px-3.5 py-2 rounded-md border border-[#e7e0d6] bg-[#faf8f5] hover:bg-[#f4f0eb] text-xs font-semibold text-[#18181b] flex items-center gap-1.5 transition"
          >
            <Package className="w-4 h-4 text-[#71717a]" />
            <span>Manage Catalog ({catalogCount})</span>
          </Link>
          <Link
            href="/dashboard/orders"
            className="px-4 py-2 rounded-md bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>View All Orders</span>
          </Link>
        </div>
      </div>

      {/* Real Orders Summary Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717a] mb-3">
          Orders Status (Real Database Counts)
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900">
                Needs Clarification
              </span>
              <HelpCircle className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-2xl font-bold text-amber-950 mt-2">
              {counts?.needsClarification || 0}
            </div>
            <span className="text-[11px] text-amber-800 block mt-1">
              Waiting for customer
            </span>
          </div>

          <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900">
                Ready to Confirm
              </span>
              <Clock className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-2xl font-bold text-blue-950 mt-2">
              {counts?.readyToConfirm || 0}
            </div>
            <span className="text-[11px] text-blue-800 block mt-1">
              Items resolved
            </span>
          </div>

          <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-900">
                Confirmed
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-bold text-emerald-950 mt-2">
              {counts?.confirmed || 0}
            </div>
            <span className="text-[11px] text-emerald-800 block mt-1">
              Ready for packing
            </span>
          </div>

          <div className="border border-purple-200 bg-purple-50/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-900">
                Out for Delivery
              </span>
              <Truck className="w-4 h-4 text-purple-700" />
            </div>
            <div className="text-2xl font-bold text-purple-950 mt-2">
              {counts?.outForDelivery || 0}
            </div>
            <span className="text-[11px] text-purple-800 block mt-1">
              On the road
            </span>
          </div>

          <div className="border border-[#e7e0d6] bg-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#52525b]">Delivered</span>
              <span className="w-2 h-2 rounded-full bg-stone-400" />
            </div>
            <div className="text-2xl font-bold text-[#18181b] mt-2">
              {counts?.delivered || 0}
            </div>
            <span className="text-[11px] text-[#71717a] block mt-1">Completed</span>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="border border-[#e7e0d6] bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 bg-[#f4f0eb] border-b border-[#e7e0d6] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#18181b]">Recent Incoming Orders</h3>
            <span className="text-xs text-[#71717a]">
              Showing up to 5 most recent orders
            </span>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs font-semibold text-[#c2410c] hover:underline flex items-center gap-1"
          >
            <span>See all orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#71717a]">
            No orders received yet. Share your shop link{" "}
            <code className="text-[#c2410c]">/s/{shop.slug}</code> with your customers.
          </div>
        ) : (
          <div className="divide-y divide-[#e7e0d6]">
            {recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#18181b]">
                      #{ord.orderNumber}
                    </span>
                    <OrderStatusBadge status={ord.status} />
                  </div>
                  <div className="text-[#71717a] flex flex-wrap gap-x-4">
                    <span>Customer: {ord.customerName || "Customer"}</span>
                    {ord.deliveryTimeText && (
                      <span>Time: {ord.deliveryTimeText}</span>
                    )}
                    <span>
                      {new Date(ord.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="font-bold text-sm text-[#18181b]">
                    {ord.totalPaise > 0 ? formatPaise(ord.totalPaise) : "—"}
                  </span>
                  <Link
                    href={`/dashboard/orders/${ord.id}`}
                    className="px-3 py-1.5 rounded-md border border-[#e7e0d6] hover:bg-[#faf8f5] text-xs font-semibold text-[#18181b] transition"
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

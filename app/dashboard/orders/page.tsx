import Link from "next/link";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireShopkeeper } from "@/lib/auth/session";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { formatPaise } from "@/lib/money";
import { ShoppingBag, ArrowRight, Calendar, Filter } from "lucide-react";
import { eq, and, desc } from "drizzle-orm";

export default async function ShopkeeperOrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { shop } = await requireShopkeeper();
  const { status: filterStatus } = await searchParams;

  const validStatuses = [
    "needs_clarification",
    "ready_to_confirm",
    "confirmed",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];

  const whereClause =
    filterStatus && validStatuses.includes(filterStatus)
      ? and(
          eq(schema.orders.shopId, shop.id),
          eq(schema.orders.status, filterStatus as any)
        )
      : eq(schema.orders.shopId, shop.id);

  const ordersList = await db
    .select()
    .from(schema.orders)
    .where(whereClause)
    .orderBy(desc(schema.orders.createdAt));

  const filterTabs = [
    { label: "All", value: "" },
    { label: "Needs Clarification", value: "needs_clarification" },
    { label: "Ready to Confirm", value: "ready_to_confirm" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Out for Delivery", value: "out_for_delivery" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b] tracking-tight">
          Incoming Orders
        </h1>
        <p className="text-xs text-[#71717a] mt-0.5">
          Review casual customer orders, send clarifications, and update statuses.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#f4f0eb] rounded-lg border border-[#e7e0d6] text-xs">
        {filterTabs.map((tab) => {
          const isActive = (filterStatus || "") === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/dashboard/orders?status=${tab.value}` : "/dashboard/orders"}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                isActive
                  ? "bg-white text-[#18181b] font-semibold shadow-sm border border-[#e7e0d6]"
                  : "text-[#71717a] hover:text-[#18181b]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="border border-[#e7e0d6] bg-white rounded-lg overflow-hidden shadow-sm">
        {ordersList.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#71717a]">
            <ShoppingBag className="w-8 h-8 text-[#a1a1aa] mx-auto mb-2" />
            <p className="font-semibold text-[#18181b] text-sm">No orders found</p>
            <p className="mt-1 text-[#71717a]">
              {filterStatus
                ? `No orders matching status "${filterStatus.replace(/_/g, " ")}".`
                : "No orders have been received yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e7e0d6]">
            {ordersList.map((order) => (
              <div
                key={order.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-[#faf8f5] transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-[#18181b]">
                      #{order.orderNumber}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="text-[#71717a] flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-medium text-[#18181b]">
                      Customer: {order.customerName || "Customer"}
                    </span>
                    {order.customerPhone && <span>Phone: {order.customerPhone}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#a1a1aa]" />
                      <span>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    {order.deliveryTimeText && (
                      <span className="text-[#c2410c] font-medium">
                        Requested: {order.deliveryTimeText}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-[#f4f0eb]">
                  <div className="text-right">
                    <span className="text-[11px] text-[#71717a] block">Total Bill</span>
                    <span className="font-bold text-sm text-[#c2410c]">
                      {order.totalPaise > 0 ? formatPaise(order.totalPaise) : "Pending"}
                    </span>
                  </div>

                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="px-3.5 py-2 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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

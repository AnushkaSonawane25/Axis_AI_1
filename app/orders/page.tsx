import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { formatPaise } from "@/lib/money";
import { ShoppingBag, ArrowRight, Store, Calendar } from "lucide-react";
import { eq, desc } from "drizzle-orm";

export default async function CustomerOrdersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/orders");
  }

  if (user.role !== "customer") {
    redirect("/dashboard/orders");
  }

  // Fetch customer's orders with shop details
  const ordersList = await db
    .select({
      order: schema.orders,
      shop: schema.shops,
    })
    .from(schema.orders)
    .innerJoin(schema.shops, eq(schema.orders.shopId, schema.shops.id))
    .where(eq(schema.orders.customerId, user.id))
    .orderBy(desc(schema.orders.createdAt));

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#18181b] tracking-tight">
              My Orders
            </h1>
            <p className="mt-1 text-sm text-[#71717a]">
              View your order intake history, status, and printable bills.
            </p>
          </div>
          <Link
            href="/shops"
            className="px-4 py-2 rounded-md bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <span>Order from a Shop</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {ordersList.length === 0 ? (
          <div className="p-12 text-center border border-[#e7e0d6] rounded-lg bg-white">
            <ShoppingBag className="w-10 h-10 text-[#a1a1aa] mx-auto mb-3" />
            <h3 className="font-semibold text-base text-[#18181b]">
              No orders placed yet
            </h3>
            <p className="text-sm text-[#71717a] mt-1 mb-6">
              You haven&apos;t placed any orders yet. Pick a local shop to get started.
            </p>
            <Link
              href="/shops"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#c2410c] text-white text-xs font-semibold hover:bg-[#9a3412] transition"
            >
              Browse Shop Directory
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ordersList.map(({ order, shop }) => (
              <div
                key={order.id}
                className="border border-[#e7e0d6] rounded-lg bg-white p-5 shadow-sm hover:border-[#c2410c] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[#18181b]">
                      #{order.orderNumber}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="text-xs text-[#52525b] flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-[#a1a1aa]" />
                      <span className="font-medium text-[#18181b]">{shop.name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#a1a1aa]" />
                      <span>{new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}</span>
                    </span>
                    {order.deliveryTimeText && (
                      <span className="text-[#c2410c] font-medium">
                        Timing: {order.deliveryTimeText}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#f4f0eb]">
                  <div className="text-right">
                    <span className="text-[11px] text-[#71717a] block">Total Amount</span>
                    <span className="text-base font-bold text-[#c2410c]">
                      {order.totalPaise > 0 ? formatPaise(order.totalPaise) : "Pending"}
                    </span>
                  </div>

                  <Link
                    href={`/orders/${order.id}`}
                    className="px-3.5 py-2 rounded-md border border-[#e7e0d6] hover:bg-[#faf8f5] text-xs font-semibold text-[#18181b] flex items-center gap-1.5 transition"
                  >
                    <span>View Bill</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

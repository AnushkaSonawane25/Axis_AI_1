import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { OrderStatusBadge, MatchStatusBadge } from "@/components/StatusBadge";
import { formatPaise } from "@/lib/money";
import { PrintButton } from "@/components/PrintButton";
import { Store, MapPin, Phone, Calendar, ArrowLeft, Clock, FileText } from "lucide-react";
import { eq, and } from "drizzle-orm";

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirect=/orders/${orderId}`);
  }

  // Fetch order and verify authorization
  const [orderRecord] = await db
    .select({
      order: schema.orders,
      shop: schema.shops,
    })
    .from(schema.orders)
    .innerJoin(schema.shops, eq(schema.orders.shopId, schema.shops.id))
    .where(eq(schema.orders.id, orderId))
    .limit(1);

  if (!orderRecord) {
    notFound();
  }

  const { order, shop } = orderRecord;

  // Authorization check: customer sees only their own order
  if (user.role === "customer" && order.customerId !== user.id) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar user={user} />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-rose-700">Access Denied</h1>
          <p className="text-sm text-[#71717a] mt-2">
            You are not authorized to view this order.
          </p>
          <Link
            href="/orders"
            className="mt-4 inline-block px-4 py-2 rounded bg-[#c2410c] text-white text-xs font-semibold"
          >
            Back to My Orders
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  // Fetch order items
  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, order.id));

  // Fetch conversation messages
  const messages = await db
    .select()
    .from(schema.orderMessages)
    .where(eq(schema.orderMessages.orderId, order.id))
    .orderBy(schema.orderMessages.createdAt);

  return (
    <div className="flex flex-col min-h-screen bg-[#faf8f5]">
      <div className="no-print">
        <Navbar user={user} />
      </div>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full print-page">
        {/* Navigation & Action Bar */}
        <div className="no-print flex items-center justify-between mb-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#71717a] hover:text-[#18181b] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </Link>

          <div className="flex items-center gap-3">
            <PrintButton />
            <Link
              href={`/s/${shop.slug}`}
              className="px-3 py-1.5 rounded-md border border-[#e7e0d6] bg-white hover:bg-[#faf8f5] text-xs font-medium transition"
            >
              Order Desk
            </Link>
          </div>
        </div>

        {/* Printable Order Bill and Delivery Note Sheet */}
        <div className="bg-white border border-[#e7e0d6] rounded-lg p-6 sm:p-8 shadow-sm space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#e7e0d6]">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#c2410c]" />
                <h1 className="text-xl font-bold text-[#18181b]">{shop.name}</h1>
              </div>
              <p className="text-xs text-[#52525b] mt-1 max-w-sm">
                {shop.address || "Local Kirana Store"}
              </p>
              {shop.phone && (
                <p className="text-xs text-[#52525b] mt-0.5">Phone: {shop.phone}</p>
              )}
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="text-xs font-mono font-bold text-[#18181b] bg-[#f4f0eb] px-2.5 py-1 rounded">
                Order #{order.orderNumber}
              </span>
              <div className="pt-1">
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-xs text-[#71717a]">
                Date:{" "}
                {new Date(order.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Delivery Note Box */}
          <div className="rounded-md border border-[#e7e0d6] bg-[#faf8f5] p-4 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[#18181b] text-sm mb-2">
              <FileText className="w-4 h-4 text-[#c2410c]" />
              <span>Counter Delivery Note</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[#71717a] block text-[11px]">Customer:</span>
                <span className="font-semibold text-[#18181b]">
                  {order.customerName || user.name}
                </span>
                {order.customerPhone && (
                  <span className="block text-[#52525b]">{order.customerPhone}</span>
                )}
                {order.deliveryAddress && (
                  <span className="block text-[#52525b] mt-1">
                    {order.deliveryAddress}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[#71717a] block text-[11px]">Requested Timing:</span>
                <span className="font-semibold text-[#18181b]">
                  {order.deliveryTimeText || "Standard store delivery"}
                </span>

                {order.specialInstructions && (
                  <div className="mt-2">
                    <span className="text-[#71717a] block text-[11px]">
                      Special Instructions:
                    </span>
                    <span className="text-[#52525b]">{order.specialInstructions}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Bill Table */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717a] mb-3">
              Itemized Counter Bill
            </h2>
            <div className="border border-[#e7e0d6] rounded-md overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f4f0eb] border-b border-[#e7e0d6] text-[#71717a] uppercase font-semibold">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Item Details</th>
                    <th className="p-3">Pack</th>
                    <th className="p-3">Rate</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e0d6]">
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="p-3 text-[#71717a]">{idx + 1}</td>
                      <td className="p-3">
                        <span className="font-bold text-[#18181b] block">
                          {item.productNameSnapshot || item.rawText}
                        </span>
                        <span className="text-[11px] text-[#71717a]">
                          Original: &ldquo;{item.rawText}&rdquo;
                        </span>
                      </td>
                      <td className="p-3 text-[#52525b]">
                        {item.packSizeSnapshot || "—"}
                      </td>
                      <td className="p-3 text-[#52525b]">
                        {item.unitPricePaiseSnapshot
                          ? formatPaise(item.unitPricePaiseSnapshot)
                          : "—"}
                      </td>
                      <td className="p-3 text-center font-semibold text-[#18181b]">
                        {item.quantity}
                      </td>
                      <td className="p-3 text-right font-bold text-[#18181b]">
                        {item.matchStatus === "MATCHED"
                          ? formatPaise(item.lineTotalPaise)
                          : "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#faf8f5] border-t-2 border-[#18181b]">
                  <tr>
                    <td colSpan={5} className="p-3 font-bold text-sm text-[#18181b]">
                      Grand Total
                    </td>
                    <td className="p-3 text-right font-bold text-base text-[#c2410c]">
                      {formatPaise(order.totalPaise)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Conversation History (no-print) */}
          <div className="no-print pt-6 border-t border-[#e7e0d6] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717a]">
              Conversation Log
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-md text-xs leading-relaxed ${
                    m.senderRole === "customer"
                      ? "bg-[#faf8f5] border border-[#e7e0d6] text-[#18181b]"
                      : m.senderRole === "shopkeeper"
                      ? "bg-[#f4f0eb] border border-[#e7e0d6] text-[#18181b]"
                      : "bg-[#fff7ed] border border-[#fed7aa] text-[#9a3412]"
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1">
                    {m.senderRole === "customer"
                      ? "Customer"
                      : m.senderRole === "shopkeeper"
                      ? "Shopkeeper"
                      : "System"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.messageText}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
}

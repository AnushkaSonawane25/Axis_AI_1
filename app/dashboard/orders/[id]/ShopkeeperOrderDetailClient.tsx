"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { OrderStatusBadge, MatchStatusBadge } from "@/components/StatusBadge";
import { PrintButton } from "@/components/PrintButton";
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  FileText,
  Edit2,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
} from "lucide-react";

interface Props {
  initialOrder: any;
  initialItems: any[];
  initialMessages: any[];
  shop: any;
  catalog: any[];
}

export function ShopkeeperOrderDetailClient({
  initialOrder,
  initialItems,
  initialMessages,
  shop,
  catalog,
}: Props) {
  const [order, setOrder] = useState(initialOrder);
  const [items, setItems] = useState(initialItems);
  const [messages, setMessages] = useState(initialMessages);

  const [overrideModalItem, setOverrideModalItem] = useState<any | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [overrideQty, setOverrideQty] = useState(1);
  const [overrideLoading, setOverrideLoading] = useState(false);

  const [statusLoading, setStatusLoading] = useState(false);
  const [clarifyReply, setClarifyReply] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Update order status
  const handleUpdateStatus = async (newStatus: string) => {
    setStatusLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setOrder(data.order);
      setFeedbackMsg(`Order status updated to "${newStatus.replace(/_/g, " ")}"`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setStatusLoading(false);
    }
  };

  // Submit manual item override
  const handleSaveOverride = async () => {
    if (!overrideModalItem) return;
    setOverrideLoading(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: overrideModalItem.id,
          productId: selectedProductId || undefined,
          quantity: overrideQty,
          action: "update",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to override item");

      setOrder(data.order);
      setItems(data.items);
      setOverrideModalItem(null);
      setFeedbackMsg("Item match and quantity updated successfully.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setOverrideLoading(false);
    }
  };

  // Drop item
  const handleDropItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to remove this item from the order?")) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          action: "drop",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to drop item");
      setOrder(data.order);
      setItems(data.items);
      setFeedbackMsg("Item removed from order.");
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Send clarification on customer's behalf
  const handleSendClarify = async () => {
    if (!clarifyReply.trim()) return;
    setReplyLoading(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText: clarifyReply }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit clarification");

      setOrder(data.order);
      setItems(data.order.items);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          senderRole: "shopkeeper",
          messageText: clarifyReply,
        },
      ]);
      setClarifyReply("");
      setFeedbackMsg("Clarification applied to order items.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#71717a] hover:text-[#18181b] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </Link>

        <div className="flex items-center gap-3">
          <PrintButton />
        </div>
      </div>

      {feedbackMsg && (
        <div className="no-print p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
          {feedbackMsg}
        </div>
      )}

      {/* Main Order Content Card */}
      <div className="bg-white border border-[#e7e0d6] rounded-lg p-6 sm:p-8 shadow-sm space-y-6 print-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#e7e0d6]">
          <div>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#c2410c]" />
              <h1 className="text-xl font-bold text-[#18181b]">{shop.name}</h1>
            </div>
            <p className="text-xs text-[#52525b] mt-1">{shop.address}</p>
          </div>

          <div className="text-left sm:text-right space-y-2">
            <span className="text-xs font-mono font-bold text-[#18181b] bg-[#f4f0eb] px-2.5 py-1 rounded inline-block">
              Order #{order.orderNumber}
            </span>
            <div>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
        </div>

        {/* Status Update Control (no-print) */}
        <div className="no-print p-4 rounded-md bg-[#faf8f5] border border-[#e7e0d6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-[#18181b] block">Update Order Status:</span>
            <span className="text-[#71717a]">
              Move order through packing, delivery, or cancellation.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={order.status}
              disabled={statusLoading}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-[#e7e0d6] bg-white text-xs font-medium focus:border-[#c2410c] focus:ring-0"
            >
              <option value="needs_clarification">Needs Clarification</option>
              <option value="ready_to_confirm">Ready to Confirm</option>
              <option value="confirmed">Confirmed</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Counter Delivery Note Box */}
        <div className="rounded-md border border-[#e7e0d6] bg-[#faf8f5] p-4 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-[#18181b] text-sm mb-2">
            <FileText className="w-4 h-4 text-[#c2410c]" />
            <span>Delivery & Customer Details</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[#71717a] block text-[11px]">Customer:</span>
              <span className="font-semibold text-[#18181b]">
                {order.customerName || "Customer"}
              </span>
              {order.customerPhone && (
                <span className="block text-[#52525b]">{order.customerPhone}</span>
              )}
              {order.deliveryAddress && (
                <span className="block text-[#52525b] mt-1">{order.deliveryAddress}</span>
              )}
            </div>

            <div>
              <span className="text-[#71717a] block text-[11px]">Requested Timing:</span>
              <span className="font-semibold text-[#18181b]">
                {order.deliveryTimeText || "Standard"}
              </span>
              {order.specialInstructions && (
                <div className="mt-2">
                  <span className="text-[#71717a] block text-[11px]">Special Notes:</span>
                  <span className="text-[#52525b]">{order.specialInstructions}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Parsed Items List with Overrides */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717a]">
              Itemized Counter Bill ({items.length} items)
            </h2>
          </div>

          <div className="border border-[#e7e0d6] rounded-md overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f4f0eb] border-b border-[#e7e0d6] text-[#71717a] uppercase font-semibold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Item Details</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Pack</th>
                  <th className="p-3">Rate</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right no-print">Actions</th>
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
                        Mentioned: &ldquo;{item.rawText}&rdquo;
                      </span>
                    </td>
                    <td className="p-3">
                      <MatchStatusBadge status={item.matchStatus} />
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
                        : "—"}
                    </td>
                    <td className="p-3 text-right no-print">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setOverrideModalItem(item);
                            setSelectedProductId(item.productId || "");
                            setOverrideQty(parseFloat(item.quantity) || 1);
                          }}
                          className="p-1 text-[#71717a] hover:text-[#c2410c] rounded"
                          title="Override Match or Quantity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDropItem(item.id)}
                          className="p-1 text-[#71717a] hover:text-rose-600 rounded"
                          title="Remove Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#faf8f5] border-t-2 border-[#18181b]">
                <tr>
                  <td colSpan={6} className="p-3 font-bold text-sm text-[#18181b]">
                    Grand Total
                  </td>
                  <td className="p-3 text-right font-bold text-base text-[#c2410c]">
                    {formatPaise(order.totalPaise)}
                  </td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Conversation Thread & Clarification Reply (no-print) */}
        <div className="no-print pt-6 border-t border-[#e7e0d6] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717a]">
            Customer Conversation Thread
          </h3>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-md text-xs leading-relaxed ${
                  m.senderRole === "customer"
                    ? "bg-[#fff7ed] border border-[#fed7aa] text-[#9a3412]"
                    : m.senderRole === "shopkeeper"
                    ? "bg-[#faf8f5] border border-[#e7e0d6] text-[#18181b]"
                    : "bg-[#f4f0eb] border border-[#e7e0d6] text-[#52525b]"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1">
                  {m.senderRole === "customer"
                    ? "Customer Message"
                    : m.senderRole === "shopkeeper"
                    ? "Shopkeeper"
                    : "System"}
                </div>
                <div className="whitespace-pre-wrap">{m.messageText}</div>
              </div>
            ))}
          </div>

          {/* Shopkeeper Reply on Customer's Behalf */}
          <div className="p-3 bg-[#faf8f5] rounded-md border border-[#e7e0d6] space-y-2">
            <label className="block text-xs font-semibold text-[#18181b]">
              Resolve or send clarification on customer&apos;s behalf:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={clarifyReply}
                onChange={(e) => setClarifyReply(e.target.value)}
                placeholder="e.g. sunflower 1L, ya tel rehne do..."
                className="flex-1 px-3 py-2 text-xs border border-[#e7e0d6] rounded-md bg-white focus:border-[#c2410c] focus:ring-0"
              />
              <button
                onClick={handleSendClarify}
                disabled={replyLoading || !clarifyReply.trim()}
                className="px-3.5 py-2 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Override Modal */}
      {overrideModalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-[#e7e0d6] space-y-4">
            <h3 className="font-bold text-base text-[#18181b]">
              Override Item Match / Quantity
            </h3>
            <p className="text-xs text-[#71717a]">
              Customer mention: &ldquo;{overrideModalItem.rawText}&rdquo;
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#18181b] mb-1">
                  Assign Catalog Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-white focus:border-[#c2410c] focus:ring-0"
                >
                  <option value="">-- Select Product from Catalog --</option>
                  {catalog.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.packSize}) — {formatPaise(prod.pricePaise)} (Stock:{" "}
                      {prod.stockQty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#18181b] mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={overrideQty}
                  onChange={(e) => setOverrideQty(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-white focus:border-[#c2410c] focus:ring-0"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e7e0d6]">
              <button
                type="button"
                onClick={() => setOverrideModalItem(null)}
                className="px-3 py-1.5 text-xs border border-[#e7e0d6] rounded-md hover:bg-[#faf8f5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                disabled={overrideLoading}
                className="px-4 py-1.5 text-xs font-semibold bg-[#c2410c] hover:bg-[#9a3412] text-white rounded-md transition disabled:opacity-50"
              >
                {overrideLoading ? "Saving..." : "Apply Override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

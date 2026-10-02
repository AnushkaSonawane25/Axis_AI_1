"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { MatchStatusBadge, OrderStatusBadge } from "@/components/StatusBadge";
import {
  Store,
  MapPin,
  Phone,
  Send,
  CheckCircle2,
  Clock,
  Printer,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface OrderDeskClientProps {
  shop: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    address: string | null;
    deliveryNotes: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: "customer" | "shopkeeper";
    phone?: string | null;
    address?: string | null;
  } | null;
}

interface OrderItemState {
  id: string;
  rawText: string;
  productNameSnapshot: string | null;
  brandSnapshot: string | null;
  packSizeSnapshot: string | null;
  unitPricePaiseSnapshot: number | null;
  quantity: string;
  lineTotalPaise: number;
  matchStatus: string;
  matchMetadata?: any;
}

interface OrderState {
  id: string;
  orderNumber: string;
  status: string;
  subtotalPaise: number;
  totalPaise: number;
  deliveryTimeText: string | null;
  specialInstructions: string | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  items: OrderItemState[];
  clarificationMessage: string | null;
  suggestedReplies: string[];
}

export function OrderDeskClient({ shop, user }: OrderDeskClientProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeOrder, setActiveOrder] = useState<OrderState | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "customer" | "system" | "shopkeeper"; text: string }>
  >([]);
  const [replyText, setReplyText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || "");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");

  const sampleMessages = [
    "bhaiya 2 kilo atta, ek Amul butter aur sugar half kilo, tel bhi chahiye, kal subah tak bhej dena",
    "1 packet amul milk, 1kg toor dal, 250g tata tea",
    "thoda zyada cheeni aur 5kg basmati chawal",
    "1L saffola oil aur tata namak",
  ];

  const handleSendOrder = async (orderText: string) => {
    const textToSend = orderText.trim();
    if (!textToSend) return;

    if (!user) {
      setError("Please log in with a customer account to place an order.");
      return;
    }

    if (user.role !== "customer") {
      setError("Shopkeeper accounts cannot place customer orders.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopSlug: shop.slug,
          message: textToSend,
          customerName: user.name,
          customerPhone: user.phone || undefined,
          deliveryAddress: deliveryAddress || user.address || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not parse order message");
      }

      const ord = data.order;
      setActiveOrder(ord);

      const msgs: Array<{ sender: "customer" | "system" | "shopkeeper"; text: string }> = [
        { sender: "customer", text: textToSend },
      ];

      if (ord.clarificationMessage) {
        msgs.push({ sender: "system", text: ord.clarificationMessage });
      }

      setChatMessages(msgs);
      setMessage("");
      if (ord.deliveryTimeText) {
        setDeliveryTime(ord.deliveryTimeText);
      }
      if (ord.specialInstructions) {
        setSpecialNotes(ord.specialInstructions);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (answer: string) => {
    const ans = answer.trim();
    if (!ans || !activeOrder) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText: ans }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process reply");
      }

      const updated = data.order;
      setActiveOrder(updated);

      setChatMessages((prev) => [
        ...prev,
        { sender: "customer", text: ans },
        ...(updated.clarificationMessage
          ? [{ sender: "system" as const, text: updated.clarificationMessage }]
          : []),
      ]);

      setReplyText("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!activeOrder) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: `confirm-${activeOrder.id}-${Date.now()}`,
          deliveryAddress,
          deliveryTimeText: deliveryTime,
          specialInstructions: specialNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Stock changed concurrently, sent back to clarification
          setError("Stock changed for some items. Please review the updated options.");
          // Refresh order
          setActiveOrder((prev) => (prev ? { ...prev, status: "needs_clarification" } : null));
          return;
        }
        throw new Error(data.error || "Failed to confirm order");
      }

      setActiveOrder((prev) =>
        prev
          ? {
              ...prev,
              ...data.order,
              status: "confirmed",
            }
          : null
      );

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "system",
          text: "Aapka order confirm ho chuka hai! Shopkeeper ko notification bhej di gayi hai.",
        },
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleReset = () => {
    setActiveOrder(null);
    setChatMessages([]);
    setMessage("");
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Shop Header Banner */}
      <div className="border border-[#e7e0d6] bg-white rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#c2410c]" />
              <h1 className="text-xl font-bold text-[#18181b]">{shop.name}</h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#52525b]">
              {shop.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  <span>{shop.address}</span>
                </span>
              )}
              {shop.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  <span>{shop.phone}</span>
                </span>
              )}
            </div>
          </div>

          {activeOrder && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[#71717a]">
                Order #{activeOrder.orderNumber}
              </span>
              <OrderStatusBadge status={activeOrder.status} />
              <button
                onClick={handleReset}
                className="px-2.5 py-1 text-xs border border-[#e7e0d6] rounded hover:bg-[#faf8f5] text-[#52525b] flex items-center gap-1 transition"
                title="Start a new order"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Order</span>
              </button>
            </div>
          )}
        </div>

        {shop.deliveryNotes && (
          <div className="mt-3 pt-3 border-t border-[#f4f0eb] text-xs text-[#71717a]">
            <span className="font-semibold text-[#18181b]">Delivery Info: </span>
            {shop.deliveryNotes}
          </div>
        )}
      </div>

      {/* Guest / Non-Customer Warning */}
      {!user && (
        <div className="p-4 bg-[#fff7ed] border border-[#fed7aa] rounded-md text-xs text-[#9a3412] flex items-center justify-between">
          <span>You need to log in as a customer to submit and confirm orders.</span>
          <div className="flex gap-2">
            <Link
              href={`/login?redirect=/s/${shop.slug}`}
              className="font-semibold text-[#c2410c] hover:underline"
            >
              Log In
            </Link>
            <span>•</span>
            <Link
              href={`/signup?role=customer&redirect=/s/${shop.slug}`}
              className="font-semibold text-[#c2410c] hover:underline"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Order Desk Interaction Area */}
      {!activeOrder ? (
        /* Order Input Screen */
        <div className="border border-[#e7e0d6] bg-white rounded-lg p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#18181b]">
              Send your grocery list in casual Hinglish
            </h2>
            <p className="text-xs text-[#71717a] mt-1">
              Type or paste items in Hindi or English (e.g. &ldquo;2 kilo atta, adha kilo cheeni aur tel, kal subah bhej dena&rdquo;).
            </p>
          </div>

          {/* Quick Examples */}
          <div>
            <label className="text-xs font-semibold text-[#71717a] uppercase tracking-wider block mb-2">
              Try an example:
            </label>
            <div className="flex flex-wrap gap-2">
              {sampleMessages.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessage(sample)}
                  className="text-left text-xs p-2 rounded-md bg-[#faf8f5] hover:bg-[#f4f0eb] border border-[#e7e0d6] text-[#3f3f46] transition"
                >
                  &ldquo;{sample}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div className="space-y-2">
            <div className="relative">
              <textarea
                rows={4}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Yahan apna order likhein... (jaise: 2 kilo atta, 1 Amul butter, sugar half kilo...)"
                className="w-full p-3.5 text-sm border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5] font-sans"
              />
              <span className="absolute bottom-2.5 right-3 text-[11px] text-[#a1a1aa] font-mono">
                {message.length}/1000
              </span>
            </div>

            <button
              onClick={() => handleSendOrder(message)}
              disabled={loading || !message.trim()}
              className="w-full py-3 px-4 rounded-md bg-[#c2410c] hover:bg-[#9a3412] text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <span>Parsing order & matching items...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Order to Counter</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Active Order Thread & Resolution Desk */
        <div className="space-y-6">
          {/* Conversation Thread */}
          <div className="border border-[#e7e0d6] bg-white rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717a] border-b border-[#e7e0d6] pb-2">
              Order Conversation
            </h3>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.sender === "customer" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                      msg.sender === "customer"
                        ? "bg-[#c2410c] text-white rounded-br-none"
                        : msg.sender === "shopkeeper"
                        ? "bg-[#f4f0eb] text-[#18181b] border border-[#e7e0d6] rounded-bl-none"
                        : "bg-[#fff7ed] text-[#9a3412] border border-[#fed7aa] rounded-bl-none"
                    }`}
                  >
                    <div className="text-[10px] font-semibold opacity-75 mb-1 uppercase tracking-wider">
                      {msg.sender === "customer"
                        ? "You"
                        : msg.sender === "shopkeeper"
                        ? "Shopkeeper"
                        : "Order Desk"}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parsed Items List with Status Badges */}
          <div className="border border-[#e7e0d6] bg-white rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 bg-[#f4f0eb] border-b border-[#e7e0d6] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#18181b]">
                Parsed Items ({activeOrder.items.length})
              </h3>
              <OrderStatusBadge status={activeOrder.status} />
            </div>

            <div className="divide-y divide-[#e7e0d6]">
              {activeOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#18181b]">
                        {item.productNameSnapshot || item.rawText}
                      </span>
                      <MatchStatusBadge status={item.matchStatus} />
                    </div>

                    <div className="text-[#71717a] flex flex-wrap gap-x-3">
                      <span>
                        Original mention:{" "}
                        <span className="font-mono text-[#18181b]">
                          &ldquo;{item.rawText}&rdquo;
                        </span>
                      </span>
                      {item.packSizeSnapshot && (
                        <span>Pack: {item.packSizeSnapshot}</span>
                      )}
                      {item.unitPricePaiseSnapshot && (
                        <span>Rate: {formatPaise(item.unitPricePaiseSnapshot)}</span>
                      )}
                    </div>

                    {item.matchStatus === "OUT_OF_STOCK" && (
                      <div className="text-rose-800 text-[11px] font-medium mt-1">
                        Currently out of stock. Alternative options recommended above.
                      </div>
                    )}
                    {item.matchStatus === "INSUFFICIENT_STOCK" && (
                      <div className="text-orange-800 text-[11px] font-medium mt-1">
                        Partial stock available in shop.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-[#f4f0eb]">
                    <div className="text-right">
                      <span className="text-[#71717a] block text-[11px]">Quantity</span>
                      <span className="font-semibold text-sm text-[#18181b]">
                        {item.quantity}
                      </span>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <span className="text-[#71717a] block text-[11px]">Amount</span>
                      <span className="font-bold text-sm text-[#c2410c]">
                        {item.matchStatus === "MATCHED"
                          ? formatPaise(item.lineTotalPaise)
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clarification Input Section (if status is needs_clarification) */}
          {activeOrder.status === "needs_clarification" && (
            <div className="border border-[#fed7aa] bg-[#fffaf5] rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[#9a3412]">
                <HelpCircle className="w-5 h-5 shrink-0" />
                <h4 className="font-bold text-sm">
                  Clarification needed for flagged items
                </h4>
              </div>

              {/* Quick suggestion chips */}
              {activeOrder.suggestedReplies &&
                activeOrder.suggestedReplies.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-[#71717a] uppercase tracking-wider block mb-2">
                      Suggested quick answers:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {activeOrder.suggestedReplies.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendReply(sug)}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#fed7aa] text-[#9a3412] hover:bg-[#ffedd5] transition disabled:opacity-50 shadow-sm"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Reply Input Box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(replyText);
                    }
                  }}
                  placeholder="Apna jawab likhein (jaise: sunflower 1L, ya tel rehne do)..."
                  className="flex-1 px-3.5 py-2.5 text-sm border border-[#fed7aa] rounded-md focus:border-[#c2410c] focus:ring-0 bg-white"
                />
                <button
                  onClick={() => handleSendReply(replyText)}
                  disabled={loading || !replyText.trim()}
                  className="px-4 py-2.5 rounded-md bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Reply</span>
                </button>
              </div>
            </div>
          )}

          {/* Ready to Confirm Order Summary (if ready_to_confirm) */}
          {activeOrder.status === "ready_to_confirm" && (
            <div className="border border-[#e7e0d6] bg-white rounded-lg p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-emerald-800 pb-3 border-b border-[#e7e0d6]">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-[#18181b]">
                  All items resolved! Review bill before confirming
                </h3>
              </div>

              {/* Bill Details */}
              <div className="rounded-md border border-[#e7e0d6] overflow-hidden bg-[#faf8f5]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f4f0eb] border-b border-[#e7e0d6] text-[#71717a] uppercase font-semibold">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5">Pack</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7e0d6]">
                    {activeOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-medium text-[#18181b]">
                          {item.productNameSnapshot || item.rawText}
                        </td>
                        <td className="p-2.5 text-[#52525b]">
                          {item.packSizeSnapshot || "—"}
                        </td>
                        <td className="p-2.5 text-[#18181b]">{item.quantity}</td>
                        <td className="p-2.5 text-[#52525b]">
                          {item.unitPricePaiseSnapshot
                            ? formatPaise(item.unitPricePaiseSnapshot)
                            : "—"}
                        </td>
                        <td className="p-2.5 text-right font-bold text-[#18181b]">
                          {formatPaise(item.lineTotalPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-white border-t-2 border-[#18181b]">
                    <tr>
                      <td colSpan={4} className="p-3 font-bold text-sm text-[#18181b]">
                        Grand Total
                      </td>
                      <td className="p-3 text-right font-bold text-lg text-[#c2410c]">
                        {formatPaise(activeOrder.totalPaise)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Delivery Details Inputs */}
              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#18181b] mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your complete delivery address"
                    className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#18181b] mb-1">
                    Requested Delivery Time
                  </label>
                  <input
                    type="text"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    placeholder="e.g. kal subah tak, by 6 PM"
                    className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
                  />
                </div>
              </div>

              <button
                onClick={handleConfirmOrder}
                disabled={confirming}
                className="w-full py-3.5 px-4 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm"
              >
                {confirming ? (
                  <span>Reserving stock & confirming...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirm Order ({formatPaise(activeOrder.totalPaise)})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Confirmed Order State */}
          {activeOrder.status === "confirmed" && (
            <div className="border border-emerald-300 bg-emerald-50 rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-lg text-emerald-950">
                    Order Confirmed!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Order #{activeOrder.orderNumber} is locked and sent to the counter for packing.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={`/orders/${activeOrder.id}`}
                  className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>View Bill & Delivery Slip</span>
                </Link>
                <Link
                  href="/orders"
                  className="px-4 py-2 rounded-md border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-900 text-xs font-semibold transition"
                >
                  My Orders History
                </Link>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-md border border-[#e7e0d6] bg-white hover:bg-[#faf8f5] text-[#52525b] text-xs font-medium transition"
                >
                  Place Another Order
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

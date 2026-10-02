"use client";

import React, { useState } from "react";
import {
  Store,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Share2,
  Receipt,
  RotateCcw,
  Volume2,
  MapPin,
  Phone,
  FileCheck,
} from "lucide-react";

interface VoiceOrderReportProps {
  orderData: {
    orderNumber: string;
    customerName?: string | null;
    customerPhone?: string | null;
    deliveryAddress?: string | null;
    transcript: string;
    detectedLanguage?: string;
    deliveryTimeText?: string | null;
    specialNotes?: string | null;
    totalPaise: number;
    formattedTotal: string;
    items: Array<{
      rawText: string;
      spokenTerm: string;
      englishCorrelation: string;
      category?: string;
      quantity: number | null;
      unit: string | null;
      selectedProduct?: {
        id: string;
        name: string;
        packSize: string;
        pricePaise: number;
        formattedPrice: string;
      } | null;
      unitRatePaise?: number;
      rateDisplay?: string;
      lineTotalPaise: number;
      formattedLineTotal: string;
      matchStatus: string;
      correlationExplanation: string;
    }>;
    correlationHighlights?: Array<{
      spoken: string;
      english: string;
      matchedProduct: string;
      explanation: string;
    }>;
    shopkeeperReceipt?: {
      token: string;
      orderNumber: string;
      status: string;
      estimatedPackingMins: number;
      counterMessage: string;
      receivedAt: string;
    } | null;
    shop?: {
      name: string;
      slug: string;
      phone?: string | null;
      address?: string | null;
    } | null;
  };
  onReset?: () => void;
}

export function VoiceOrderReport({ orderData, onReset }: VoiceOrderReportProps) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const shopName = orderData.shop?.name || "Prasad Kirana & General Store";
  const shopAddress =
    orderData.shop?.address || "Shop 14, Main Bazaar, Anand Nagar, Pune - 411038";
  const shopPhone = orderData.shop?.phone || "+91 98765 43210";
  const receiptToken =
    orderData.shopkeeperReceipt?.token ||
    `COUNTER-TKN-${Math.floor(1000 + Math.random() * 9000)}`;

  const customerName = orderData.customerName || "Aman Verma";
  const customerPhone = orderData.customerPhone || "+91 98765 43210";
  const deliveryAddress =
    orderData.deliveryAddress || "Flat 302, Green Valley Apartments";

  const handleSpeakBill = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Audio speech synthesis is not supported on this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = `Aapka order receive ho gaya hai. Dukaan: ${shopName}. Token number ${receiptToken}. Kul ${orderData.items.length} items. Total bill: ${orderData.formattedTotal}. Delivery ${orderData.deliveryTimeText || "jald se jald"}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyReceipt = () => {
    const lines = [
      `🧾 --- ${shopName.toUpperCase()} ---`,
      `Counter Token: ${receiptToken}`,
      `Order #: ${orderData.orderNumber}`,
      `Delivery: ${orderData.deliveryTimeText || "Immediate / ASAP"}`,
      `--- ITEMS ---`,
      ...orderData.items.map(
        (it) =>
          `• ${it.selectedProduct?.name || it.englishCorrelation || it.spokenTerm} × ${
            it.quantity || "1"
          } ${it.unit || ""} = ${it.formattedLineTotal}`
      ),
      `--- TOTAL ---`,
      `Grand Total: ${orderData.formattedTotal}`,
      `Status: Counter Received & Packing Started`,
      `Shop Contact: ${shopPhone}`,
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
      {/* Printable Receipt Card */}
      <div className="border border-orange-200/90 bg-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden print:border-none print:shadow-none print:p-0">
        {/* Top Watermark / Status Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                {shopName}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>{shopAddress}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span>{shopPhone}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>COUNTER DISPATCH BILL</span>
            </div>
            <span className="font-mono text-xs text-zinc-500">
              Token: <strong className="text-orange-600 font-bold">{receiptToken}</strong>
            </span>
          </div>
        </div>

        {/* Customer & Order Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-zinc-100 text-xs">
          <div>
            <span className="text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">
              Customer Details
            </span>
            <span className="font-bold text-zinc-900 block truncate">
              {customerName}
            </span>
            <span className="text-[11px] text-zinc-500">{customerPhone}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">
              Delivery Address
            </span>
            <span className="font-semibold text-zinc-800 line-clamp-1">
              {deliveryAddress}
            </span>
            <span className="text-[11px] text-zinc-500">
              Slot: {orderData.deliveryTimeText || "Immediate / ASAP"}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">
              Order ID & Method
            </span>
            <span className="font-mono font-bold text-zinc-900 block">
              #{orderData.orderNumber}
            </span>
            <span className="font-semibold text-orange-600 flex items-center gap-1 text-[11px]">
              <Volume2 className="w-3 h-3" />
              <span>Voice ({orderData.detectedLanguage || "Hinglish"})</span>
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">
              Packing Status
            </span>
            <span className="font-bold text-emerald-700 block">
              ~{orderData.shopkeeperReceipt?.estimatedPackingMins || 15} Mins
            </span>
            <span className="text-[11px] text-zinc-500">Cash on Delivery / UPI</span>
          </div>
        </div>

        {/* Spoken Voice Transcript Display with Audio Readout */}
        <div className="my-5 p-4 rounded-xl bg-orange-50/60 border border-orange-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-orange-950 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-orange-600" />
              <span>Customer Spoken Audio Transcript:</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSpeakBill}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition"
                title="Listen to order bill readout"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? "animate-bounce" : ""}`} />
                <span>{isSpeaking ? "Stop Speaking" : "Audio Bill Readout (आवाज़ में सुनें)"}</span>
              </button>
              <span className="text-[10px] bg-orange-200/70 text-orange-900 px-2 py-0.5 rounded-full font-semibold">
                Live Speech API
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-zinc-800 font-sans italic bg-white/80 p-3 rounded-lg border border-orange-200 leading-relaxed">
            &ldquo;{orderData.transcript}&rdquo;
          </p>
        </div>

        {/* Itemized Order Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Itemized Kirana Bill ({orderData.items.length} items)
            </h3>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Correlated (Zero Aliases Required)</span>
            </span>
          </div>

          <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Spoken Term</th>
                  <th className="p-3">AI English Correlation</th>
                  <th className="p-3">Store Inventory Item</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orderData.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-orange-50/30 transition">
                    <td className="p-3 text-zinc-400 font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <span className="font-semibold text-zinc-900 block">
                        {it.rawText}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        term: &ldquo;{it.spokenTerm}&rdquo;
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                        <span>{it.englishCorrelation}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-zinc-900">
                        {it.selectedProduct?.name || it.englishCorrelation}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {it.selectedProduct?.packSize && (
                          <span className="text-[10px] text-zinc-500">
                            Pack: {it.selectedProduct.packSize}
                          </span>
                        )}
                        {it.matchStatus === "AMBIGUOUS" && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-semibold">
                            Default choice (alternatives available)
                          </span>
                        )}
                        {it.matchStatus === "MATCHED" && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                            In Stock
                          </span>
                        )}
                        {it.matchStatus === "INSUFFICIENT_STOCK" && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-medium border border-amber-200">
                            Warehouse dispatch
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold text-zinc-900">
                      {it.quantity ? `${it.quantity} ${it.unit || ""}`.trim() : "1 pc"}
                    </td>
                    <td className="p-3 text-right text-zinc-500 font-mono text-[11px]">
                      {it.rateDisplay || "—"}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-900 font-mono">
                      {it.formattedLineTotal}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-zinc-900 bg-zinc-50/50">
                <tr>
                  <td colSpan={6} className="p-3 text-right font-semibold text-zinc-600 text-xs">
                    Items Subtotal:
                  </td>
                  <td className="p-3 text-right font-bold text-zinc-900 text-sm font-mono">
                    {orderData.formattedTotal}
                  </td>
                </tr>
                <tr>
                  <td colSpan={6} className="p-2 text-right font-medium text-zinc-500 text-xs">
                    Counter Packing & Handling:
                  </td>
                  <td className="p-2 text-right text-emerald-700 font-semibold text-xs">
                    FREE
                  </td>
                </tr>
                <tr>
                  <td colSpan={6} className="p-2 text-right font-medium text-zinc-500 text-xs">
                    Home Delivery (Local within 2km):
                  </td>
                  <td className="p-2 text-right text-emerald-700 font-semibold text-xs">
                    FREE
                  </td>
                </tr>
                <tr className="bg-orange-50/80 border-t border-orange-200">
                  <td colSpan={6} className="p-3.5 text-right font-black text-sm text-orange-950 uppercase tracking-wider">
                    Grand Total Payable:
                  </td>
                  <td className="p-3.5 text-right font-black text-lg text-orange-600 font-mono">
                    {orderData.formattedTotal}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Shopkeeper Counter Dispatch Notice */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-emerald-950 text-sm">
                Shopkeeper Counter Received & Acknowledged
              </div>
              <p className="text-emerald-800 text-[11px]">
                {orderData.shopkeeperReceipt?.counterMessage ||
                  "Dukaandar ke counter par aawaz se naya order receive ho gaya hai"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold shadow-xs">
              Token: {receiptToken}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-5 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill / Slip</span>
            </button>
            <button
              onClick={handleCopyReceipt}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-400" />
                  <span>Copy Receipt (WhatsApp)</span>
                </>
              )}
            </button>
            <button
              onClick={handleSpeakBill}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-semibold transition"
            >
              <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-bounce text-orange-600" : ""}`} />
              <span>{isSpeaking ? "Stop Speaking" : "Audio Bill Readout"}</span>
            </button>
          </div>

          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-md shadow-orange-600/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Voice Order</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

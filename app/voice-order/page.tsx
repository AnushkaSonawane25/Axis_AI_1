"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import {
  Mic,
  Store,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Clock,
  CheckCircle2,
  Radio,
  FileText,
  Volume2,
  RefreshCw,
  Receipt,
} from "lucide-react";
import { VoiceOrderReport } from "@/components/VoiceOrderReport";

export default function VoiceOrderPage() {
  const [recentCounterOrders, setRecentCounterOrders] = useState<any[]>([]);
  const [activeVoiceOrder, setActiveVoiceOrder] = useState<any | null>(null);
  const [loadingCounter, setLoadingCounter] = useState(false);

  const fetchCounterFeed = async () => {
    try {
      setLoadingCounter(true);
      const res = await fetch("/api/mock-shopkeeper");
      if (res.ok) {
        const data = await res.json();
        setRecentCounterOrders(data.activeOrders || []);
      }
    } catch (e) {
      console.warn("Could not fetch counter feed:", e);
    } finally {
      setLoadingCounter(false);
    }
  };

  useEffect(() => {
    fetchCounterFeed();
    const interval = setInterval(fetchCounterFeed, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleOrderParsed = (orderData: any) => {
    setActiveVoiceOrder(orderData);
    fetchCounterFeed();
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 p-8 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-amber-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero-Alias AI Voice Integration</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Aawaz Se Order Desk <br />
              <span className="text-amber-200">
                (Hindi / Hinglish / English Voice Intake)
              </span>
            </h1>
            <p className="text-sm text-orange-100/90 leading-relaxed">
              Speak your grocery list casually in mixed Hindi or English. The AI agent
              automatically extracts quantities, correlates Hindi words to English catalog
              items (no aliases required), and dispatches the order straight to the shopkeeper counter!
            </p>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute right-12 top-4 w-32 h-32 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
        </div>

        {/* Active Itemized Order Report Banner */}
        {activeVoiceOrder && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-600" />
                <span>Generated Voice Order Report & Counter Bill</span>
              </h2>
              <button
                onClick={() => setActiveVoiceOrder(null)}
                className="text-xs text-zinc-500 hover:text-zinc-800 underline"
              >
                Close Report
              </button>
            </div>
            <VoiceOrderReport
              orderData={activeVoiceOrder}
              onReset={() => setActiveVoiceOrder(null)}
            />
          </div>
        )}

        {/* 2-Column Split: Customer Voice Recorder vs Shopkeeper Live Counter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Customer Voice Intake Studio */}
          <div className="lg:col-span-7 space-y-6">
            <div className="border border-orange-200/90 bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-orange-100 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/30">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">
                      Customer Voice Input
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Web Speech API with Real-time Correlation
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                  <Store className="w-3.5 h-3.5" />
                  <span>Prasad Kirana Store</span>
                </div>
              </div>

              {/* Embedded Voice Recorder Component */}
              <VoiceRecorder
                shopSlug="prasad-kirana"
                customerName="Aman Verma"
                customerPhone="+91 98765 43210"
                deliveryAddress="Flat 302, Green Valley Apartments"
                showReport={false}
                onOrderParsed={handleOrderParsed}
              />
            </div>

            {/* Explanation of No Aliases Needed */}
            <div className="border border-zinc-200 bg-white rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <span>How AI Correlation Works Without Aliases:</span>
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Traditional systems required shopkeepers to manually enter dozens of Hindi
                aliases for every product (e.g. &ldquo;cheeni&rdquo;, &ldquo;shakkar&rdquo;, &ldquo;chini&rdquo; for Sugar).
                With our AI agent:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="font-bold text-amber-950 block mb-1">
                    1. Semantic Correlation
                  </span>
                  <span className="text-amber-900/90 text-[11px]">
                    The LLM agent maps colloquial spoken terms (&ldquo;makhan&rdquo;, &ldquo;tel&rdquo;, &ldquo;cheeni&rdquo;)
                    to standard English grocery concepts automatically.
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="font-bold text-emerald-950 block mb-1">
                    2. Inventory Resolution
                  </span>
                  <span className="text-emerald-900/90 text-[11px]">
                    Matches against live shop items (like &ldquo;Madhur Pure Sugar 1kg&rdquo;)
                    even if the product has ZERO manual alias tags configured!
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Shopkeeper Counter Feed */}
          <div className="lg:col-span-5 space-y-6">
            <div className="border border-zinc-200 bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      Shopkeeper Counter Terminal
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Dispatch Feed</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={fetchCounterFeed}
                  disabled={loadingCounter}
                  className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-500 transition"
                  title="Refresh counter feed"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingCounter ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {/* Feed of Incoming Voice Orders */}
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {recentCounterOrders.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-xs">
                    No orders at counter yet. Speak an order to test!
                  </div>
                ) : (
                  recentCounterOrders.map((ord, idx) => (
                    <div
                      key={idx}
                      className="border border-zinc-200 rounded-xl p-4 bg-gradient-to-b from-white to-zinc-50/50 space-y-2.5 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-orange-600">
                            {ord.token}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            #{ord.orderNumber}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          {ord.status}
                        </span>
                      </div>

                      <div>
                        <div className="font-semibold text-zinc-900">
                          {ord.customerName}
                        </div>
                        {ord.deliveryTimeText && (
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span>{ord.deliveryTimeText}</span>
                          </div>
                        )}
                      </div>

                      {/* Items list */}
                      <div className="p-2.5 rounded-lg bg-white border border-zinc-100 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Counter Items ({ord.items?.length || 0}):
                        </div>
                        {ord.items?.map((it: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[11px] text-zinc-700"
                          >
                            <span>
                              <span className="font-semibold text-zinc-900">
                                {it.productName}
                              </span>{" "}
                              × {it.quantity}
                            </span>
                            <span className="font-mono text-zinc-900">
                              {it.lineTotalFormatted}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[11px]">
                        <span className="text-zinc-500">
                          Est. Pack: {ord.estimatedPackingMins}m
                        </span>
                        <span className="font-bold text-orange-600 text-xs">
                          {ord.totalFormatted}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Voice Recorder Pill to test anywhere */}
        <VoiceRecorder
          floating={true}
          shopSlug="prasad-kirana"
          onOrderParsed={handleOrderParsed}
        />
      </div>
    </div>
  );
}

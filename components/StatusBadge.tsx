import React from "react";
import { CheckCircle2, AlertCircle, XCircle, HelpCircle, AlertTriangle, Clock, Truck, Check } from "lucide-react";

export function MatchStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "MATCHED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
          <span>Matched</span>
        </span>
      );
    case "AMBIGUOUS":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
          <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
          <span>Needs Clarification</span>
        </span>
      );
    case "OUT_OF_STOCK":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300">
          <XCircle className="w-3.5 h-3.5 text-rose-700" />
          <span>Out of Stock</span>
        </span>
      );
    case "INSUFFICIENT_STOCK":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-900 border border-orange-300">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-700" />
          <span>Partial Stock</span>
        </span>
      );
    case "NOT_FOUND":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-200 text-stone-800 border border-stone-300">
          <AlertCircle className="w-3.5 h-3.5 text-stone-600" />
          <span>Not Found</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300">
          <span>{status}</span>
        </span>
      );
  }
}

export function OrderStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "needs_clarification":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
          <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
          <span>Needs Clarification</span>
        </span>
      );
    case "ready_to_confirm":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-300">
          <Clock className="w-3.5 h-3.5 text-blue-700" />
          <span>Ready to Confirm</span>
        </span>
      );
    case "confirmed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
          <span>Confirmed</span>
        </span>
      );
    case "out_for_delivery":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-900 border border-purple-300">
          <Truck className="w-3.5 h-3.5 text-purple-700" />
          <span>Out for Delivery</span>
        </span>
      );
    case "delivered":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 text-stone-900 border border-stone-300">
          <Check className="w-3.5 h-3.5 text-stone-700" />
          <span>Delivered</span>
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-300">
          <XCircle className="w-3.5 h-3.5 text-rose-700" />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-300">
          <span>{status.replace(/_/g, " ")}</span>
        </span>
      );
  }
}

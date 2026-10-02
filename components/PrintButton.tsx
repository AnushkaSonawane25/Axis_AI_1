"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-3 py-1.5 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
    >
      <Printer className="w-3.5 h-3.5" />
      <span>Print Bill & Slip</span>
    </button>
  );
}

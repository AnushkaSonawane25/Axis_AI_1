"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center mb-4 border border-rose-200">
        <AlertCircle className="w-6 h-6 text-rose-700" />
      </div>
      <h1 className="text-2xl font-bold text-[#18181b] tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-[#71717a] max-w-md">
        An unexpected error occurred while loading this desk. You can retry the operation or return to the shop directory.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-md bg-[#c2410c] text-white text-xs font-semibold hover:bg-[#9a3412] transition flex items-center gap-1.5 shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-md border border-[#e7e0d6] bg-white text-[#18181b] text-xs font-semibold hover:bg-[#faf8f5] transition"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

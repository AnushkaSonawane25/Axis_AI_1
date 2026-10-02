import Link from "next/link";
import { Store, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#ffedd5] text-[#9a3412] flex items-center justify-center font-bold text-xl mb-4 border border-[#fed7aa]">
        404
      </div>
      <h1 className="text-2xl font-bold text-[#18181b] tracking-tight">
        Page or Shop Not Found
      </h1>
      <p className="mt-2 text-sm text-[#71717a] max-w-sm">
        The page or shop you are looking for does not exist or may have changed handle.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Link
          href="/"
          className="px-4 py-2 rounded-md bg-[#c2410c] text-white text-xs font-semibold hover:bg-[#9a3412] transition shadow-sm"
        >
          Return to Home
        </Link>
        <Link
          href="/shops"
          className="px-4 py-2 rounded-md border border-[#e7e0d6] bg-white text-[#18181b] text-xs font-semibold hover:bg-[#faf8f5] transition"
        >
          Browse All Shops
        </Link>
      </div>
    </div>
  );
}

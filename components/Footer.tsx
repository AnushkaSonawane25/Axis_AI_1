import Link from "next/link";

export function Footer() {
  const currentYear = 2026;
  const legalEntity =
    process.env.LEGAL_ENTITY_NAME || "Hinglish Order Desk Technologies Pvt Ltd";

  return (
    <footer className="mt-auto border-t border-[#e7e0d6] bg-[#ffffff] py-8 text-sm text-[#71717a] no-print">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-[#18181b]">Hinglish Order Desk</p>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Utility for local Indian kirana and general store counters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
          <Link href="/shops" className="hover:text-[#c2410c] transition">
            Shop Directory
          </Link>
          <Link href="/privacy" className="hover:text-[#c2410c] transition">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[#c2410c] transition">
            Terms & Conditions
          </Link>
          <span className="text-[#d4d4d8]">|</span>
          <span className="text-[#a1a1aa]">
            © {currentYear} {legalEntity}
          </span>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowRight, CheckCircle2, HelpCircle, FileText, ShoppingCart, MessageSquare, Mic, Sparkles } from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-12 md:py-16">
        {/* Hero Section */}
        <div className="max-w-3xl mb-14">
          <div className="inline-block px-3 py-1 rounded bg-[#ffedd5] text-[#9a3412] text-xs font-semibold mb-4 border border-[#fed7aa]">
            Digital Order Desk for Indian Kirana Stores
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[#18181b] leading-tight">
            Casual Hinglish order messages turned into clear itemized bills.
          </h1>
          <p className="mt-4 text-lg text-[#52525b] leading-relaxed">
            Customers send informal messages mixing Hindi and English just like they speak.
            The system interprets the items, matches them against your live store catalog,
            flags ambiguities or stock shortages, and produces an itemized bill with delivery notes.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/voice-order"
              className="px-6 py-3 rounded-md bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 text-white font-semibold hover:from-orange-700 hover:to-rose-700 transition flex items-center gap-2 shadow-sm"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Voice Order (आवाज़ से ऑर्डर)</span>
            </Link>

            <Link
              href={user ? (user.role === "shopkeeper" ? "/dashboard" : "/shops") : "/signup"}
              className="px-6 py-3 rounded-md bg-[#c2410c] text-white font-semibold hover:bg-[#9a3412] transition flex items-center gap-2 shadow-sm"
            >
              <span>{user ? "Go to Desk" : "Get Started"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/shops"
              className="px-6 py-3 rounded-md border border-[#e7e0d6] bg-white text-[#18181b] font-semibold hover:bg-[#faf8f5] transition"
            >
              Browse Participating Shops
            </Link>
          </div>
        </div>

        {/* Real Working Example (Static & clearly labeled Example) */}
        <section className="mb-16">
          <div className="border border-[#e7e0d6] bg-white rounded-lg p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#e7e0d6] mb-6">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-[#c2410c] bg-[#ffedd5] px-2 py-0.5 rounded">
                  Example
                </span>
                <h2 className="text-xl font-bold text-[#18181b] mt-1">
                  How an informal Hinglish order gets processed
                </h2>
              </div>
              <span className="text-xs text-[#71717a]">Simulated walkthrough</span>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column: Customer Message and Clarification */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#71717a] uppercase tracking-wider block mb-2">
                    1. Customer sends message in chat
                  </label>
                  <div className="p-4 rounded-md bg-[#f4f0eb] border border-[#e7e0d6] text-sm text-[#18181b] font-mono leading-relaxed">
                    &ldquo;bhaiya 2 kilo atta, ek Amul butter aur sugar half kilo, tel bhi chahiye, kal subah tak bhej dena&rdquo;
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#71717a] uppercase tracking-wider block mb-2">
                    2. System asks ONE short clarification for flagged items
                  </label>
                  <div className="p-4 rounded-md bg-[#fff7ed] border border-[#fed7aa] text-sm text-[#9a3412] leading-relaxed">
                    <p className="font-medium">
                      Kaunsa tel chahiye: Fortune Sunflower 1L (₹145) ya Fortune Mustard 1L (₹165)? Aur 1L ya 5L?
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#71717a] uppercase tracking-wider block mb-2">
                    3. Customer replies
                  </label>
                  <div className="p-3 rounded-md bg-[#f4f0eb] border border-[#e7e0d6] text-sm text-[#18181b] font-mono">
                    &ldquo;sunflower 1L&rdquo;
                  </div>
                </div>
              </div>

              {/* Right Column: Parsed Items & Generated Bill */}
              <div>
                <label className="text-xs font-semibold text-[#71717a] uppercase tracking-wider block mb-2">
                  4. Itemized bill and delivery slip (computed in code)
                </label>
                <div className="border border-[#e7e0d6] rounded-md overflow-hidden bg-[#faf8f5]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#f4f0eb] border-b border-[#e7e0d6] text-[#71717a] uppercase font-semibold">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5">Qty</th>
                        <th className="p-2.5">Rate</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e7e0d6]">
                      <tr>
                        <td className="p-2.5 font-medium text-[#18181b]">
                          Aashirvaad Chakki Atta (5 kg pack)
                        </td>
                        <td className="p-2.5">2 kg (loose/pack)</td>
                        <td className="p-2.5">₹46 / kg</td>
                        <td className="p-2.5 text-right font-semibold">₹92</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-[#18181b]">
                          Amul Butter (100 g)
                        </td>
                        <td className="p-2.5">1 pack</td>
                        <td className="p-2.5">₹58</td>
                        <td className="p-2.5 text-right font-semibold">₹58</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-[#18181b]">
                          Madhur Sugar (1 kg)
                        </td>
                        <td className="p-2.5">0.5 kg</td>
                        <td className="p-2.5">₹48 / kg</td>
                        <td className="p-2.5 text-right font-semibold">₹24</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-[#18181b]">
                          Fortune Sunlite Sunflower Oil (1 L)
                        </td>
                        <td className="p-2.5">1 pack</td>
                        <td className="p-2.5">₹145</td>
                        <td className="p-2.5 text-right font-semibold">₹145</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-[#ffffff] border-t-2 border-[#18181b]">
                      <tr>
                        <td colSpan={3} className="p-2.5 font-bold text-sm text-[#18181b]">
                          Grand Total
                        </td>
                        <td className="p-2.5 text-right font-bold text-base text-[#c2410c]">
                          ₹319
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="p-3 bg-[#ffffff] border-t border-[#e7e0d6] text-xs text-[#52525b]">
                    <span className="font-semibold text-[#18181b]">Delivery Note: </span>
                    Requested timing: <span className="font-mono">kal subah tak</span>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Step Process */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-[#18181b] mb-8">
            How it works in 4 steps
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="p-5 rounded-lg border border-[#e7e0d6] bg-white">
              <div className="w-8 h-8 rounded bg-[#ffedd5] text-[#9a3412] font-bold flex items-center justify-center text-sm mb-4">
                1
              </div>
              <h3 className="font-bold text-[#18181b] text-base mb-2">
                Customer sends message
              </h3>
              <p className="text-sm text-[#52525b] leading-relaxed">
                Customers type or paste an everyday order in Hindi, English, or mixed Hinglish.
                Numbers like &ldquo;dedh&rdquo;, &ldquo;aadha&rdquo;, &ldquo;dhai&rdquo;, and Roman or Devanagari spellings are understood.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-[#e7e0d6] bg-white">
              <div className="w-8 h-8 rounded bg-[#ffedd5] text-[#9a3412] font-bold flex items-center justify-center text-sm mb-4">
                2
              </div>
              <h3 className="font-bold text-[#18181b] text-base mb-2">
                Live catalog match
              </h3>
              <p className="text-sm text-[#52525b] leading-relaxed">
                Code matches each item against the shopkeeper&apos;s product list and aliases using trigram and fuzzy matching.
                Prices and stock are strictly controlled by your database, never by an AI.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-[#e7e0d6] bg-white">
              <div className="w-8 h-8 rounded bg-[#ffedd5] text-[#9a3412] font-bold flex items-center justify-center text-sm mb-4">
                3
              </div>
              <h3 className="font-bold text-[#18181b] text-base mb-2">
                Short clarification
              </h3>
              <p className="text-sm text-[#52525b] leading-relaxed">
                If an item is ambiguous, vague, or out of stock, one single concise question is sent.
                In-stock alternatives and prices are offered automatically.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-[#e7e0d6] bg-white">
              <div className="w-8 h-8 rounded bg-[#ffedd5] text-[#9a3412] font-bold flex items-center justify-center text-sm mb-4">
                4
              </div>
              <h3 className="font-bold text-[#18181b] text-base mb-2">
                Confirmed counter bill
              </h3>
              <p className="text-sm text-[#52525b] leading-relaxed">
                Once resolved, stock is reserved in a single database transaction.
                A clean, printable A4/A5 bill and delivery slip is generated for packing.
              </p>
            </div>
          </div>
        </section>

        {/* Roles CTA */}
        <section className="p-8 rounded-lg border border-[#e7e0d6] bg-[#ffffff] mb-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-[#18181b]">
                Ready to try the order desk?
              </h2>
              <p className="mt-2 text-sm text-[#52525b]">
                Sign up as a customer to order from local stores, or create a shopkeeper account to manage your own catalog and incoming orders.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 md:justify-end">
              <Link
                href="/signup?role=customer"
                className="px-5 py-2.5 rounded-md border border-[#e7e0d6] bg-[#faf8f5] text-[#18181b] text-sm font-semibold hover:bg-[#f4f0eb] transition"
              >
                Sign up as Customer
              </Link>
              <Link
                href="/signup?role=shopkeeper"
                className="px-5 py-2.5 rounded-md bg-[#c2410c] text-white text-sm font-semibold hover:bg-[#9a3412] transition"
              >
                Sign up as Shopkeeper
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Store, MapPin, Phone, ArrowRight } from "lucide-react";
import { eq } from "drizzle-orm";

export default async function ShopsPage() {
  const user = await getCurrentUser();

  const activeShops = await db
    .select()
    .from(schema.shops)
    .where(eq(schema.shops.isActive, true))
    .orderBy(schema.shops.name);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#18181b] tracking-tight">
            Find a Participating Shop
          </h1>
          <p className="mt-1 text-sm text-[#71717a]">
            Select a store to open its order desk and send your order message.
          </p>
        </div>

        {activeShops.length === 0 ? (
          <div className="p-12 text-center border border-[#e7e0d6] rounded-lg bg-white">
            <Store className="w-10 h-10 text-[#a1a1aa] mx-auto mb-3" />
            <h3 className="font-semibold text-base text-[#18181b]">
              No active shops yet
            </h3>
            <p className="text-sm text-[#71717a] mt-1">
              Check back soon or create a shopkeeper account to register your store.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {activeShops.map((shop) => (
              <div
                key={shop.id}
                className="border border-[#e7e0d6] rounded-lg bg-white p-6 shadow-sm hover:border-[#c2410c] transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#18181b]">
                        {shop.name}
                      </h2>
                      <span className="text-xs font-mono text-[#c2410c] bg-[#ffedd5] px-2 py-0.5 rounded inline-block mt-1">
                        /s/{shop.slug}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-[#52525b]">
                    {shop.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#a1a1aa] shrink-0 mt-0.5" />
                        <span>{shop.address}</span>
                      </div>
                    )}
                    {shop.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#a1a1aa] shrink-0" />
                        <span>{shop.phone}</span>
                      </div>
                    )}
                  </div>

                  {shop.deliveryNotes && (
                    <div className="mt-4 p-2.5 rounded bg-[#faf8f5] border border-[#e7e0d6] text-xs text-[#71717a]">
                      <span className="font-semibold text-[#18181b]">Delivery Notes: </span>
                      {shop.deliveryNotes}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#e7e0d6]">
                  <Link
                    href={`/s/${shop.slug}`}
                    className="w-full py-2.5 px-4 rounded-md bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <span>Open Order Desk</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

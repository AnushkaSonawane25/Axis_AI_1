import { notFound } from "next/navigation";
import { db } from "@/lib/db/index";
import * as schema from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { OrderDeskClient } from "./OrderDeskClient";
import { eq } from "drizzle-orm";

export default async function ShopOrderDeskPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let user: any = null;
  let shop: any = null;

  try {
    user = await getCurrentUser();
    const [foundShop] = await db
      .select()
      .from(schema.shops)
      .where(eq(schema.shops.slug, slug))
      .limit(1);
    shop = foundShop;
  } catch (err) {
    console.warn("DB offline, using demo shop fallback for /s/" + slug, err);
    if (slug === "prasad-kirana" || slug === "demo-shop") {
      shop = {
        id: "demo-shop-1",
        name: "Prasad Kirana & General Store",
        slug: "prasad-kirana",
        phone: "+91 98765 43210",
        address: "Shop 14, Main Bazaar, Anand Nagar, Pune - 411038",
        deliveryNotes: "Free counter delivery within 2km on orders above ₹200.",
        isActive: true,
      };
    }
  }

  if (!shop || !shop.isActive) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <OrderDeskClient shop={shop} user={user} />
      </main>

      <Footer />
    </div>
  );
}

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
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
  const user = await getCurrentUser();

  const [shop] = await db
    .select()
    .from(schema.shops)
    .where(eq(schema.shops.slug, slug))
    .limit(1);

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

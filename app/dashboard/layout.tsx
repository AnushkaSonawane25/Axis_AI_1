import { redirect } from "next/navigation";
import { requireShopkeeper } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  let shop;

  try {
    const auth = await requireShopkeeper();
    user = auth.user;
    shop = auth.shop;
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      redirect("/login?redirect=/dashboard");
    }
    // If logged in as customer, redirect to customer orders
    redirect("/orders");
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#faf8f5]">
      <div className="no-print">
        <Navbar user={user} />
      </div>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">{children}</main>
      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/settings");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#18181b] tracking-tight">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-[#71717a]">
            Manage your personal profile and data rights.
          </p>
        </div>

        <SettingsClient user={user} />
      </main>

      <Footer />
    </div>
  );
}

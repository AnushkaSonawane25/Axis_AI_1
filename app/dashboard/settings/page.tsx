import { requireShopkeeper } from "@/lib/auth/session";
import { SettingsClient } from "@/app/settings/SettingsClient";

export default async function ShopkeeperSettingsPage() {
  const { user } = await requireShopkeeper();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b] tracking-tight">
          Shopkeeper Account Settings
        </h1>
        <p className="text-xs text-[#71717a] mt-0.5">
          Manage your personal credentials, privacy rights, and account status.
        </p>
      </div>

      <SettingsClient user={user} />
    </div>
  );
}

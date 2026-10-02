import { requireShopkeeper } from "@/lib/auth/session";
import { ShopProfileClient } from "./ShopProfileClient";

export default async function ShopProfilePage() {
  const { shop } = await requireShopkeeper();

  return <ShopProfileClient initialShop={shop} />;
}

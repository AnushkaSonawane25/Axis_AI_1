"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, MapPin, Phone, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  initialShop: any;
}

export function ShopProfileClient({ initialShop }: Props) {
  const [shop, setShop] = useState(initialShop);
  const [name, setName] = useState(shop.name);
  const [slug, setSlug] = useState(shop.slug);
  const [phone, setPhone] = useState(shop.phone || "");
  const [address, setAddress] = useState(shop.address || "");
  const [deliveryNotes, setDeliveryNotes] = useState(shop.deliveryNotes || "");
  const [isActive, setIsActive] = useState(shop.isActive);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          phone,
          address,
          deliveryNotes,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update shop details");

      setShop(data.shop);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b] tracking-tight">
          Shop Profile & Delivery Settings
        </h1>
        <p className="text-xs text-[#71717a] mt-0.5">
          Configure your store information, public link, and delivery guidelines.
        </p>
      </div>

      <div className="border border-[#e7e0d6] bg-white rounded-lg p-6 shadow-sm space-y-5">
        {success && (
          <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Shop profile updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#18181b] mb-1">
              Store Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#18181b] mb-1">
              Public Desk Handle / Slug *
            </label>
            <div className="flex rounded-md border border-[#e7e0d6] bg-[#faf8f5] overflow-hidden text-xs">
              <span className="px-3 py-2 text-[#71717a] bg-[#f4f0eb] border-r border-[#e7e0d6] font-mono">
                /s/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                className="flex-1 px-3 py-2 bg-transparent font-mono focus:outline-none"
              />
            </div>
            <span className="text-[11px] text-[#71717a] block mt-1">
              Live link:{" "}
              <Link
                href={`/s/${slug}`}
                target="_blank"
                className="text-[#c2410c] underline"
              >
                /s/{slug}
              </Link>
            </span>
          </div>

          <div>
            <label className="block font-semibold text-[#18181b] mb-1">
              Contact Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#18181b] mb-1">
              Counter Physical Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop No., Market name, City, Pincode"
              className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#18181b] mb-1">
              Delivery Notes / Policy
            </label>
            <textarea
              rows={3}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. Free delivery on orders above ₹300 within 2km. Orders delivered in 30-45 minutes."
              className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-[#e7e0d6] text-[#c2410c] focus:ring-[#c2410c]"
              />
              <span className="font-semibold text-[#18181b]">
                Store is Active (Accepting Incoming Orders)
              </span>
            </label>
          </div>

          <div className="pt-3 border-t border-[#e7e0d6] flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-md bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
            >
              {loading ? "Saving Changes..." : "Save Shop Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

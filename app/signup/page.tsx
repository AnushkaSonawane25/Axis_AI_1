"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Store, User, ArrowRight, AlertCircle } from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf8f5] flex items-center justify-center text-xs text-[#71717a]">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "shopkeeper" ? "shopkeeper" : "customer";

  const [role, setRole] = useState<"customer" | "shopkeeper">(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopSlug, setShopSlug] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setError("You must accept the Terms & Conditions and Privacy Policy to register.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone,
          address,
          acceptedTerms: true,
          shopName: role === "shopkeeper" ? shopName : undefined,
          shopSlug: role === "shopkeeper" ? shopSlug : undefined,
          shopPhone: role === "shopkeeper" ? phone : undefined,
          shopAddress: role === "shopkeeper" ? address : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sign up");
      }

      if (role === "shopkeeper") {
        router.push("/dashboard");
      } else {
        router.push("/shops");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#c2410c] text-white flex items-center justify-center font-bold text-sm">
            H
          </div>
          <span className="font-bold text-xl text-[#18181b]">Hinglish Order Desk</span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#18181b]">
          Create your account
        </h2>
        <p className="mt-1 text-center text-sm text-[#71717a]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#c2410c] hover:underline">
            Log in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-[#e7e0d6] sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-6 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Selector Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#71717a] mb-2">
              Select Account Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#f4f0eb] rounded-lg border border-[#e7e0d6]">
              <button
                type="button"
                onClick={() => setRole("customer")}
                className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition ${
                  role === "customer"
                    ? "bg-white text-[#18181b] shadow-sm border border-[#e7e0d6]"
                    : "text-[#71717a] hover:text-[#18181b]"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("shopkeeper")}
                className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition ${
                  role === "shopkeeper"
                    ? "bg-white text-[#18181b] shadow-sm border border-[#e7e0d6]"
                    : "text-[#71717a] hover:text-[#18181b]"
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Shopkeeper</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#18181b] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 text-sm border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18181b] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@example.com"
                className="w-full px-3 py-2 text-sm border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18181b] mb-1">
                Password (min 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18181b] mb-1">
                Phone Number (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 text-sm border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
              />
            </div>

            {role === "customer" ? (
              <div>
                <label className="block text-xs font-semibold text-[#18181b] mb-1">
                  Delivery Address (optional)
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Flat/House number, Street, Landmark"
                  className="w-full px-3 py-2 text-sm border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
                />
              </div>
            ) : (
              <>
                <div className="pt-2 border-t border-[#e7e0d6]">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#71717a] mb-2">
                    Shop Details
                  </label>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#18181b] mb-1">
                        Shop Name
                      </label>
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={(e) => {
                          setShopName(e.target.value);
                          if (!shopSlug) {
                            setShopSlug(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^\w-]/g, "-")
                                .replace(/--+/g, "-")
                            );
                          }
                        }}
                        placeholder="e.g. Ramesh Kirana Store"
                        className="w-full px-3 py-2 text-sm border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#18181b] mb-1">
                        Shop URL Handle / Slug
                      </label>
                      <div className="flex rounded-md border border-[#e7e0d6] bg-[#faf8f5] overflow-hidden text-sm">
                        <span className="px-2.5 py-2 text-[#71717a] bg-[#f4f0eb] border-r border-[#e7e0d6] text-xs font-mono">
                          /s/
                        </span>
                        <input
                          type="text"
                          required
                          value={shopSlug}
                          onChange={(e) => setShopSlug(e.target.value.toLowerCase())}
                          placeholder="ramesh-kirana"
                          className="flex-1 px-3 py-2 bg-transparent text-sm font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#18181b] mb-1">
                        Store Counter Address
                      </label>
                      <textarea
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Shop No. 12, Main Bazaar, City"
                        className="w-full px-3 py-2 text-sm border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Terms and Privacy acceptance */}
            <div className="pt-2">
              <label className="flex items-start gap-2 text-xs text-[#52525b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-[#d4d4d8] text-[#c2410c] focus:ring-[#c2410c]"
                />
                <span>
                  I have read and agree to the{" "}
                  <Link href="/terms" target="_blank" className="text-[#c2410c] underline">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" className="text-[#c2410c] underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-[#c2410c] hover:bg-[#9a3412] focus:outline-none transition disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

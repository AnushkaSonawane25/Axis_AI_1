"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password");
      }

      if (data.user?.role === "shopkeeper") {
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
          Sign in to your account
        </h2>
        <p className="mt-1 text-center text-sm text-[#71717a]">
          Or{" "}
          <Link href="/signup" className="font-semibold text-[#c2410c] hover:underline">
            create a new account
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#18181b] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 text-sm border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18181b] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-[#e7e0d6] rounded-md focus:border-[#c2410c] focus:ring-0 bg-[#faf8f5]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-[#c2410c] hover:bg-[#9a3412] focus:outline-none transition disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Quick Demo Credentials Info */}
          <div className="mt-6 pt-4 border-t border-[#e7e0d6] text-xs text-[#71717a]">
            <span className="font-semibold text-[#18181b]">Sample Shopkeeper Login:</span>
            <div className="mt-1 font-mono text-[11px] bg-[#faf8f5] p-2 rounded border border-[#e7e0d6]">
              Email: shopkeeper@example.com<br />
              Password: KiranaShop@2026!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

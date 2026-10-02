"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Store, ShoppingBag, LogOut, Settings, Package, User as UserIcon, Menu, X } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "customer" | "shopkeeper";
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <header className="border-b border-[#e7e0d6] bg-[#ffffff] sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-[#18181b] tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-[#c2410c] text-white flex items-center justify-center font-bold text-sm">
            H
          </div>
          <span>Hinglish Order Desk</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#52525b]">
          <Link
            href="/shops"
            className={`transition hover:text-[#c2410c] ${
              pathname.startsWith("/shops") || pathname.startsWith("/s/")
                ? "text-[#c2410c] font-semibold"
                : ""
            }`}
          >
            Find Shops
          </Link>

          {user?.role === "customer" && (
            <>
              <Link
                href="/orders"
                className={`transition hover:text-[#c2410c] ${
                  pathname.startsWith("/orders") ? "text-[#c2410c] font-semibold" : ""
                }`}
              >
                My Orders
              </Link>
              <Link
                href="/settings"
                className={`transition hover:text-[#c2410c] ${
                  pathname === "/settings" ? "text-[#c2410c] font-semibold" : ""
                }`}
              >
                Settings
              </Link>
            </>
          )}

          {user?.role === "shopkeeper" && (
            <>
              <Link
                href="/dashboard"
                className={`transition hover:text-[#c2410c] ${
                  pathname === "/dashboard" ? "text-[#c2410c] font-semibold" : ""
                }`}
              >
                Overview
              </Link>
              <Link
                href="/dashboard/orders"
                className={`transition hover:text-[#c2410c] ${
                  pathname.startsWith("/dashboard/orders")
                    ? "text-[#c2410c] font-semibold"
                    : ""
                }`}
              >
                Incoming Orders
              </Link>
              <Link
                href="/dashboard/catalog"
                className={`transition hover:text-[#c2410c] ${
                  pathname.startsWith("/dashboard/catalog")
                    ? "text-[#c2410c] font-semibold"
                    : ""
                }`}
              >
                Catalog Manager
              </Link>
              <Link
                href="/dashboard/shop"
                className={`transition hover:text-[#c2410c] ${
                  pathname.startsWith("/dashboard/shop")
                    ? "text-[#c2410c] font-semibold"
                    : ""
                }`}
              >
                Shop Profile
              </Link>
            </>
          )}
        </nav>

        {/* User Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs px-2.5 py-1 rounded bg-[#f4f0eb] text-[#44403c] font-medium border border-[#e7e0d6]">
                {user.role === "shopkeeper" ? "Shopkeeper" : "Customer"}: {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-[#71717a] hover:text-[#c2410c] hover:bg-[#faf8f5] rounded-md transition border border-transparent hover:border-[#e7e0d6]"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-[#18181b] hover:text-[#c2410c] transition"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 text-sm font-semibold rounded-md bg-[#c2410c] text-white hover:bg-[#9a3412] transition shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#52525b] hover:text-[#18181b]"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e7e0d6] bg-white px-4 py-4 space-y-3">
          <Link
            href="/shops"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-[#18181b] py-1"
          >
            Find Shops
          </Link>
          {user?.role === "customer" && (
            <>
              <Link
                href="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-[#18181b] py-1"
              >
                My Orders
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-[#18181b] py-1"
              >
                Settings
              </Link>
            </>
          )}
          {user?.role === "shopkeeper" && (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-[#18181b] py-1"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-[#18181b] py-1"
              >
                Incoming Orders
              </Link>
              <Link
                href="/dashboard/catalog"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-[#18181b] py-1"
              >
                Catalog Manager
              </Link>
              <Link
                href="/dashboard/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-[#18181b] py-1"
              >
                Shop Profile
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-[#18181b] py-1"
              >
                Account Settings
              </Link>
            </>
          )}

          <div className="pt-3 border-t border-[#e7e0d6]">
            {user ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71717a]">{user.name} ({user.role})</span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-semibold text-[#c2410c]"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm font-medium border border-[#e7e0d6] rounded-md"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm font-semibold bg-[#c2410c] text-white rounded-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

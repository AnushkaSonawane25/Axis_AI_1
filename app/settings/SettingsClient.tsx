"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";

interface SettingsClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "customer" | "shopkeeper";
    phone?: string | null;
    address?: string | null;
    acceptedTermsVersion: string;
    acceptedTermsAt: Date | string;
  };
}

export function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== "delete permanently") {
      setError("Please type 'delete permanently' to confirm.");
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to delete account");
      }

      router.push("/?deleted=true");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Details Card */}
      <div className="border border-[#e7e0d6] bg-white rounded-lg p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-[#18181b] pb-3 border-b border-[#e7e0d6]">
          Profile Information
        </h2>

        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#71717a] block mb-1">Full Name</span>
            <div className="flex items-center gap-2 p-2.5 rounded bg-[#faf8f5] border border-[#e7e0d6] font-medium text-[#18181b]">
              <User className="w-4 h-4 text-[#a1a1aa]" />
              <span>{user.name}</span>
            </div>
          </div>

          <div>
            <span className="text-[#71717a] block mb-1">Email Address</span>
            <div className="flex items-center gap-2 p-2.5 rounded bg-[#faf8f5] border border-[#e7e0d6] font-medium text-[#18181b]">
              <Mail className="w-4 h-4 text-[#a1a1aa]" />
              <span>{user.email}</span>
            </div>
          </div>

          <div>
            <span className="text-[#71717a] block mb-1">Account Role</span>
            <div className="p-2.5 rounded bg-[#faf8f5] border border-[#e7e0d6] font-semibold text-[#c2410c] uppercase tracking-wider text-[11px]">
              {user.role}
            </div>
          </div>

          <div>
            <span className="text-[#71717a] block mb-1">Phone Number</span>
            <div className="flex items-center gap-2 p-2.5 rounded bg-[#faf8f5] border border-[#e7e0d6] text-[#52525b]">
              <Phone className="w-4 h-4 text-[#a1a1aa]" />
              <span>{user.phone || "Not provided"}</span>
            </div>
          </div>

          <div className="sm:col-span-2">
            <span className="text-[#71717a] block mb-1">Delivery Address</span>
            <div className="flex items-start gap-2 p-2.5 rounded bg-[#faf8f5] border border-[#e7e0d6] text-[#52525b]">
              <MapPin className="w-4 h-4 text-[#a1a1aa] shrink-0 mt-0.5" />
              <span>{user.address || "Not provided"}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2 text-xs text-[#71717a]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            Accepted Terms & Privacy v{user.acceptedTermsVersion} on{" "}
            {new Date(user.acceptedTermsAt).toLocaleDateString("en-IN")}.
          </span>
        </div>
      </div>

      {/* Danger Zone: Real Permanent Account Deletion */}
      <div className="border border-rose-200 bg-rose-50 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3 text-rose-900">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <h3 className="font-bold text-base text-rose-950">
              Permanent Account Deletion (DPDP Act, 2023)
            </h3>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">
              In compliance with India&apos;s Digital Personal Data Protection Act, 2023, you have the absolute right to have your data erased.
              This performs a real, immediate database wipe of your user account, active sessions, order history, messages, and catalog.
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-md bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Account & Erase All Data</span>
        </button>
      </div>

      {/* Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-[#e7e0d6] space-y-4">
            <h3 className="font-bold text-lg text-[#18181b]">
              Confirm Permanent Deletion
            </h3>
            <p className="text-xs text-[#52525b] leading-relaxed">
              Are you sure you want to permanently delete your account? All your personal information, orders, and conversation records will be permanently erased immediately.
            </p>

            {error && (
              <div className="p-3 rounded bg-rose-50 text-rose-800 border border-rose-200 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#18181b] mb-1">
                Type <span className="font-mono text-rose-700">delete permanently</span> to proceed:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="delete permanently"
                className="w-full px-3 py-2 text-xs border border-[#e7e0d6] rounded-md focus:border-rose-600 focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e7e0d6]">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setError(null);
                }}
                className="px-3.5 py-2 text-xs font-medium border border-[#e7e0d6] rounded-md hover:bg-[#faf8f5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText.toLowerCase() !== "delete permanently"}
                className="px-4 py-2 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-md transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { LoyalCustomerTier } from "@/server/db/schema";

interface EditLoyalCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer: any | null;
}

const TIER_OPTIONS: Array<{
  id: LoyalCustomerTier;
  label: string;
  badge: string;
  icon: string;
  desc: string;
  colorClass: string;
}> = [
  {
    id: "standard",
    label: "Thân thiết",
    badge: "🥉 Thân thiết",
    icon: "🥉",
    desc: "Khách hàng mua quen",
    colorClass: "border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  },
  {
    id: "silver",
    label: "Hạng Bạc",
    badge: "🥈 Hạng Bạc",
    icon: "🥈",
    desc: "Chi tiêu từ 1.000.000 ₫",
    colorClass: "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300",
  },
  {
    id: "gold",
    label: "Hạng Vàng",
    badge: "🥇 Hạng Vàng",
    icon: "🥇",
    desc: "Chi tiêu từ 2.000.000 ₫",
    colorClass: "border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  },
  {
    id: "diamond",
    label: "Kim Cương",
    badge: "💎 Kim Cương",
    icon: "💎",
    desc: "Chi tiêu từ 5.000.000 ₫",
    colorClass: "border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
  },
];

export function EditLoyalCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  customer,
}: EditLoyalCustomerModalProps) {
  const { toast } = useToast();
  const [tier, setTier] = useState<LoyalCustomerTier>("silver");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setTier(customer.tier || "standard");
      setNotes(customer.notes || "");
    }
  }, [customer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/sapo/customers/loyal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sapo_customer_id: customer.sapo_customer_id,
          tier,
          discount_percent: 0,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể cập nhật thông tin khách hàng");
      }

      toast.success(json.message || `Đã cập nhật thông tin cho ${customer.name}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi cập nhật");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-lg shrink-0">
              ✏️
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Chỉnh Sửa Hạng Thẻ & Ghi Chú
              </h3>
              <p className="text-[11px] text-zinc-400">
                Cập nhật hạng thành viên và ghi chú chăm sóc khách hàng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Thông tin khách hàng */}
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
              {customer.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                {customer.name}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                {customer.phone || "Chưa có SĐT"} • ID Sapo: #{customer.sapo_customer_id}
              </div>
            </div>
          </div>

          {/* Chọn Hạng Thành Viên */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Hạng thành viên
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIER_OPTIONS.map((t) => {
                const isSelected = tier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTier(t.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? `${t.colorClass} border-2 shadow-2xs`
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{t.icon}</span>
                      <div>
                        <div className="font-bold text-xs">{t.label}</div>
                        <div className="text-[10px] opacity-75">{t.desc}</div>
                      </div>
                    </div>
                    {isSelected && <span className="text-xs font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ghi chú chăm sóc */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Ghi chú chăm sóc / Sở thích
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú sở thích, sinh nhật, quà tặng..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
            >
              {submitting ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

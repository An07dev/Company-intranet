"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { LoyalCustomerTier } from "@/server/db/schema";

interface SimpleCustomer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  total_spent?: number;
  orders_count?: number;
  last_order_name?: string | null;
}

interface AddLoyalCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedCustomer?: SimpleCustomer | null;
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

export function AddLoyalCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  preSelectedCustomer,
}: AddLoyalCustomerModalProps) {
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<SimpleCustomer | null>(null);

  // Search Sapo customers
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form fields
  const [tier, setTier] = useState<LoyalCustomerTier>("silver");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preSelectedCustomer) {
      setSelectedCustomer(preSelectedCustomer);
      // Gợi ý hạng thẻ theo mức chi tiêu của khách
      const spent = preSelectedCustomer.total_spent || 0;
      if (spent >= 5000000) {
        setTier("diamond");
      } else if (spent >= 2000000) {
        setTier("gold");
      } else if (spent >= 1000000) {
        setTier("silver");
      } else {
        setTier("standard");
      }
    } else {
      setSelectedCustomer(null);
      setTier("silver");
      setNotes("");
    }
  }, [preSelectedCustomer, isOpen]);

  // Debounced search for customers from Sapo
  useEffect(() => {
    if (preSelectedCustomer || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/sapo/customers?limit=8&query=${encodeURIComponent(searchQuery.trim())}`);
        const json = await res.json();
        if (json.success && json.data?.customers) {
          setSearchResults(json.data.customers);
        }
      } catch {
        // Search error silent
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, preSelectedCustomer]);

  const handleSelectCustomerFromSearch = (c: any) => {
    const lastName = c.last_name || "";
    const firstName = c.first_name || "";
    const name = [lastName, firstName].filter(Boolean).join(" ") || "Khách lẻ";
    const addr = c.default_address
      ? [c.default_address.address1, c.default_address.district, c.default_address.city].filter(Boolean).join(", ")
      : "";

    const customerObj: SimpleCustomer = {
      id: c.id,
      name,
      phone: c.phone,
      email: c.email,
      address: addr,
      total_spent: c.total_spent || 0,
      orders_count: c.orders_count || 0,
      last_order_name: c.last_order_name || null,
    };

    setSelectedCustomer(customerObj);
    setSearchQuery("");
    setSearchResults([]);

    const spent = customerObj.total_spent || 0;
    if (spent >= 5000000) {
      setTier("diamond");
    } else if (spent >= 2000000) {
      setTier("gold");
    } else if (spent >= 1000000) {
      setTier("silver");
    } else {
      setTier("standard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error("Vui lòng chọn khách hàng để thêm vào nhóm thân thiết");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sapo/customers/loyal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sapo_customer_id: selectedCustomer.id,
          name: selectedCustomer.name,
          phone: selectedCustomer.phone || "",
          email: selectedCustomer.email || "",
          address: selectedCustomer.address || "",
          tier,
          discount_percent: 0,
          notes,
          total_spent: selectedCustomer.total_spent || 0,
          orders_count: selectedCustomer.orders_count || 0,
          last_order_name: selectedCustomer.last_order_name || "",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể thêm khách hàng thân thiết");
      }

      toast.success(json.message || `Đã thêm ${selectedCustomer.name} vào nhóm thân thiết!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi thêm khách hàng thân thiết");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-lg shrink-0">
              ⭐
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Thêm Khách Hàng Thân Thiết
              </h3>
              <p className="text-[11px] text-zinc-400">
                Thiết lập hạng thẻ và ghi chú chăm sóc khách hàng
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* 1. Chọn khách hàng */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Khách hàng mục tiêu <span className="text-rose-500">*</span>
            </label>

            {selectedCustomer ? (
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                      {selectedCustomer.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 truncate">
                      <span>{selectedCustomer.phone || "Chưa có SĐT"}</span>
                      <span>•</span>
                      <span>ID: #{selectedCustomer.id}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold">
                        {(selectedCustomer.total_spent || 0).toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  </div>
                </div>

                {!preSelectedCustomer && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs text-rose-600 hover:underline shrink-0 font-medium"
                  >
                    Đổi khách
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Gõ tên hoặc số điện thoại khách hàng trên Sapo..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 animate-spin">
                    ⏳
                  </div>
                )}

                {/* Dropdown kết quả tìm kiếm */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-h-48 overflow-y-auto z-10 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {searchResults.map((c) => {
                      const name = [c.last_name, c.first_name].filter(Boolean).join(" ") || "Khách lẻ";
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomerFromSearch(c)}
                          className="p-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-white">{name}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              {c.phone || "Không có SĐT"} • ID: #{c.id}
                            </div>
                          </div>
                          <div className="text-right font-mono text-[11px] text-emerald-600 font-semibold">
                            {(c.total_spent || 0).toLocaleString("vi-VN")} ₫
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Chọn Hạng Thành Viên */}
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

          {/* 3. Ghi chú chăm sóc */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Ghi chú chăm sóc / Sở thích khách hàng
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ví dụ: Khách thường mua yến sào tinh chế, thích giao chiều tối, tặng kèm đường phèn..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition resize-none"
            />
          </div>

          {/* Modal Footer Actions */}
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
              disabled={submitting || !selectedCustomer}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
            >
              {submitting ? "Đang lưu..." : "⭐ Thêm vào thân thiết"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/context/ToastContext";
import { AddLoyalCustomerModal } from "./AddLoyalCustomerModal";
import { EditLoyalCustomerModal } from "./EditLoyalCustomerModal";
import { LoyalCustomerTier } from "@/server/db/schema";

interface LoyalCustomerItem {
  id: string;
  sapo_customer_id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tier: LoyalCustomerTier;
  discount_percent: number;
  notes?: string;
  total_spent: number;
  orders_count: number;
  last_order_name?: string;
  created_at: string;
  updated_at: string;
  added_by?: string;
}

interface LoyalCustomersTabProps {
  onRefreshParentLoyalMap?: () => void;
}

const TIER_BADGE_CONFIG: Record<
  LoyalCustomerTier,
  { label: string; badge: string; icon: string; style: string }
> = {
  standard: {
    label: "Thân thiết",
    badge: "🥉 Thân thiết",
    icon: "🥉",
    style: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900",
  },
  silver: {
    label: "Hạng Bạc",
    badge: "🥈 Hạng Bạc",
    icon: "🥈",
    style: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
  },
  gold: {
    label: "Hạng Vàng",
    badge: "🥇 Hạng Vàng",
    icon: "🥇",
    style: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  diamond: {
    label: "Kim Cương",
    badge: "💎 Kim Cương",
    icon: "💎",
    style: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
};

export function LoyalCustomersTab({ onRefreshParentLoyalMap }: LoyalCustomersTabProps) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<LoyalCustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLoyal: 0,
    totalSpent: 0,
    totalOrders: 0,
    tierCounts: { standard: 0, silver: 0, gold: 0, diamond: 0 },
  });

  // Filter & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<LoyalCustomerItem | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<LoyalCustomerItem | null>(null);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<LoyalCustomerItem | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const fetchLoyalCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        tier: selectedTier,
      });
      if (activeQuery) {
        params.append("query", activeQuery);
      }

      const res = await fetch(`/api/sapo/customers/loyal?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setCustomers(json.data.customers || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
        setTotalCount(json.data.pagination?.total || 0);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      }
    } catch {
      toast.error("Không thể tải danh sách khách hàng thân thiết");
    } finally {
      setLoading(false);
    }
  }, [page, activeQuery, selectedTier, toast]);

  useEffect(() => {
    fetchLoyalCustomers();
  }, [fetchLoyalCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveQuery(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveQuery("");
    setPage(1);
  };

  const handleCopyPhone = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast.success(`Đã sao chép SĐT: ${phone}`);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleDeleteLoyal = async () => {
    if (!deletingCustomer) return;

    try {
      const res = await fetch(`/api/sapo/customers/loyal?sapo_customer_id=${deletingCustomer.sapo_customer_id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể xóa");
      }
      toast.success(json.message || "Đã xóa khách hàng khỏi nhóm thân thiết");
      setDeletingCustomer(null);
      fetchLoyalCustomers();
      if (onRefreshParentLoyalMap) onRefreshParentLoyalMap();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa khách hàng thân thiết");
    }
  };

  const formatVND = (val: number) => {
    return (val || 0).toLocaleString("vi-VN") + "\u00A0₫";
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* =========================================================================
          1. 4 THẺ KPI DÀNH RIÊNG CHO KHÁCH HÀNG THÂN THIẾT
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1: Tổng khách thân thiết */}
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Khách thân thiết</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs sm:text-sm">
              ⭐
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-zinc-900 dark:text-white">
            {stats.totalLoyal}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">
            {stats.tierCounts.standard} Thân thiết • {stats.tierCounts.silver} Bạc
          </span>
        </div>

        {/* KPI 2: Khách VIP Hạng cao (Vàng + Kim Cương) */}
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Hạng Vàng & Kim Cương</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs sm:text-sm">
              💎
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {stats.tierCounts.gold + stats.tierCounts.diamond}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">
            {stats.tierCounts.gold} Vàng • {stats.tierCounts.diamond} Kim Cương
          </span>
        </div>

        {/* KPI 3: Tổng đơn hàng đã mua */}
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Tổng đơn thân thiết</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs sm:text-sm">
              📦
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {stats.totalOrders.toLocaleString("vi-VN")}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">
            Lượt mua tích lũy
          </span>
        </div>

        {/* KPI 4: Doanh số nhóm thân thiết */}
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Doanh số nhóm thân thiết</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs sm:text-sm">
              💰
            </div>
          </div>
          <div
            className="mt-1 sm:mt-2 text-[14px] sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate tracking-tight"
            title={formatVND(stats.totalSpent)}
          >
            {formatVND(stats.totalSpent)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">
            Tổng chi tiêu tích lũy
          </span>
        </div>
      </div>

      {/* =========================================================================
          2. THANH TÌM KIẾM, BỘ LỌC HẠNG & NÚT THÊM KHÁCH HÀNG
         ========================================================================= */}
      <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs sm:shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Form tìm kiếm */}
          <form onSubmit={handleSearch} className="flex items-center gap-1.5 flex-1">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khách thân thiết theo tên, SĐT..."
                className="w-full pl-7 pr-7 py-1.5 sm:py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              className="py-1.5 sm:py-2 px-3 sm:px-4 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition shadow-2xs shrink-0 cursor-pointer active:scale-95"
            >
              Tìm kiếm
            </button>

            {activeQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="py-1.5 sm:py-2 px-2.5 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition shrink-0 cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>✕</span>
                <span className="hidden sm:inline">Đặt lại</span>
              </button>
            )}
          </form>

          {/* Nút Thêm Khách Hàng Thân Thiết */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="py-2 px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
          >
            <span>⭐</span>
            <span>+ Thêm khách thân thiết</span>
          </button>
        </div>

        {/* Lọc Hạng thành viên */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-zinc-400 font-medium shrink-0 mr-1">Lọc theo hạng:</span>
          {[
            { id: "all", label: `Tất cả (${stats.totalLoyal})` },
            { id: "standard", label: `🥉 Thân thiết (${stats.tierCounts.standard})` },
            { id: "silver", label: `🥈 Hạng Bạc (${stats.tierCounts.silver})` },
            { id: "gold", label: `🥇 Hạng Vàng (${stats.tierCounts.gold})` },
            { id: "diamond", label: `💎 Kim Cương (${stats.tierCounts.diamond})` },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedTier(item.id);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer shrink-0 border ${
                selectedTier === item.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-2xs"
                  : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          3. DANH SÁCH KHÁCH HÀNG THÂN THIẾT (TABLE & CARDS)
         ========================================================================= */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium">
            <span className="animate-spin text-base">⏳</span>
            <span>Đang tải danh sách khách hàng thân thiết...</span>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="text-3xl">⭐</div>
          <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Chưa có khách hàng thân thiết nào trong danh sách
          </div>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Bạn có thể bấm &quot;+ Thêm khách thân thiết&quot; ở trên hoặc gắn sao trực tiếp từ danh sách khách hàng Sapo.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition cursor-pointer shadow-sm"
          >
            + Thêm ngay
          </button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* --- MOBILE CARD VIEW (md:hidden) --- */}
          <div className="md:hidden space-y-2.5">
            {customers.map((c) => {
              const tierCfg = TIER_BADGE_CONFIG[c.tier] || TIER_BADGE_CONFIG.standard;
              const isPhoneCopied = copiedPhone === c.phone;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerForDetail(c)}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 shadow-2xs space-y-2.5 cursor-pointer hover:border-amber-400/60 dark:hover:border-amber-600/60 transition"
                >
                  {/* Hàng 1: Avatar, Tên & Hạng thẻ */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          ID: #{c.sapo_customer_id}
                        </div>
                      </div>
                    </div>

                    {/* Badge Hạng thành viên */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierCfg.style}`}>
                        {tierCfg.badge}
                      </span>
                    </div>
                  </div>

                  {/* Hàng 2: SĐT & Gọi điện */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg flex items-center justify-between gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                    {c.phone ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${c.phone}`}
                          className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>📞</span>
                          <span>{c.phone}</span>
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(c.phone!, e)}
                          className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[11px] cursor-pointer"
                          title="Sao chép SĐT"
                        >
                          {isPhoneCopied ? "✓" : "📋"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic text-[11px]">Chưa có SĐT</span>
                    )}

                    <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatVND(c.total_spent)}
                    </div>
                  </div>

                  {/* Hàng 3: Ghi chú nếu có */}
                  {c.notes && (
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                      📝 <span className="italic">{c.notes}</span>
                    </div>
                  )}

                  {/* Hàng 4: Thao tác */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-xs" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForDetail(c)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{c.orders_count || 0} đơn</span>
                      <span>• Xem chi tiết ›</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingCustomer(c)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                      >
                        Sửa thẻ
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCustomer(c)}
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* --- DESKTOP TABLE VIEW (hidden md:block) --- */}
          <div className="hidden md:block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-xs border-collapse min-w-[960px]">
                <thead>
                  <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-3 w-[20%]">Khách hàng</th>
                    <th className="py-3 px-3 w-[13%]">Số điện thoại</th>
                    <th className="py-3 px-3 w-[15%]">Hạng thành viên</th>
                    <th className="py-3 px-3 w-[14%] text-right whitespace-nowrap">Doanh số tích lũy</th>
                    <th className="py-3 px-3 w-[8%] text-center">Đơn hàng</th>
                    <th className="py-3 px-3 w-[14%]">Ghi chú</th>
                    <th className="py-3 px-3 w-[16%] text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {customers.map((c) => {
                    const tierCfg = TIER_BADGE_CONFIG[c.tier] || TIER_BADGE_CONFIG.standard;
                    const isPhoneCopied = copiedPhone === c.phone;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomerForDetail(c)}
                        className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors cursor-pointer"
                      >
                        {/* Khách hàng */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                                {c.name}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                ID Sapo: #{c.sapo_customer_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Số điện thoại */}
                        <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {c.phone ? (
                            <div className="flex items-center gap-1.5 font-mono text-zinc-600 dark:text-zinc-300">
                              <a
                                href={`tel:${c.phone}`}
                                className="hover:text-blue-600 hover:underline"
                              >
                                {c.phone}
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleCopyPhone(c.phone!, e)}
                                className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
                                title="Sao chép SĐT"
                              >
                                {isPhoneCopied ? "✓" : "📋"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* Hạng thành viên */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierCfg.style}`}>
                              {tierCfg.badge}
                            </span>
                          </div>
                        </td>

                        {/* Doanh số */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatVND(c.total_spent)}
                        </td>

                        {/* Đơn hàng */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {c.orders_count || 0}
                          </span>
                        </td>

                        {/* Ghi chú */}
                        <td className="py-3 px-3">
                          {c.notes ? (
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate max-w-[160px]" title={c.notes}>
                              {c.notes}
                            </div>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-600 text-[11px] italic">—</span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerForDetail(c)}
                              className="px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-medium text-[11px] transition shadow-2xs cursor-pointer"
                              title="Xem chi tiết khách hàng"
                            >
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCustomer(c)}
                              className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium text-[11px] transition shadow-2xs cursor-pointer"
                              title="Chỉnh sửa hạng thẻ"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCustomer(c)}
                              className="px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-medium text-[11px] transition shadow-2xs cursor-pointer"
                              title="Xóa khỏi nhóm thân thiết"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- PAGINATION --- */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between gap-2 p-3 sm:p-4 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
              >
                ‹ Trước
              </button>

              <div className="text-center font-semibold text-zinc-700 dark:text-zinc-300">
                <span>
                  Trang <span className="font-bold text-zinc-900 dark:text-white">{page}</span> / {totalPages}
                </span>
                <span className="hidden sm:inline text-zinc-400 font-normal ml-1.5">
                  ({totalCount.toLocaleString("vi-VN")} khách)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
              >
                Sau ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL THÊM KHÁCH THÂN THIẾT */}
      {isAddModalOpen && (
        <AddLoyalCustomerModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            fetchLoyalCustomers();
            if (onRefreshParentLoyalMap) onRefreshParentLoyalMap();
          }}
        />
      )}

      {/* MODAL SỬA ƯU ĐÃI */}
      {editingCustomer && (
        <EditLoyalCustomerModal
          isOpen={!!editingCustomer}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={() => {
            fetchLoyalCustomers();
            if (onRefreshParentLoyalMap) onRefreshParentLoyalMap();
          }}
        />
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {deletingCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setDeletingCustomer(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center text-lg mx-auto">
              ⚠️
            </div>
            <div className="text-center">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                Xóa khỏi nhóm thân thiết?
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Bạn có chắc chắn muốn xóa khách hàng{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {deletingCustomer.name}
                </span>{" "}
                khỏi danh sách khách hàng thân thiết?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteLoyal}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT KHÁCH HÀNG THÂN THIẾT */}
      {selectedCustomerForDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedCustomerForDetail(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3.5 py-3 sm:px-5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                  {selectedCustomerForDetail.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {selectedCustomerForDetail.name}
                    </h3>
                    {(() => {
                      const tierCfg =
                        TIER_BADGE_CONFIG[selectedCustomerForDetail.tier] ||
                        TIER_BADGE_CONFIG.standard;
                      return (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierCfg.style}`}
                        >
                          {tierCfg.badge}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">
                    Sapo Customer ID: #{selectedCustomerForDetail.sapo_customer_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForDetail(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
                title="Đóng modal"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4">
              {/* Customer Stats (2x2 Grid) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl sm:rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">
                    📦 Tổng số đơn hàng
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {selectedCustomerForDetail.orders_count || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl sm:rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">
                    💰 Doanh số tích lũy
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 truncate whitespace-nowrap">
                    {formatVND(selectedCustomerForDetail.total_spent)}
                  </div>
                </div>
              </div>

              {/* Thông tin liên hệ & chi tiết (2x2 Grid) */}
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] text-zinc-400 font-medium block">
                    📞 Số điện thoại
                  </span>
                  <div className="mt-0.5">
                    {selectedCustomerForDetail.phone ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${selectedCustomerForDetail.phone}`}
                          className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {selectedCustomerForDetail.phone}
                        </a>
                        <button
                          type="button"
                          onClick={(e) =>
                            handleCopyPhone(selectedCustomerForDetail.phone!, e)
                          }
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs p-0.5 cursor-pointer"
                          title="Sao chép SĐT"
                        >
                          {copiedPhone === selectedCustomerForDetail.phone
                            ? "✓"
                            : "📋"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic text-[11px]">
                        Chưa cập nhật
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-medium block">
                    ✉️ Email
                  </span>
                  <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                    {selectedCustomerForDetail.email || "Chưa cập nhật"}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-medium block">
                    📦 Đơn gần nhất
                  </span>
                  <div className="font-mono font-medium text-blue-600 dark:text-blue-400 truncate mt-0.5">
                    {selectedCustomerForDetail.last_order_name || "Chưa có đơn"}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-medium block">
                    📅 Ngày gia nhập VIP
                  </span>
                  <div className="font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {selectedCustomerForDetail.created_at
                      ? new Date(
                          selectedCustomerForDetail.created_at
                        ).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Địa chỉ khách hàng */}
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 text-xs">
                <span className="text-[10px] text-zinc-400 font-medium block">
                  📍 Địa chỉ nhận hàng
                </span>
                <div className="font-medium text-zinc-800 dark:text-zinc-200 mt-1 leading-relaxed">
                  {selectedCustomerForDetail.address || "Chưa có địa chỉ lưu trữ"}
                </div>
              </div>

              {/* Ghi chú chăm sóc & Sở thích */}
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                  <span>📝</span>
                  <span>Ghi chú chăm sóc & Sở thích</span>
                </div>
                {selectedCustomerForDetail.notes ? (
                  <p className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap mt-1">
                    {selectedCustomerForDetail.notes}
                  </p>
                ) : (
                  <p className="text-zinc-400 dark:text-zinc-500 italic text-[11px] mt-1">
                    Chưa có ghi chú chăm sóc đặc biệt cho khách hàng này. Bạn có thể bấm &quot;Sửa thẻ&quot; để bổ sung ghi chú.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {selectedCustomerForDetail.phone && (
                  <a
                    href={`tel:${selectedCustomerForDetail.phone}`}
                    className="py-1.5 px-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>📞</span>
                    <span>Gọi điện</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const cust = selectedCustomerForDetail;
                    setSelectedCustomerForDetail(null);
                    setEditingCustomer(cust);
                  }}
                  className="py-1.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>✏️</span>
                  <span>Sửa thẻ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cust = selectedCustomerForDetail;
                    setSelectedCustomerForDetail(null);
                    setDeletingCustomer(cust);
                  }}
                  className="py-1.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🗑️</span>
                  <span>Xóa</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerForDetail(null)}
                className="px-4 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

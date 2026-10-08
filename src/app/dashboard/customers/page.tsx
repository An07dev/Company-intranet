"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { LoyalCustomersTab } from "@/components/customers/LoyalCustomersTab";
import { AddLoyalCustomerModal } from "@/components/customers/AddLoyalCustomerModal";

interface Address {
  id: number;
  address1: string | null;
  city: string | null;
  province?: string | null;
  district: string | null;
  ward: string | null;
  phone: string | null;
  default?: boolean;
}

interface Customer {
  id: number;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  orders_count: number;
  total_spent: number;
  last_order_id: number | null;
  last_order_name: string | null;
  tags: string;
  note: string | null;
  created_on: string;
  modified_on: string;
  default_address?: Address | null;
  addresses?: Address[];
}

export default function CustomersPage() {
  const { toast } = useToast();

  // Tab State: "all" (Sapo Omnichannel) | "loyal" (Khách hàng thân thiết MongoDB)
  const [activeTab, setActiveTab] = useState<"all" | "loyal">("all");

  // Danh sách ID khách thân thiết để nhận diện badge và nút thao tác
  const [loyalCustomerMap, setLoyalCustomerMap] = useState<
    Record<number, { tier: string; discount_percent: number }>
  >({});
  const [loyalCount, setLoyalCount] = useState(0);

  // Sapo Customers State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pageTotalSpent: 0,
    pageTotalOrders: 0,
    vipCount: 0,
    totalCustomers: 0,
  });

  // Modal Chi tiết khách hàng
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modal Thêm khách hàng vào nhóm thân thiết
  const [isAddLoyalModalOpen, setIsAddLoyalModalOpen] = useState(false);
  const [customerForAddLoyal, setCustomerForAddLoyal] = useState<any | null>(null);

  // 1. Tải danh sách ID khách hàng thân thiết từ MongoDB
  const fetchLoyalMap = useCallback(async () => {
    try {
      const res = await fetch("/api/sapo/customers/loyal?type=ids");
      const json = await res.json();
      if (json.success && json.data) {
        setLoyalCustomerMap(json.data.loyalCustomerMap || {});
        setLoyalCount(json.data.totalLoyal || 0);
      }
    } catch {
      // Bỏ qua lỗi ngầm
    }
  }, []);

  useEffect(() => {
    fetchLoyalMap();
  }, [fetchLoyalMap]);

  // 2. Tải danh sách khách hàng Sapo Omnichannel
  const fetchCustomers = async (p = 1, query = "") => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/sapo/customers?page=${p}&limit=20${query ? `&query=${encodeURIComponent(query)}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tải danh sách khách hàng");
      }
      setCustomers(json.data.customers || []);
      setTotalPages(json.data.pagination.totalPages || 1);
      setTotalCount(json.data.pagination.total || 0);
      setStats(json.data.stats || { pageTotalSpent: 0, pageTotalOrders: 0, vipCount: 0, totalCustomers: 0 });
    } catch (err: any) {
      setError(err.message || "Lỗi tải dữ liệu khách hàng");
      toast.error(err.message || "Lỗi tải dữ liệu khách hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(page, activeQuery);
  }, [page, activeQuery]);

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

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString("vi-VN") + "\u00A0₫";
  };

  const getFullName = (c: Customer) => {
    const parts = [c.last_name, c.first_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Khách lẻ (Chưa đặt tên)";
  };

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-3 sm:space-y-4 max-w-[1650px] mx-auto min-h-screen">
      {/* 1. Header Card */}
      <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Bên trái: Icon, Breadcrumb & Tiêu đề */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg sm:text-xl shrink-0">
              👥
            </div>
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 mb-0.5">
                <span>Sapo CRM & Đối tác</span>
                <span>/</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">Khách hàng đa kênh</span>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-zinc-900 dark:text-white leading-tight truncate">
                  Quản lý Khách hàng & CRM
                </h1>
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {totalCount.toLocaleString("vi-VN")} khách
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 truncate mt-0.5 sm:hidden">
                {totalCount.toLocaleString("vi-VN")} hồ sơ • Sapo Omnichannel
              </div>
            </div>
          </div>

          {/* Ở giữa: 2 TAB TRÊN CÙNG HÀNG TIÊU ĐỀ (PC / Desktop View) */}
          <div className="hidden sm:flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shrink-0">
            {/* Tab 1: Tất cả khách hàng */}
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "all"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>👥</span>
              <span>Tất cả khách hàng</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                {totalCount.toLocaleString("vi-VN")}
              </span>
            </button>

            {/* Tab 2: Khách hàng thân thiết */}
            <button
              type="button"
              onClick={() => setActiveTab("loyal")}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "loyal"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              <span>⭐</span>
              <span>Khách thân thiết</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "loyal"
                    ? "bg-amber-700 text-white"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {loyalCount}
              </span>
            </button>
          </div>

          {/* Bên phải: Nút Làm mới & Xem đơn hàng (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                fetchCustomers(page, activeQuery);
                fetchLoyalMap();
              }}
              disabled={loading}
              className="py-2 px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              <span>Làm mới</span>
            </button>
            <Link
              href="/dashboard/orders"
              className="py-2 px-3.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>📦</span>
              <span>Xem đơn hàng</span>
            </Link>
          </div>
        </div>

        {/* Mobile View: Tab Switcher & Toolbar (sm:hidden) */}
        <div className="sm:hidden pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 w-full">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "all"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <span>👥</span>
              <span>Tất cả khách hàng</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("loyal")}
              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "loyal"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs font-bold"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <span>⭐</span>
              <span>Khách thân thiết</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/orders"
              className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition cursor-pointer text-center"
            >
              <span>📦</span>
              <span>Xem đơn hàng</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                fetchCustomers(page, activeQuery);
                fetchLoyalMap();
              }}
              disabled={loading}
              className="py-2 px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          NỘI DUNG THEO TAB
         ========================================================================= */}
      {activeTab === "loyal" ? (
        <LoyalCustomersTab onRefreshParentLoyalMap={fetchLoyalMap} />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* 2. KPI Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Tổng khách hàng</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs sm:text-sm">
                  👥
                </div>
              </div>
              <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                {totalCount.toLocaleString("vi-VN")}
              </div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Hồ sơ khách hàng</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Khách VIP (trang này)</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs sm:text-sm">
                  💎
                </div>
              </div>
              <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {stats.vipCount}
              </div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Chi tiêu ≥ 1.000.000 ₫</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Tổng đơn đặt (trang này)</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs sm:text-sm">
                  📦
                </div>
              </div>
              <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {stats.pageTotalOrders.toLocaleString("vi-VN")}
              </div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Lượt mua đã ghi nhận</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Doanh số (trang này)</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs sm:text-sm">
                  💰
                </div>
              </div>
              <div
                className="mt-1 sm:mt-2 text-[14px] sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate tracking-tight whitespace-nowrap"
                title={formatCurrency(stats.pageTotalSpent)}
              >
                {formatCurrency(stats.pageTotalSpent)}
              </div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Tổng tiền đã chi</span>
            </div>
          </div>

          {/* 3. Search & Filters Bar */}
          <div className="bg-white dark:bg-zinc-900 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs sm:shadow-sm">
            <form onSubmit={handleSearch} className="flex items-center gap-1.5 sm:gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên khách, SĐT, mã ID..."
                  className="w-full pl-7 pr-7 py-1.5 sm:py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded text-xs cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="py-1.5 sm:py-2 px-3 sm:px-4 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs shrink-0 cursor-pointer active:scale-95"
              >
                Tìm kiếm
              </button>

              {activeQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="py-1.5 sm:py-2 px-2.5 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition shrink-0 cursor-pointer flex items-center gap-1 active:scale-95"
                  title="Xóa bộ lọc tìm kiếm"
                >
                  <span>✕</span>
                  <span className="hidden sm:inline">Đặt lại</span>
                </button>
              )}
            </form>
          </div>

          {/* Error state */}
          {error && (
            <div className="p-3 sm:p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 4. Customer Data Display */}
          {loading ? (
            <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium">
                <span className="animate-spin text-base">⏳</span>
                <span>Đang tải danh sách khách hàng từ Sapo Omnichannel...</span>
              </div>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
              <div className="text-3xl">👥</div>
              <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Không tìm thấy khách hàng nào phù hợp
              </div>
              {activeQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition cursor-pointer"
                >
                  Xóa tìm kiếm
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* =========================================================================
                  GIAO DIỆN MOBILE: DANH SÁCH DẠNG THẺ (CARD VIEW - md:hidden)
                 ========================================================================= */}
              <div className="md:hidden space-y-2.5">
                {customers.map((c) => {
                  const fullName = getFullName(c);
                  const isVip = (c.total_spent || 0) >= 1000000;
                  const addr = c.default_address;
                  const isPhoneCopied = copiedPhone === c.phone;
                  const isLoyal = !!loyalCustomerMap[c.id];

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 shadow-2xs space-y-2.5 transition active:scale-[0.99] cursor-pointer"
                    >
                      {/* Hàng 1: Avatar, Tên khách & Badge VIP / Thân thiết */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isLoyal
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                              : isVip
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              }`}
                          >
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{fullName}</span>
                              {isLoyal ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-white shrink-0">
                                  ⭐ Thân thiết
                                </span>
                              ) : isVip ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500 text-white shrink-0">
                                  VIP
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              ID: #{c.id}
                            </div>
                          </div>
                        </div>

                        {/* Nút hành động Mobile */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!isLoyal && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomerForAddLoyal({
                                  id: c.id,
                                  name: fullName,
                                  phone: c.phone,
                                  email: c.email,
                                  address: addr ? [addr.address1, addr.district, addr.city].filter(Boolean).join(", ") : "",
                                  total_spent: c.total_spent || 0,
                                  orders_count: c.orders_count || 0,
                                  last_order_name: c.last_order_name || null,
                                });
                                setIsAddLoyalModalOpen(true);
                              }}
                              className="px-2 py-1 text-[10px] font-bold rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 transition shrink-0 cursor-pointer"
                            >
                              ⭐ Thêm
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(c);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition shrink-0 cursor-pointer"
                          >
                            Chi tiết ›
                          </button>
                        </div>
                      </div>

                      {/* Hàng 2: SĐT & Địa chỉ khu vực */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          {c.phone ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`tel:${c.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <span>📞</span>
                                <span>{c.phone}</span>
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleCopyPhone(c.phone!, e)}
                                className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[11px]"
                                title="Sao chép SĐT"
                              >
                                {isPhoneCopied ? "✓" : "📋"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">Chưa có số điện thoại</span>
                          )}

                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]">
                            📍 {addr?.city || addr?.province || "Chưa rõ tỉnh thành"}
                          </span>
                        </div>

                        {addr?.address1 && (
                          <div className="text-[10px] text-zinc-400 truncate">
                            {[addr.address1, addr.district].filter(Boolean).join(" • ")}
                          </div>
                        )}
                      </div>

                      {/* Hàng 3: Đơn hàng, Tổng chi tiêu & Đơn cuối */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            📦 {c.orders_count || 0} đơn
                          </span>
                          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatCurrency(c.total_spent)}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-zinc-400 text-right truncate max-w-[120px]">
                          {c.last_order_name || (c.last_order_id ? `#${c.last_order_id}` : "Chưa có đơn")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* =========================================================================
                  GIAO DIỆN DESKTOP: BẢNG TABLE (hidden md:block)
                 ========================================================================= */}
              <div className="hidden md:block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-left text-xs border-collapse min-w-[960px]">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-3 w-[23%]">Khách hàng</th>
                        <th className="py-3 px-3 w-[13%]">Số điện thoại</th>
                        <th className="py-3 px-3 w-[18%]">Khu vực / Địa chỉ</th>
                        <th className="py-3 px-3 w-[8%] text-center">Đơn hàng</th>
                        <th className="py-3 px-3 w-[13%] text-right whitespace-nowrap">Tổng chi tiêu</th>
                        <th className="py-3 px-3 w-[10%]">Đơn cuối</th>
                        <th className="py-3 px-3 w-[15%] text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {customers.map((c) => {
                        const fullName = getFullName(c);
                        const isVip = (c.total_spent || 0) >= 1000000;
                        const addr = c.default_address;
                        const isLoyal = !!loyalCustomerMap[c.id];

                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition cursor-pointer"
                            onClick={() => setSelectedCustomer(c)}
                          >
                            {/* Name & Avatar */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isLoyal
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                    : isVip
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                    }`}
                                >
                                  {fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                                    <span className="truncate">{fullName}</span>
                                    {isLoyal ? (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white shrink-0">
                                        ⭐ Thân thiết
                                      </span>
                                    ) : isVip ? (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500 text-white shrink-0">
                                        VIP
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-[11px] text-zinc-400 font-mono">
                                    ID: #{c.id}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Phone */}
                            <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              {c.phone ? (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`tel:${c.phone}`}
                                    className="font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                  >
                                    <span>📞</span>
                                    <span>{c.phone}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyPhone(c.phone!, e)}
                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
                                    title="Sao chép SĐT"
                                  >
                                    {copiedPhone === c.phone ? "✓" : "📋"}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-zinc-400 italic">Chưa có SĐT</span>
                              )}
                            </td>

                            {/* Address */}
                            <td className="py-3 px-3">
                              {addr ? (
                                <div
                                  className="truncate text-zinc-700 dark:text-zinc-300 max-w-[190px]"
                                  title={`${addr.address1 || ""}, ${addr.district || ""}, ${addr.city || ""}`}
                                >
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {addr.city || addr.province || "Chưa rõ tỉnh/thành"}
                                  </span>
                                  {addr.district && (
                                    <span className="text-zinc-500"> • {addr.district}</span>
                                  )}
                                  <div className="text-[11px] text-zinc-400 truncate">
                                    {addr.address1 || ""}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-zinc-400 italic">Chưa cập nhật</span>
                              )}
                            </td>

                            {/* Orders count */}
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                                {c.orders_count || 0}
                              </span>
                            </td>

                            {/* Total spent */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                {formatCurrency(c.total_spent)}
                              </span>
                            </td>

                            {/* Last order */}
                            <td className="py-3 px-3 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                              {c.last_order_name || (c.last_order_id ? `#${c.last_order_id}` : "Chưa có đơn")}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCustomer(c)}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer shadow-2xs"
                                >
                                  Chi tiết
                                </button>
                                {isLoyal ? (
                                  <span className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70 inline-flex items-center gap-1">
                                    <span>⭐</span>
                                    <span>Thân thiết</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCustomerForAddLoyal({
                                        id: c.id,
                                        name: fullName,
                                        phone: c.phone,
                                        email: c.email,
                                        address: addr ? [addr.address1, addr.district, addr.city].filter(Boolean).join(", ") : "",
                                        total_spent: c.total_spent || 0,
                                        orders_count: c.orders_count || 0,
                                        last_order_name: c.last_order_name || null,
                                      });
                                      setIsAddLoyalModalOpen(true);
                                    }}
                                    className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Thêm vào Khách hàng thân thiết"
                                  >
                                    <span>⭐</span>
                                    <span>+ Thân thiết</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Pagination */}
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
        </div>
      )}

      {/* =========================================================================
          6. MODAL CHI TIẾT KHÁCH HÀNG (MOBILE & DESKTOP OPTIMIZED)
         ========================================================================= */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3.5 py-3 sm:px-5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs sm:text-sm shrink-0">
                  {getFullName(selectedCustomer).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {getFullName(selectedCustomer)}
                    </h3>
                    {loyalCustomerMap[selectedCustomer.id] ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-white shrink-0">
                        ⭐ Thân thiết
                      </span>
                    ) : (selectedCustomer.total_spent || 0) >= 1000000 ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-white shrink-0">
                        VIP
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">
                    Sapo Customer ID: #{selectedCustomer.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
                title="Đóng modal"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4">
              {/* Customer Stats (2x2 Grid) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl sm:rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">📦 Tổng số đơn hàng</div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {selectedCustomer.orders_count || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl sm:rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">💰 Tổng chi tiêu</div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 truncate whitespace-nowrap">
                    {formatCurrency(selectedCustomer.total_spent)}
                  </div>
                </div>
              </div>

              {/* Thông tin liên lạc (2x2 Grid) */}
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] text-zinc-400 font-medium block">📞 Số điện thoại</span>
                  <div className="mt-0.5">
                    {selectedCustomer.phone ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${selectedCustomer.phone}`}
                          className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {selectedCustomer.phone}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(selectedCustomer.phone!)}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs p-0.5"
                          title="Sao chép SĐT"
                        >
                          {copiedPhone === selectedCustomer.phone ? "✓" : "📋"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic text-[11px]">Chưa cập nhật</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-medium block">✉️ Email</span>
                  <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                    {selectedCustomer.email || "Chưa cập nhật"}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-medium block">📦 Đơn gần nhất</span>
                  <div className="font-mono font-medium text-blue-600 dark:text-blue-400 truncate mt-0.5">
                    {selectedCustomer.last_order_name || (selectedCustomer.last_order_id ? `#${selectedCustomer.last_order_id}` : "Chưa có đơn")}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-medium block">📅 Ngày tạo hồ sơ</span>
                  <div className="font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {new Date(selectedCustomer.created_on).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>

              {/* Sổ địa chỉ giao hàng */}
              <div>
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Sổ địa chỉ ({selectedCustomer.addresses?.length || 0})
                </div>
                {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {selectedCustomer.addresses.map((a) => (
                      <div
                        key={a.id}
                        className="p-2.5 sm:p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-zinc-900 dark:text-zinc-100">
                          <span>{a.city || a.district || "Địa chỉ"}</span>
                          {a.default && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {[a.address1, a.ward, a.district, a.city].filter(Boolean).join(", ")}
                        </div>
                        {a.phone && (
                          <div className="text-[10px] font-mono text-zinc-400 mt-1">
                            SĐT nhận: {a.phone}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 italic text-center text-xs">
                    Khách hàng chưa lưu sổ địa chỉ
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-2.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {selectedCustomer.phone && (
                  <a
                    href={`tel:${selectedCustomer.phone}`}
                    className="py-1.5 px-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>📞</span>
                    <span>Gọi điện</span>
                  </a>
                )}

                {/* Nút Thêm / Sửa khách hàng thân thiết từ Modal */}
                <button
                  type="button"
                  onClick={() => {
                    setCustomerForAddLoyal({
                      id: selectedCustomer.id,
                      name: getFullName(selectedCustomer),
                      phone: selectedCustomer.phone,
                      email: selectedCustomer.email,
                      address: [
                        selectedCustomer.default_address?.address1,
                        selectedCustomer.default_address?.district,
                        selectedCustomer.default_address?.city,
                      ]
                        .filter(Boolean)
                        .join(", "),
                      total_spent: selectedCustomer.total_spent || 0,
                      orders_count: selectedCustomer.orders_count || 0,
                      last_order_name: selectedCustomer.last_order_name || null,
                    });
                    setIsAddLoyalModalOpen(true);
                  }}
                  className={`py-1.5 px-3 rounded-xl border font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${loyalCustomerMap[selectedCustomer.id]
                    ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                    }`}
                >
                  <span>⭐</span>
                  <span>{loyalCustomerMap[selectedCustomer.id] ? "Sửa hạng thân thiết" : "+ Thêm vào thân thiết"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="py-1.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs transition cursor-pointer active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM KHÁCH HÀNG THÂN THIẾT */}
      {isAddLoyalModalOpen && (
        <AddLoyalCustomerModal
          isOpen={isAddLoyalModalOpen}
          preSelectedCustomer={customerForAddLoyal}
          onClose={() => {
            setIsAddLoyalModalOpen(false);
            setCustomerForAddLoyal(null);
          }}
          onSuccess={() => {
            fetchLoyalMap();
          }}
        />
      )}
    </div>
  );
}

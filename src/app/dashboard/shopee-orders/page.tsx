"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ShopeeOrder } from "@/types";
import { ShopeeStatusBadge } from "@/components/shopee/ShopeeStatusBadge";
import { ShopeeOrderDetailModal } from "@/components/shopee/ShopeeOrderDetailModal";
import { useToast } from "@/context/ToastContext";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  statusCounts?: Record<string, number>;
  uniqueShops?: string[];
}

export default function ShopeeOrdersPage() {
  const { toast } = useToast();

  const [orders, setOrders] = useState<ShopeeOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedShop, setSelectedShop] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Active Detail Modal & Copy Tracking
  const [selectedOrder, setSelectedOrder] = useState<ShopeeOrder | null>(null);
  const [copiedSn, setCopiedSn] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch orders from API
  const fetchOrders = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
        });

        if (selectedStatus && selectedStatus !== "all") {
          params.append("status", selectedStatus);
        }

        if (selectedShop && selectedShop !== "all") {
          params.append("shop_username", selectedShop);
        }

        if (debouncedSearch) {
          params.append("search", debouncedSearch);
        }

        const res = await fetch(`/api/shopee/orders?${params.toString()}`);
        const json = await res.json();

        if (json.success && json.data) {
          setOrders(json.data.orders || []);
          if (json.data.pagination) {
            setTotalPages(json.data.pagination.totalPages || 1);
            setTotalRecords(json.data.pagination.total || 0);
          }
          if (json.data.stats) {
            setStats(json.data.stats);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải đơn hàng Shopee:", err);
        toast.error("Không thể tải danh sách đơn hàng Shopee");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, selectedStatus, selectedShop, debouncedSearch, toast]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Copy order SN
  const handleCopySn = (sn: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(sn);
    setCopiedSn(sn);
    toast.success(`Đã sao chép mã đơn: ${sn}`);
    setTimeout(() => {
      setCopiedSn(null);
    }, 2000);
  };

  // Copy tracking number
  const handleCopyTracking = (tracking: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(tracking);
    setCopiedTracking(tracking);
    toast.success(`Đã sao chép mã vận đơn: ${tracking}`);
    setTimeout(() => {
      setCopiedTracking(null);
    }, 2000);
  };

  // Delete single order
  const handleDeleteOrder = async (order_sn: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đơn hàng ${order_sn}?`)) return;
    try {
      const res = await fetch(`/api/shopee/orders?order_sn=${encodeURIComponent(order_sn)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa đơn hàng ${order_sn}`);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        toast.error(data.message || "Xóa đơn thất bại");
      }
    } catch {
      toast.error("Lỗi khi kết nối xóa đơn hàng");
    }
  };

  // Delete all orders
  const handleDeleteAllOrders = async () => {
    const total = stats?.totalOrders ?? totalRecords;
    if (total === 0) {
      toast.info("Hiện không có đơn hàng nào trong hệ thống");
      return;
    }

    const confirmed = confirm(
      `⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ ${total} đơn hàng Shopee trong hệ thống?\n\nHành động này không thể hoàn tác!`
    );
    if (!confirmed) return;

    setDeletingAll(true);
    try {
      const res = await fetch("/api/shopee/orders?all=true", {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa sạch toàn bộ ${data.data?.deletedCount ?? total} đơn hàng thành công!`);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        toast.error(data.message || "Xóa toàn bộ đơn thất bại");
      }
    } catch {
      toast.error("Lỗi khi kết nối để xóa toàn bộ đơn hàng");
    } finally {
      setDeletingAll(false);
    }
  };

  // Format VND
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  // Format date/time
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Pagination items
  const paginationItems = useMemo(() => {
    const items: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      if (currentPage <= 4) {
        items.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        items.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        items.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return items;
  }, [totalPages, currentPage]);

  // Status Filter Tabs
  const statusTabs = [
    { key: "all", label: "Tất cả" },
    { key: "Chờ lấy hàng", label: "Chờ lấy hàng" },
    { key: "Đã giao cho ĐVVC", label: "Đã giao cho ĐVVC" },
    { key: "Đã giao", label: "Đã giao" },
    { key: "Chờ xử lý", label: "Chờ xử lý" },
    { key: "Đã hủy", label: "Đã hủy" },
  ];

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3 sm:space-y-4">
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xl shrink-0">
              🛍️
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white leading-tight">
                Đơn Hàng Shopee
              </h1>
              <p className="hidden sm:block text-xs text-zinc-500 mt-0.5">
                Quản lý & theo dõi danh sách đơn hàng đồng bộ tự động từ gian hàng Shopee
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          {/* Nút Xóa toàn bộ đơn */}
          <button
            type="button"
            onClick={handleDeleteAllOrders}
            disabled={deletingAll || (stats?.totalOrders ?? totalRecords) === 0}
            className="flex-1 sm:flex-initial py-2 px-3 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Xóa toàn bộ đơn hàng Shopee khỏi hệ thống"
          >
            <span>{deletingAll ? "⏳" : "🗑️"}</span>
            <span>{deletingAll ? "Đang xóa..." : "Xóa toàn bộ đơn"}</span>
          </button>

          {/* Nút Làm mới */}
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="flex-1 sm:flex-initial py-2 px-3.5 text-xs font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
            title="Làm mới danh sách"
          >
            <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>🔄</span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Thống kê nhanh (Stats Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Tổng số đơn */}
        <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Tổng số đơn hàng</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm sm:text-base">
              📦
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            {stats?.totalOrders ?? totalRecords}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Đã ghi nhận trong hệ thống</span>
        </div>

        {/* Card 2: Tổng doanh thu */}
        <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Tổng doanh thu</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm sm:text-base">
              💰
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {formatVND(stats?.totalRevenue ?? 0)}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Tổng giá trị đơn đã đồng bộ</span>
        </div>

        {/* Card 3: Chờ lấy hàng & Đang giao */}
        <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Đang thực hiện</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm sm:text-base">
              🚚
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {((stats?.statusCounts?.["Chờ lấy hàng"] || 0) +
              (stats?.statusCounts?.["Đã giao cho ĐVVC"] || 0)) ||
              "-"}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Chờ lấy hàng & Trên đường giao</span>
        </div>

        {/* Card 4: Hoàn thành */}
        <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Đã giao thành công</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm sm:text-base">
              🎉
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {stats?.statusCounts?.["Đã giao"] ?? "-"}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Đơn hàng hoàn tất</span>
        </div>
      </div>

      {/* 3. Thanh công cụ tìm kiếm & Bộ lọc trạng thái */}
      <div className="bg-white dark:bg-zinc-900 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold scrollbar-none pb-0.5">
            {statusTabs.map((tab) => {
              const isActive = selectedStatus === tab.key;
              const count =
                tab.key === "all"
                  ? stats?.totalOrders ?? totalRecords
                  : stats?.statusCounts?.[tab.key] ?? null;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap text-xs font-medium ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {tab.label}
                  {count !== null && count !== undefined && (
                    <span
                      className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive
                          ? "bg-zinc-700 text-zinc-200 dark:bg-zinc-300 dark:text-zinc-800"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Ô Tìm kiếm & Phân trang */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Input Search */}
            <div className="relative flex-1 md:w-72">
              <span className="absolute left-3 top-2.5 text-zinc-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Tìm mã đơn, khách hàng, mã vận đơn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Select Shop */}
            {stats?.uniqueShops && stats.uniqueShops.length > 0 && (
              <select
                value={selectedShop}
                onChange={(e) => {
                  setSelectedShop(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none shrink-0"
                title="Lọc theo Shop"
              >
                <option value="all">🏪 Tất cả Shop</option>
                {stats.uniqueShops.map((shopName) => (
                  <option key={shopName} value={shopName}>
                    🏪 {shopName}
                  </option>
                ))}
              </select>
            )}

            {/* Select page size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none shrink-0"
              title="Số dòng mỗi trang"
            >
              <option value={10}>10 / trang</option>
              <option value={25}>25 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Nội dung bảng & Trạng thái tải */}
      {loading ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs text-zinc-500 font-medium">Đang tải danh sách đơn hàng Shopee...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 p-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-500 flex items-center justify-center text-2xl">
            📦
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">
              {debouncedSearch || selectedStatus !== "all" || selectedShop !== "all"
                ? "Không tìm thấy đơn hàng nào phù hợp"
                : "Chưa có đơn hàng nào được đồng bộ"}
            </div>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              {debouncedSearch || selectedStatus !== "all" || selectedShop !== "all"
                ? "Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem tất cả đơn hàng."
                : "Dữ liệu đơn hàng sẽ được tự động đồng bộ từ Chrome Extension Shopee hoặc API POST /api/shopee/orders."}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2">
            {debouncedSearch || selectedStatus !== "all" || selectedShop !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("all");
                  setSelectedShop("all");
                  setCurrentPage(1);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
              >
                Xóa bộ lọc
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fetchOrders(true)}
                disabled={refreshing || loading}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>Làm mới dữ liệu</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ================= GIAO DIỆN DESKTOP (TABLE VIEW) ================= */}
          <div className="hidden lg:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-zinc-500 font-semibold">
                    <th className="py-3 px-4 w-44">Mã đơn hàng</th>
                    <th className="py-3 px-4 w-40">Khách hàng</th>
                    <th className="py-3 px-4 min-w-[240px]">Sản phẩm & Phân loại</th>
                    <th className="py-3 px-4 w-40">Tổng thanh toán</th>
                    <th className="py-3 px-4 w-36">Trạng thái</th>
                    <th className="py-3 px-4 w-48">Vận chuyển & Vận đơn</th>
                    <th className="py-3 px-4 w-32">Thời gian</th>
                    <th className="py-3 px-3 text-right w-16">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {orders.map((order) => {
                    const isCopied = copiedSn === order.order_sn;
                    const isTrackingCopied = copiedTracking === order.tracking_number;
                    const items = order.items || [];
                    const firstItem = items[0];
                    const extraItemsCount = items.length - 1;

                    return (
                      <tr
                        key={order.order_sn}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                      >
                        {/* 1. Mã đơn hàng */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900 dark:text-white tracking-tight">
                              {order.order_sn}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopySn(order.order_sn, e)}
                              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 transition-colors"
                              title="Sao chép mã đơn hàng"
                            >
                              {isCopied ? (
                                <span className="text-emerald-500 font-semibold text-[10px]">✓</span>
                              ) : (
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                          {order.shop_username && (
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              Shop: {order.shop_username}
                            </span>
                          )}
                        </td>

                        {/* 2. Khách hàng */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {order.buyer_username.slice(0, 1).toUpperCase()}
                            </div>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                              {order.buyer_username}
                            </span>
                          </div>
                        </td>

                        {/* 3. Sản phẩm & Phân loại */}
                        <td className="py-3.5 px-4">
                          {firstItem ? (
                            <div className="space-y-1">
                              <div className="flex items-start gap-1.5">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                                  {firstItem.product_name}
                                </span>
                                <span className="shrink-0 font-bold text-zinc-900 dark:text-white text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                                  x{firstItem.quantity}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {firstItem.variation && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                                    {firstItem.variation}
                                  </span>
                                )}
                                {extraItemsCount > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60 font-medium">
                                    +{extraItemsCount} sản phẩm khác
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic">Không có chi tiết</span>
                          )}
                        </td>

                        {/* 4. Tổng thanh toán */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-zinc-900 dark:text-white text-xs">
                            {formatVND(order.total_amount)}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-[140px] mt-0.5">
                            {order.payment_method || "Chưa rõ"}
                          </div>
                        </td>

                        {/* 5. Trạng thái */}
                        <td className="py-3.5 px-4">
                          <ShopeeStatusBadge status={order.order_status} />
                        </td>

                        {/* 6. Vận chuyển & Mã vận đơn */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">
                            {order.shipping_carrier || "Chưa xác định"}
                          </div>
                          {order.tracking_number ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">
                                {order.tracking_number}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyTracking(order.tracking_number!, e)}
                                className="p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                                title="Sao chép mã vận đơn"
                              >
                                {isTrackingCopied ? (
                                  <span className="text-emerald-500 font-bold text-[9px]">✓</span>
                                ) : (
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">Chưa có mã vận đơn</span>
                          )}
                        </td>

                        {/* 7. Thời gian đồng bộ */}
                        <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 text-[11px]">
                          {formatDateTime(order.synced_at)}
                        </td>

                        {/* 8. Thao tác */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Xem chi tiết"
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= GIAO DIỆN MOBILE / TABLET (CARD VIEW) ================= */}
          <div className="lg:hidden space-y-2.5">
            {orders.map((order) => {
              const isCopied = copiedSn === order.order_sn;
              const isTrackingCopied = copiedTracking === order.tracking_number;
              const items = order.items || [];
              const firstItem = items[0];
              const extraItemsCount = items.length - 1;

              return (
                <div
                  key={order.order_sn}
                  onClick={() => setSelectedOrder(order)}
                  className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2.5 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  {/* Row 1: Order SN & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                        {order.order_sn}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopySn(order.order_sn, e)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        title="Sao chép mã đơn"
                      >
                        {isCopied ? "✓" : "📋"}
                      </button>
                    </div>
                    <ShopeeStatusBadge status={order.order_status} size="sm" />
                  </div>

                  {/* Row 2: Sản phẩm tóm tắt */}
                  {firstItem && (
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg text-xs space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {firstItem.product_name}
                        </span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 shrink-0">
                          x{firstItem.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {firstItem.variation && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
                            {firstItem.variation}
                          </span>
                        )}
                        {extraItemsCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-medium">
                            +{extraItemsCount} sản phẩm khác
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Row 3: Khách hàng & Tổng tiền */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Khách:</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {order.buyer_username}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {formatVND(order.total_amount)}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">
                        {order.payment_method || "COD"}
                      </span>
                    </div>
                  </div>

                  {/* Row 4: Vận chuyển & Ngày đồng bộ */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <div className="flex items-center gap-1 truncate max-w-[180px]">
                      <span>🚚 {order.shipping_carrier || "Chưa rõ"}</span>
                      {order.tracking_number && (
                        <button
                          type="button"
                          onClick={(e) => handleCopyTracking(order.tracking_number!, e)}
                          className="font-mono text-zinc-600 dark:text-zinc-300 hover:underline"
                        >
                          ({order.tracking_number}) {isTrackingCopied ? "✓" : ""}
                        </button>
                      )}
                    </div>
                    <span>{formatDateTime(order.synced_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================= THANH PHÂN TRANG (PAGINATION) ================= */}
          {totalRecords > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 text-xs bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              {/* Thống kê bản ghi */}
              <div className="hidden sm:block text-zinc-500 text-center sm:text-left">
                Hiển thị{" "}
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalRecords)}
                </span>{" "}
                trên tổng số{" "}
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {totalRecords}
                </span>{" "}
                đơn hàng
              </div>

              {/* Các nút bấm trang */}
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs"
                >
                  ← Trước
                </button>

                {/* Các số trang (Desktop & Tablet) */}
                <div className="hidden sm:flex items-center gap-1">
                  {paginationItems.map((item, idx) =>
                    item === "..." ? (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-zinc-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${item}`}
                        type="button"
                        onClick={() => setCurrentPage(Number(item))}
                        className={`min-w-[30px] h-7 rounded-lg text-xs font-semibold transition-colors ${
                          currentPage === item
                            ? "bg-orange-600 text-white shadow-sm"
                            : "border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>

                {/* Hiển thị số trang trên Mobile */}
                <span className="sm:hidden text-zinc-600 dark:text-zinc-300 font-semibold text-xs">
                  Trang {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 5. Modal Chi tiết đơn hàng */}
      <ShopeeOrderDetailModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onCopySn={handleCopySn}
        onDelete={handleDeleteOrder}
      />
    </div>
  );
}

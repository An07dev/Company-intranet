"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
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

// Hàm nhận diện và hiển thị Badge kênh / sàn TMĐT
function getChannelBadge(shopUsername?: string) {
  const s = (shopUsername || "").toLowerCase();
  if (s.includes("shopee")) {
    return {
      label: s.includes("sapo") ? "Shopee (Sapo)" : "Shopee",
      badgeClass: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      icon: "🟠",
    };
  }
  if (s.includes("tiktok")) {
    return {
      label: "TikTok Shop",
      badgeClass: "bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800",
      icon: "🖤",
    };
  }
  if (s.includes("lazada")) {
    return {
      label: "Lazada",
      badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      icon: "🔵",
    };
  }
  if (s.includes("pos")) {
    return {
      label: "Tại quầy (POS)",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: "🟢",
    };
  }
  if (s.includes("web")) {
    return {
      label: "Website",
      badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      icon: "🟣",
    };
  }
  return {
    label: shopUsername || "Sapo",
    badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    icon: "🏪",
  };
}

export default function MultiChannelOrdersPage() {
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
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Active Detail Modal & Copy Tracking
  const [selectedOrder, setSelectedOrder] = useState<ShopeeOrder | null>(null);
  const [copiedSn, setCopiedSn] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [syncingSapo, setSyncingSapo] = useState(false);

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
        console.error("Lỗi khi tải đơn hàng:", err);
        toast.error("Không thể tải danh sách đơn hàng");
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
      `⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ ${total} đơn hàng trong hệ thống?\n\nHành động này không thể hoàn tác!`
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

  // Đồng bộ lại toàn bộ đơn hàng từ Sapo Omnichannel
  const handleSyncFromSapo = async () => {
    setSyncingSapo(true);
    try {
      const res = await fetch("/api/sapo/sync-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Đồng bộ đơn hàng từ Sapo thành công!");
        await fetchOrders(true);
      } else {
        toast.error(data.message || "Lỗi đồng bộ từ Sapo");
      }
    } catch {
      toast.error("Không thể kết nối API đồng bộ Sapo");
    } finally {
      setSyncingSapo(false);
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
    { key: "Chờ xử lý", label: "Chờ xử lý" },
    { key: "Đang giao", label: "Đang giao hàng" },
    { key: "Đã giao", label: "Đã giao" },
    { key: "Đã hủy", label: "Đã hủy" },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 space-y-5 max-w-7xl mx-auto">
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xl shrink-0">
              🛍️
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-0.5">
                <span>Nghiệp vụ bán hàng</span>
                <span>/</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">Quản lý đơn hàng</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white leading-tight">
                Đơn Hàng Đa Kênh
              </h1>
              <p className="hidden sm:block text-xs text-zinc-500 mt-0.5">
                Quản lý & theo dõi danh sách đơn hàng tự động từ Sapo (Shopee, TikTok Shop, Lazada, POS, Web)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <Link
            href="/dashboard/webhooks"
            className="py-2 px-3 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>Cấu hình Webhook</span>
          </Link>

          <button
            type="button"
            onClick={handleSyncFromSapo}
            disabled={syncingSapo}
            className="py-2 px-3.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-60"
            title="Đồng bộ lại đơn hàng trực tiếp từ Sapo Omnichannel"
          >
            <span className={syncingSapo ? "animate-spin" : ""}>📥</span>
            <span>{syncingSapo ? "Đang đồng bộ..." : "Đồng bộ từ Sapo"}</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteAllOrders}
            disabled={deletingAll || (stats?.totalOrders ?? totalRecords) === 0}
            className="py-2 px-3 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-40"
            title="Xóa toàn bộ đơn hàng"
          >
            <span>{deletingAll ? "⏳" : "🗑️"}</span>
            <span className="hidden sm:inline">{deletingAll ? "Đang xóa..." : "Xóa hết"}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="py-2 px-3.5 text-xs font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-60"
            title="Làm mới danh sách"
          >
            <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>🔄</span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Thống kê nhanh (Stats Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Tổng số đơn hàng</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm">
              📦
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {stats?.totalOrders ?? totalRecords}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Đã ghi nhận trong hệ thống</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Tổng doanh thu</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">
              💰
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatVND(stats?.totalRevenue ?? 0)}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Tổng giá trị đơn</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Chờ xử lý</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm">
              ⏳
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats?.statusCounts?.["Chờ xử lý"] ?? 0}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Cần chuẩn bị & đóng gói</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Đã giao hàng</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm">
              🚚
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {stats?.statusCounts?.["Đã giao hàng"] ?? stats?.statusCounts?.["Đã giao"] ?? 0}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Hoàn tất giao dịch</span>
        </div>
      </div>

      {/* 3. Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs Trạng thái */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {statusTabs.map((tab) => {
              const isActive = selectedStatus === tab.key;
              const count = tab.key === "all" ? stats?.totalOrders : stats?.statusCounts?.[tab.key];

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
                title="Lọc theo kênh / sàn"
              >
                <option value="all">🏪 Tất cả Kênh</option>
                {stats.uniqueShops.map((shopName) => (
                  <option key={shopName} value={shopName}>
                    {shopName}
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
              <option value={15}>15 / trang</option>
              <option value={30}>30 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Nội dung bảng & Trạng thái tải */}
      {loading ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs text-zinc-500 font-medium">Đang tải danh sách đơn hàng...</div>
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
                : "Dữ liệu đơn hàng sẽ được tự động đồng bộ qua Webhook Sapo (POST /api/webhooks/sapo) hoặc Chrome Extension."}
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
              <Link
                href="/dashboard/webhooks"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>⚡</span>
                <span>Kiểm tra Webhook Sapo</span>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Table View */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-zinc-500 font-semibold">
                    <th className="py-3 px-4 w-44">Mã đơn hàng</th>
                    <th className="py-3 px-4 w-36">Kênh / Sàn</th>
                    <th className="py-3 px-4 w-40">Khách hàng</th>
                    <th className="py-3 px-4 min-w-[220px]">Sản phẩm & Phân loại</th>
                    <th className="py-3 px-4 w-36">Tổng thanh toán</th>
                    <th className="py-3 px-4 w-36">Trạng thái</th>
                    <th className="py-3 px-4 w-44">Vận chuyển</th>
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
                    const channel = getChannelBadge(order.shop_username);

                    return (
                      <tr
                        key={order.order_sn}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                      >
                        {/* 1. Mã đơn */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900 dark:text-white tracking-tight">
                              {order.order_sn}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopySn(order.order_sn, e)}
                              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                              title="Sao chép mã đơn"
                            >
                              {isCopied ? "✓" : "📋"}
                            </button>
                          </div>
                        </td>

                        {/* 2. Kênh / Sàn */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${channel.badgeClass}`}>
                            <span>{channel.icon}</span>
                            <span>{channel.label}</span>
                          </span>
                        </td>

                        {/* 3. Khách hàng */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-zinc-900 dark:text-white truncate max-w-[150px]">
                            {order.buyer_username || "Khách mua"}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate max-w-[150px]">
                            {order.payment_method || "COD"}
                          </div>
                        </td>

                        {/* 4. Sản phẩm */}
                        <td className="py-3.5 px-4">
                          {firstItem ? (
                            <div>
                              <div className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1">
                                {firstItem.product_name}
                              </div>
                              <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                                {firstItem.variation && (
                                  <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded text-[10px]">
                                    {firstItem.variation}
                                  </span>
                                )}
                                <span>x{firstItem.quantity}</span>
                                {extraItemsCount > 0 && (
                                  <span className="text-orange-600 dark:text-orange-400 font-semibold text-[10px]">
                                    +{extraItemsCount} SP khác
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic">Không có chi tiết</span>
                          )}
                        </td>

                        {/* 5. Tổng thanh toán */}
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {formatVND(order.total_amount)}
                          </span>
                        </td>

                        {/* 6. Trạng thái */}
                        <td className="py-3.5 px-4">
                          <ShopeeStatusBadge status={order.order_status} />
                        </td>

                        {/* 7. Vận chuyển */}
                        <td className="py-3.5 px-4">
                          <div className="text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">
                            {order.shipping_carrier || "Chưa gán"}
                          </div>
                          {order.tracking_number && (
                            <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-500 mt-0.5">
                              <span className="truncate max-w-[120px]">{order.tracking_number}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyTracking(order.tracking_number!, e)}
                                className="text-zinc-400 hover:text-zinc-700 p-0.5"
                                title="Sao chép mã vận đơn"
                              >
                                {isTrackingCopied ? "✓" : "📋"}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* 8. Thời gian */}
                        <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap text-[11px]">
                          {formatDateTime(order.createdAt || order.synced_at)}
                        </td>

                        {/* 9. Chi tiết */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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

            {/* Phân trang */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <div className="text-zinc-500">
                Hiển thị <span className="font-semibold text-zinc-900 dark:text-white">{orders.length}</span> /{" "}
                <span className="font-semibold text-zinc-900 dark:text-white">{totalRecords}</span> đơn hàng
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    ‹ Trước
                  </button>

                  {paginationItems.map((page, idx) =>
                    typeof page === "number" ? (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg font-medium transition-colors ${
                          currentPage === page
                            ? "bg-orange-600 text-white font-bold"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                        }`}
                      >
                        {page}
                      </button>
                    ) : (
                      <span key={idx} className="px-1 text-zinc-400">
                        ...
                      </span>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    Sau ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Chi tiết Đơn hàng */}
      {selectedOrder && (
        <ShopeeOrderDetailModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onDelete={handleDeleteOrder}
        />
      )}
    </div>
  );
}

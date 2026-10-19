"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/context/ToastContext";
import { Package, PackageStatus } from "@/types";
import { CreatePackageModal } from "@/components/packages/CreatePackageModal";
import { PackageQRPrintModal } from "@/components/packages/PackageQRPrintModal";
import { PackageScannerModal } from "@/components/packages/PackageScannerModal";
import { PackageDetailModal } from "@/components/packages/PackageDetailModal";

export default function PackagesPage() {
  const { toast } = useToast();

  // Data states
  const [packages, setPackages] = useState<Package[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    draft: number;
    packed: number;
    inTransit: number;
    delivered: number;
    cancelled: number;
    totalItems: number;
    totalValue: number;
  }>({
    total: 0,
    draft: 0,
    packed: 0,
    inTransit: 0,
    delivered: 0,
    cancelled: 0,
    totalItems: 0,
    totalValue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Mobile filters drawer / dropdown toggle
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [packageToEdit, setPackageToEdit] = useState<Package | null>(null);

  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [packageToPrint, setPackageToPrint] = useState<Package | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  // Fetch Packages List
  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        sortBy,
        sortOrder: "desc",
      });

      if (activeSearch) params.set("search", activeSearch);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter && typeFilter !== "all") params.set("package_type", typeFilter);

      const res = await fetch(`/api/packages?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setPackages(json.data.packages || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
        setTotalCount(json.data.pagination?.total || 0);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      } else {
        throw new Error(json.message || "Lỗi tải danh sách kiện hàng");
      }
    } catch (err: any) {
      console.error("fetchPackages error:", err);
      setError(err.message || "Không thể tải danh sách kiện hàng");
    } finally {
      setLoading(false);
    }
  }, [page, activeSearch, statusFilter, typeFilter, sortBy]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Debounced or on-submit search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(search.trim());
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setPackageToEdit(null);
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (pkg: Package) => {
    setPackageToEdit(pkg);
    setIsCreateOpen(true);
  };

  // Open Print Modal
  const handleOpenPrint = (pkg: Package) => {
    setPackageToPrint(pkg);
    setIsPrintOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (pkg: Package) => {
    setSelectedPackage(pkg);
    setIsDetailOpen(true);
  };

  // Copy code helper
  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success(`Đã sao chép mã: ${code}`);
  };

  // Status badge config
  const getStatusBadge = (status: PackageStatus) => {
    switch (status) {
      case "draft":
        return {
          label: "Bản nháp",
          class: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
        };
      case "packed":
        return {
          label: "Đã đóng gói",
          class: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
      case "in_transit":
        return {
          label: "Đang chuyển",
          class: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      case "delivered":
        return {
          label: "Đã hoàn thành",
          class: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
      case "cancelled":
        return {
          label: "Đã hủy",
          class: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        };
      default:
        return { label: status, class: "bg-zinc-100 text-zinc-800 border-zinc-200" };
    }
  };

  const statusPills: Array<{ key: string; label: string; count?: number }> = [
    { key: "all", label: "Tất cả", count: stats.total },
    { key: "draft", label: "Nháp", count: stats.draft },
    { key: "packed", label: "Đã đóng", count: stats.packed },
    { key: "in_transit", label: "Đang chuyển", count: stats.inTransit },
    { key: "delivered", label: "Hoàn thành", count: stats.delivered },
    { key: "cancelled", label: "Đã hủy", count: stats.cancelled },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* 1. Header & Actions (Mobile Optimized) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg sm:text-xl shrink-0 font-bold">
              📦
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                Quản Lý Kiện Hàng
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                Tạo kiện, in tem QR và quét mã kiểm kho xuất nhập
              </p>
            </div>
          </div>

          {/* Nút Làm mới trên Mobile */}
          <button
            type="button"
            onClick={fetchPackages}
            disabled={loading}
            className="sm:hidden p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            title="Làm mới dữ liệu"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Action Buttons Grid on Mobile */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          {/* Nút Quét mã QR */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold text-xs shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="text-base">📷</span>
            <span>Quét QR Kiện</span>
          </button>

          {/* Nút Tạo kiện hàng mới */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="py-2.5 px-3 sm:px-5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="text-base">➕</span>
            <span>Tạo Kiện Mới</span>
          </button>

          {/* Nút Làm mới trên Desktop */}
          <button
            type="button"
            onClick={fetchPackages}
            disabled={loading}
            className="hidden sm:flex p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards (Hiển thị toàn bộ, không cuộn ngang) */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5">
        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <span className="text-[10.5px] sm:text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block truncate">
            Tổng kiện
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-black text-zinc-900 dark:text-white">
              {stats.total}
            </span>
            <span className="text-[9px] text-zinc-400">kiện</span>
          </div>
        </div>

        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <span className="text-[10.5px] sm:text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block truncate">
            Bản nháp
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-black text-zinc-700 dark:text-zinc-300">
              {stats.draft}
            </span>
            <span className="text-[9px] text-zinc-400">kiện</span>
          </div>
        </div>

        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/60 shadow-xs">
          <span className="text-[10.5px] sm:text-[11px] font-semibold text-amber-700 dark:text-amber-400 block truncate">
            Đã đóng gói
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.packed}
            </span>
            <span className="text-[9px] text-amber-600/70">kiện</span>
          </div>
        </div>

        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/60 shadow-xs">
          <span className="text-[10.5px] sm:text-[11px] font-semibold text-blue-700 dark:text-blue-400 block truncate">
            Đang chuyển
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-black text-blue-600 dark:text-blue-400">
              {stats.inTransit}
            </span>
            <span className="text-[9px] text-blue-600/70">kiện</span>
          </div>
        </div>

        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/60 shadow-xs">
          <span className="text-[10.5px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block truncate">
            Hoàn thành
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.delivered}
            </span>
            <span className="text-[9px] text-emerald-600/70">kiện</span>
          </div>
        </div>

        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/60 shadow-xs">
          <span className="text-[10.5px] sm:text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 block truncate">
            Tổng hàng
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {stats.totalItems}
            </span>
            <span className="text-[9px] text-indigo-600/70">sp</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Horizontal Pills Filter (Mobile First) */}
      <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2.5">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã kiện, tên kiện, SKU, sản phẩm..."
              className="w-full pl-9 pr-16 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveSearch("");
                  setPage(1);
                }}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 text-xs"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px]"
            >
              Tìm
            </button>
          </form>

          {/* Toggle filter phụ trên mobile */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`p-2 rounded-xl border text-xs flex items-center justify-center gap-1 transition-colors ${
              showAdvancedFilters || typeFilter !== "all" || sortBy !== "createdAt"
                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400"
                : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
            }`}
            title="Bộ lọc nâng cao"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {/* Thanh Status Pills cuộn ngang mượt mà */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {statusPills.map((pill) => {
            const isActive = statusFilter === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => {
                  setStatusFilter(pill.key);
                  setPage(1);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-medium text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                <span>{pill.label}</span>
                {pill.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    {pill.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Advanced Filters (Loại kiện & Sắp xếp) - Hiện khi mở toggle hoặc trên desktop */}
        {(showAdvancedFilters || true) && (
          <div className={`${showAdvancedFilters ? "grid" : "hidden sm:grid"} grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80`}>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Loại kiện hàng:</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[11px] font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">Tất cả loại kiện</option>
                <option value="Đóng hàng xuất">Đóng hàng xuất</option>
                <option value="Đóng hàng sỉ / Đại lý">Đóng sỉ / Đại lý</option>
                <option value="Chuyển kho nội bộ">Chuyển kho nội bộ</option>
                <option value="Đơn sàn TMĐT">Đơn sàn TMĐT</option>
                <option value="Lưu kho / Gom kiện">Lưu kho</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Thứ tự sắp xếp:</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[11px] font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="createdAt">Mới nhất trước</option>
                <option value="total_items">Nhiều sản phẩm nhất</option>
                <option value="title">Tên A-Z</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. Content Area: Mobile Cards & Desktop Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 sm:py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="font-semibold text-zinc-500 text-xs">Đang tải danh sách kiện hàng...</p>
          </div>
        ) : error ? (
          <div className="py-12 sm:py-16 text-center space-y-3 px-4">
            <div className="text-3xl">⚠️</div>
            <p className="font-bold text-rose-600 text-xs sm:text-sm">{error}</p>
            <button
              type="button"
              onClick={fetchPackages}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
            >
              Thử lại
            </button>
          </div>
        ) : packages.length === 0 ? (
          <div className="py-14 sm:py-20 text-center space-y-3 px-4">
            <div className="text-3xl sm:text-4xl">📦</div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-base">
              Không tìm thấy kiện hàng nào
            </h3>
            <p className="text-zinc-500 text-[11px] sm:text-xs max-w-sm mx-auto">
              Chưa có kiện hàng nào khớp với bộ lọc, hoặc bạn chưa tạo kiện hàng nào.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
            >
              + Tạo Kiện Hàng Mới
            </button>
          </div>
        ) : (
          <>
            {/* --- A. GIAO DIỆN MOBILE: DẠNG THẺ (CARD VIEW) GỌN GÀNG --- */}
            <div className="block md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {packages.map((pkg) => {
                const badge = getStatusBadge(pkg.status);

                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleOpenDetail(pkg)}
                    className="p-3.5 space-y-2.5 active:bg-zinc-50 dark:active:bg-zinc-800/60 transition-colors cursor-pointer"
                  >
                    {/* Hàng 1: Mã kiện + nút copy + Badge trạng thái */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                          {pkg.code}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(pkg.code, e)}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          title="Sao chép mã"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${badge.class}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Hàng 2: Tên kiện + Loại kiện */}
                    <div>
                      <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-1">
                        {pkg.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                          {pkg.package_type}
                        </span>
                        {pkg.destination && (
                          <span className="truncate">📍 {pkg.destination}</span>
                        )}
                        {pkg.warehouse_location && (
                          <span className="truncate font-mono">🏷️ {pkg.warehouse_location}</span>
                        )}
                      </div>
                    </div>

                    {/* Hàng 3: Danh sách sản phẩm thu nhỏ */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-xl space-y-1 text-[11px]">
                      {pkg.items.slice(0, 2).map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                          <span className="truncate pr-2 font-medium">
                            • {it.product_name}
                          </span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                            x{it.quantity} {it.unit || "Cái"}
                          </span>
                        </div>
                      ))}
                      {pkg.items.length > 2 && (
                        <div className="text-[10px] text-zinc-400 italic pt-0.5">
                          + {pkg.items.length - 2} mặt hàng khác trong kiện...
                        </div>
                      )}
                    </div>

                    {/* Hàng 4: Thống kê tổng số sp & Nút hành động */}
                    <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[11px]">
                        <span className="text-zinc-400">Tổng: </span>
                        <strong className="font-mono text-zinc-900 dark:text-zinc-100">
                          {pkg.total_items} sp
                        </strong>{" "}
                        <span className="text-zinc-400 text-[10px]">({pkg.items.length} loại)</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPrint(pkg)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-medium text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <span>🖨️</span>
                          <span>In QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDetail(pkg)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-medium text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <span>👁️</span>
                          <span>Chi tiết</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(pkg)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Sửa kiện"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* --- B. GIAO DIỆN DESKTOP: DẠNG BẢNG TABLE ĐẦY ĐỦ --- */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-500">
                    <th className="py-3 px-4">Mã kiện hàng</th>
                    <th className="py-3 px-4">Tên kiện & Phân loại</th>
                    <th className="py-3 px-4">Sản phẩm trong kiện</th>
                    <th className="py-3 px-4 text-center">Tổng SL</th>
                    <th className="py-3 px-4">Điểm đến / Kệ kho</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Người tạo & Ngày</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {packages.map((pkg) => {
                    const badge = getStatusBadge(pkg.status);

                    return (
                      <tr
                        key={pkg.id}
                        className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
                        onClick={() => handleOpenDetail(pkg)}
                      >
                        {/* Mã kiện hàng */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenPrint(pkg)}
                              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-zinc-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              title="In tem mã QR"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                            </button>
                            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                              {pkg.code}
                            </span>
                          </div>
                        </td>

                        {/* Tên kiện & loại */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                            {pkg.title}
                          </p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                            {pkg.package_type}
                          </span>
                        </td>

                        {/* Tóm tắt sản phẩm bên trong */}
                        <td className="py-3.5 px-4 max-w-sm">
                          <div className="space-y-1">
                            {pkg.items.slice(0, 2).map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  x{it.quantity}
                                </span>
                                <span className="truncate">{it.product_name}</span>
                                {it.variation_name && (
                                  <span className="text-[10px] text-zinc-400 font-normal">
                                    ({it.variation_name})
                                  </span>
                                )}
                              </div>
                            ))}
                            {pkg.items.length > 2 && (
                              <span className="text-[10px] text-zinc-400 italic">
                                + {pkg.items.length - 2} mặt hàng khác...
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Tổng số lượng */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 block">
                            {pkg.total_items}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {pkg.items.length} mặt hàng
                          </span>
                        </td>

                        {/* Điểm đến / Vị trí kho */}
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                          {pkg.destination && (
                            <div className="line-clamp-1 font-medium text-zinc-900 dark:text-zinc-200">
                              {pkg.destination}
                            </div>
                          )}
                          {pkg.warehouse_location && (
                            <div className="text-[10px] font-mono text-zinc-400">
                              Vị trí: {pkg.warehouse_location}
                            </div>
                          )}
                          {!pkg.destination && !pkg.warehouse_location && "--"}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${badge.class}`}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Người tạo & Ngày */}
                        <td className="py-3.5 px-4 text-zinc-500">
                          <div className="font-medium text-zinc-800 dark:text-zinc-200">
                            {pkg.created_by?.name || "Kho vận"}
                          </div>
                          <div className="text-[10px]">
                            {new Date(pkg.createdAt).toLocaleDateString("vi-VN")}
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenPrint(pkg)}
                              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="In tem mã QR"
                            >
                              🖨️
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDetail(pkg)}
                              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                              title="Xem chi tiết kiện"
                            >
                              👁️
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(pkg)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Chỉnh sửa kiện hàng"
                            >
                              ✏️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Phân trang (Responsive) */}
        {totalPages > 1 && (
          <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] sm:text-xs text-zinc-500">
            <span>
              Trang <strong>{page}</strong>/<strong>{totalPages}</strong> (<strong>{totalCount}</strong> kiện)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: TẠO HOẶC SỬA KIỆN HÀNG */}
      <CreatePackageModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        packageToEdit={packageToEdit}
        onSuccess={() => {
          fetchPackages();
        }}
      />

      {/* MODAL 2: IN TEM MÃ QR KIỆN HÀNG */}
      <PackageQRPrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        packageData={packageToPrint}
      />

      {/* MODAL 3: QUÉT MÃ QR KIỆN HÀNG */}
      <PackageScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSelectPackage={(pkg) => {
          handleOpenDetail(pkg);
        }}
        onOpenPrint={(pkg) => {
          handleOpenPrint(pkg);
        }}
      />

      {/* MODAL 4: XEM CHI TIẾT KIỆN HÀNG */}
      <PackageDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        packageData={selectedPackage}
        onEdit={(pkg) => {
          handleOpenEdit(pkg);
        }}
        onPrint={(pkg) => {
          handleOpenPrint(pkg);
        }}
        onPackageUpdated={(updated) => {
          setSelectedPackage(updated);
          fetchPackages();
        }}
        onPackageDeleted={() => {
          setSelectedPackage(null);
          fetchPackages();
        }}
      />
    </div>
  );
}

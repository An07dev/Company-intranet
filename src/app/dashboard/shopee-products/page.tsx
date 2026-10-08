"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ShopeeProduct } from "@/types";
import { ShopeeProductDetailModal } from "@/components/shopee/ShopeeProductDetailModal";
import { useToast } from "@/context/ToastContext";

interface ProductStats {
  totalProducts: number;
  inStockCount: number;
  outOfStockCount: number;
  totalStock: number;
  totalSales30d: number;
  totalVariations: number;
  uniqueShops?: string[];
}

export default function ShopeeProductsPage() {
  const { toast } = useToast();

  const [products, setProducts] = useState<ShopeeProduct[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [syncingSapo, setSyncingSapo] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stockStatus, setStockStatus] = useState<string>("all");
  const [selectedShop, setSelectedShop] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Active Detail Modal & Copy Tracking
  const [selectedProduct, setSelectedProduct] = useState<ShopeeProduct | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch products
  const fetchProducts = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
        });

        if (stockStatus && stockStatus !== "all") {
          params.append("stock_status", stockStatus);
        }

        if (selectedShop && selectedShop !== "all") {
          params.append("shop_username", selectedShop);
        }

        if (debouncedSearch) {
          params.append("search", debouncedSearch);
        }

        const res = await fetch(`/api/shopee/products?${params.toString()}`);
        const json = await res.json();

        if (json.success && json.data) {
          setProducts(json.data.products || []);
          if (json.data.pagination) {
            setTotalPages(json.data.pagination.totalPages || 1);
            setTotalRecords(json.data.pagination.total || 0);
          }
          if (json.data.stats) {
            setStats(json.data.stats);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải sản phẩm Shopee:", err);
        toast.error("Không thể tải danh sách sản phẩm Shopee");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, stockStatus, selectedShop, debouncedSearch, toast]
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Copy helper
  const handleCopy = (text: string, label: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`Đã sao chép ${label}: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete single product
  const handleDeleteProduct = async (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm ID: ${itemId}?`)) return;

    try {
      const res = await fetch(`/api/shopee/products?item_id=${itemId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Đã xóa sản phẩm thành công");
        fetchProducts(true);
      } else {
        toast.error("Không thể xóa sản phẩm: " + json.message);
      }
    } catch {
      toast.error("Lỗi khi xóa sản phẩm");
    }
  };

  // Delete all products
  const handleDeleteAll = async () => {
    if (
      !confirm(
        "⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ sản phẩm Shopee đã lưu trên hệ thống?\nThao tác này không thể hoàn tác!"
      )
    )
      return;

    setDeletingAll(true);
    try {
      const res = await fetch("/api/shopee/products?all=true", { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(`Đã xóa sạch ${json.data?.deletedCount || 0} sản phẩm`);
        fetchProducts(true);
      } else {
        toast.error("Lỗi khi xóa tất cả: " + json.message);
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleSyncFromSapo = async () => {
    setSyncingSapo(true);
    try {
      const res = await fetch("/api/sapo/sync-all", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Đã đồng bộ toàn bộ 432 sản phẩm từ Sapo!");
        fetchProducts(true);
      } else {
        toast.error("Lỗi đồng bộ Sapo: " + json.message);
      }
    } catch {
      toast.error("Không thể kết nối API Sapo");
    } finally {
      setSyncingSapo(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Quản Lý Sản Phẩm Shopee
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
              Shopee Seller Center
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Đồng bộ và theo dõi thông tin hàng hóa, giá bán, tồn kho và các phân loại từ Kênh Người Bán Shopee
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncFromSapo}
            disabled={syncingSapo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-60"
            title="Đồng bộ toàn bộ 432 sản phẩm trực tiếp từ Sapo Admin API"
          >
            <span className={syncingSapo ? "animate-spin" : ""}>📥</span>
            <span>{syncingSapo ? "Đang kéo từ Sapo..." : "Đồng bộ từ Sapo"}</span>
          </button>

          <button
            onClick={() => fetchProducts(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-orange-500" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{refreshing ? "Đang làm mới..." : "Làm mới"}</span>
          </button>


        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1: Tổng sản phẩm */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng sản phẩm</span>
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
              📦
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats?.totalProducts ? stats.totalProducts.toLocaleString("vi-VN") : "0"}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {stats?.totalVariations ? `${stats.totalVariations} phân loại hàng` : "Chưa có phân loại"}
            </div>
          </div>
        </div>

        {/* Card 2: Còn hàng */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Còn hàng</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              ✅
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats?.inStockCount ? stats.inStockCount.toLocaleString("vi-VN") : "0"}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Sẵn sàng giao ngay</div>
          </div>
        </div>

        {/* Card 3: Hết hàng */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Hết hàng</span>
            <span className="p-2 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              ⚠️
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats?.outOfStockCount ? stats.outOfStockCount.toLocaleString("vi-VN") : "0"}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Cần nhập thêm hàng</div>
          </div>
        </div>

        {/* Card 4: Tổng tồn kho */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng tồn kho</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              🏷️
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats?.totalStock ? stats.totalStock.toLocaleString("vi-VN") : "0"}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Tất cả mã phân loại</div>
          </div>
        </div>

        {/* Card 5: Doanh số 30 ngày */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Doanh số 30 ngày</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              📈
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats?.totalSales30d ? stats.totalSales30d.toLocaleString("vi-VN") : "0"}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Sản phẩm đã bán</div>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên sản phẩm, SKU cha, SKU phân loại, ID..."
            className="w-full pl-10 pr-8 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-zinc-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Shop Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Shop:</span>
            <select
              value={selectedShop}
              onChange={(e) => {
                setSelectedShop(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            >
              <option value="all">Tất cả gian hàng</option>
              {stats?.uniqueShops && stats.uniqueShops.length > 0 ? (
                stats.uniqueShops.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              ) : (
                <option value="baobiyensen">baobiyensen</option>
              )}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Tồn kho:</span>
            <select
              value={stockStatus}
              onChange={(e) => {
                setStockStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="in_stock">Còn hàng (&gt; 0)</option>
              <option value="out_of_stock">Hết hàng (= 0)</option>
            </select>
          </div>

          {/* Page Size */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Products Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Đang tải danh sách sản phẩm Shopee...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="text-4xl">📦</div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              Chưa có sản phẩm nào
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Bấm nút <strong className="text-emerald-600">"📥 Đồng bộ từ Sapo"</strong> ở trên để kéo toàn bộ 432 sản phẩm & số lượng tồn kho tự động về hệ thống.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100/60 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 font-semibold uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Sản phẩm Shopee</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Mã SKU Cha / ID</th>
                  <th className="py-3.5 px-4 text-center">Phân loại</th>
                  <th className="py-3.5 px-4 text-right">Khoảng giá bán</th>
                  <th className="py-3.5 px-4 text-center">Tồn kho</th>
                  <th className="py-3.5 px-4 text-center">Doanh số 30d</th>
                  <th className="py-3.5 px-4 text-center">Gian hàng</th>
                  <th className="py-3.5 px-4 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {products.map((p, idx) => {
                  const varCount = (p.variations || []).length;
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={p.item_id || p.id}
                      onClick={() => setSelectedProduct(p)}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center text-zinc-400 font-medium">
                        {rowNumber}
                      </td>

                      {/* Product Name & Image */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                // Nếu ảnh lỗi 403 hoặc hỏng, ẩn thẻ img và hiển thị icon dự phòng
                                (e.currentTarget as HTMLElement).style.display = "none";
                                const fallback = e.currentTarget.parentElement?.querySelector(".img-fallback");
                                if (fallback) (fallback as HTMLElement).style.display = "flex";
                              }}
                              className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 shadow-sm"
                            />
                          ) : null}
                          <div
                            className="img-fallback w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 items-center justify-center text-lg font-bold shrink-0 shadow-sm"
                            style={{ display: p.image ? "none" : "flex" }}
                          >
                            📦
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 hover:text-orange-600 transition-colors leading-snug">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {p.product_url && (
                                <a
                                  href={p.product_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
                                >
                                  <span>Xem trên Shopee</span>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Parent SKU & Item ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {p.parent_sku ? (
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">
                            {p.parent_sku}
                          </div>
                        ) : (
                          <div className="text-zinc-400">Không có SKU cha</div>
                        )}
                        <div className="flex items-center gap-1 text-zinc-500 mt-0.5">
                          <span>ID: {p.item_id}</span>
                          <button
                            onClick={(e) => handleCopy(p.item_id, "ID sản phẩm", e)}
                            className="hover:text-orange-600 p-0.5"
                            title="Sao chép ID"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>

                      {/* Variations Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {varCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                            {varCount} phân loại
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs">Sản phẩm đơn</span>
                        )}
                      </td>

                      {/* Price Display */}
                      <td className="py-3.5 px-4 text-right font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                        {p.price_display && p.price_display !== "₫0" && p.price_display !== "₫"
                          ? p.price_display
                          : p.price_min > 0
                            ? p.price_min === p.price_max
                              ? `₫${p.price_min.toLocaleString("vi-VN")}`
                              : `₫${p.price_min.toLocaleString("vi-VN")} - ₫${p.price_max.toLocaleString("vi-VN")}`
                            : "--"}
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${p.stock > 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                            }`}
                        >
                          {p.stock > 0 ? p.stock.toLocaleString("vi-VN") : "Hết hàng"}
                        </span>
                      </td>

                      {/* Sales 30d */}
                      <td className="py-3.5 px-4 text-center font-semibold text-zinc-800 dark:text-zinc-200">
                        {p.sales_30d || 0}
                      </td>

                      {/* Shop Name */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {p.shop_username || "baobiyensen"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedProduct(p)}
                            className="p-1.5 text-zinc-600 hover:text-orange-600 hover:bg-orange-50 dark:text-zinc-300 dark:hover:text-orange-400 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                            title="Xem chi tiết & phân loại"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDeleteProduct(p.item_id, e)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            title="Xóa sản phẩm"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination */}
        {!loading && totalRecords > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Hiển thị{" "}
              <strong>
                {Math.min((currentPage - 1) * pageSize + 1, totalRecords)} -{" "}
                {Math.min(currentPage * pageSize, totalRecords)}
              </strong>{" "}
              trong tổng số <strong>{totalRecords.toLocaleString("vi-VN")}</strong> sản phẩm
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 7 && currentPage > 4) {
                  pageNum = currentPage - 3 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (6 - i);
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${currentPage === pageNum
                      ? "bg-orange-600 text-white shadow-sm"
                      : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Product Detail & Variations Modal */}
      <ShopeeProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}

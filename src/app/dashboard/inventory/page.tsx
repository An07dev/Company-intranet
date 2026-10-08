"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { ShopeeProduct } from "@/types";
import { ShopeeProductDetailModal } from "@/components/shopee/ShopeeProductDetailModal";
import { BarcodePrintModal } from "@/components/inventory/BarcodePrintModal";
import { BarcodeScannerModal } from "@/components/inventory/BarcodeScannerModal";
import { ScannedProductModal } from "@/components/inventory/ScannedProductModal";
import { StockAdjustModal } from "@/components/inventory/StockAdjustModal";
import { CreateProductModal } from "@/components/inventory/CreateProductModal";
import { useToast } from "@/context/ToastContext";

interface ProductStats {
  totalProducts: number;
  inStockCount: number;
  outOfStockCount: number;
  lowStockCount?: number;
  totalStock: number;
  totalSales30d?: number;
  totalVariations?: number;
}

export default function InventoryPage() {
  const { toast } = useToast();

  const [products, setProducts] = useState<ShopeeProduct[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [selectedBranch, setSelectedBranch] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Detail Modal & Copy State
  const [selectedProduct, setSelectedProduct] = useState<ShopeeProduct | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Barcode / QR State
  const [printProduct, setPrintProduct] = useState<ShopeeProduct | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ShopeeProduct | null>(null);
  const [scannedCode, setScannedCode] = useState("");
  const [isScannedResultOpen, setIsScannedResultOpen] = useState(false);

  // 2-Way Sapo Action Modals State
  const [adjustProduct, setAdjustProduct] = useState<ShopeeProduct | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Mobile More Menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMoreMenu]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [syncingSapo, setSyncingSapo] = useState(false);

  const handleSyncFromSapo = async () => {
    setSyncingSapo(true);
    try {
      const res = await fetch("/api/sapo/inventory/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Lỗi đồng bộ sản phẩm & tồn kho từ Sapo");
      }
      toast.success(json.message || "Đã đồng bộ sản phẩm & tồn kho từ Sapo thành công!");
      await fetchInventory(false);
    } catch (err: any) {
      toast.error(err.message || "Không thể đồng bộ kho hàng từ Sapo");
    } finally {
      setSyncingSapo(false);
    }
  };

  // Fetch Inventory from Server API with Pagination
  const fetchInventory = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
        });

        if (stockFilter !== "all") {
          params.append("stock_status", stockFilter);
        }

        if (debouncedSearch) {
          params.append("search", debouncedSearch);
        }

        if (isManualRefresh) {
          params.append("reconcile_sapo", "true");
        }

        const res = await fetch(`/api/shopee/products?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Không thể tải dữ liệu tồn kho");
        }

        setProducts(json.data.products || []);
        if (json.data.pagination) {
          setTotalPages(json.data.pagination.totalPages || 1);
          setTotalRecords(json.data.pagination.total || 0);
        }
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      } catch (err: any) {
        setError(err.message || "Lỗi tải dữ liệu tồn kho");
        toast.error("Không thể tải danh sách tồn kho");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, stockFilter, debouncedSearch, toast]
  );

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Xử lý khi quét mã thành công
  const handleScanSuccess = async (code: string) => {
    setIsScannerOpen(false);
    const cleanCode = code.trim();
    setScannedCode(cleanCode);

    try {
      let res = await fetch(`/api/shopee/products?search=${encodeURIComponent(cleanCode)}&limit=1`);
      let json = await res.json();

      if ((!json.success || !json.data?.products?.length) && /^SKU-/i.test(cleanCode)) {
        const raw = cleanCode.replace(/^SKU-/i, "");
        res = await fetch(`/api/shopee/products?search=${encodeURIComponent(raw)}&limit=1`);
        json = await res.json();
      }

      if (json.success && json.data?.products?.length > 0) {
        setScannedProduct(json.data.products[0]);
      } else {
        setScannedProduct(null);
      }
      setIsScannedResultOpen(true);
    } catch {
      toast.error("Lỗi khi tra cứu mã sản phẩm");
    }
  };

  // Keyboard shortcut cho máy quét mã vạch
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      if (timeDiff > 90) {
        barcodeBuffer = "";
      }

      if (e.key === "Enter") {
        if (barcodeBuffer.length >= 2) {
          e.preventDefault();
          handleScanSuccess(barcodeBuffer.trim());
          barcodeBuffer = "";
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle Copy SKU
  const handleCopySku = (sku: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    toast.success(`Đã sao chép mã SKU: ${sku}`);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Handle Delete Product 2-way Sapo
  const handleDeleteProduct = async (product: ShopeeProduct, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const sku = product.parent_sku || `SKU-${product.item_id}`;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa mã hàng "${sku} - ${product.name}" khỏi kho và hệ thống Sapo không?\nHành động này sẽ xóa dữ liệu trên Sapo.`
    );
    if (!confirmed) return;

    setDeletingItemId(String(product.item_id));
    try {
      const res = await fetch(`/api/sapo/inventory?item_id=${encodeURIComponent(product.item_id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.sapo_detail || json.message || json.error || "Không thể xóa sản phẩm khỏi Sapo");
      }
      toast.success(`Đã xóa SKU ${sku} khỏi hệ thống thành công!`);
      fetchInventory(true);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa hàng hóa");
    } finally {
      setDeletingItemId(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (products.length === 0) {
      toast.warning("Không có dữ liệu để xuất file");
      return;
    }

    const headers = [
      "Mã SKU",
      "Mã Item ID",
      "Tên hàng hóa / Sản phẩm",
      "Tồn khả dụng",
      "Trạng thái tồn",
      "Giá bán niêm yết (VNĐ)",
      "Số lượng phân loại",
      "Kho lưu trữ",
    ];

    const rows = products.map((p) => [
      `"${p.parent_sku || `SKU-${p.item_id}`}"`,
      `"${p.item_id}"`,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      p.stock || 0,
      (p.stock || 0) <= 0 ? "Hết hàng" : (p.stock || 0) <= 10 ? "Sắp hết" : "Ổn định",
      p.price_min || 0,
      (p.variations || []).length,
      "Kho Tổng Yến Sen",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Bao_cao_ton_kho_chi_nhanh_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất báo cáo ${products.length} sản phẩm ra file CSV`);
  };

  // Pagination calculation items with ellipsis
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

  const totalStockDisplay = (stats?.totalStock || 0).toLocaleString("vi-VN");
  const lowStockDisplay = (stats?.lowStockCount ?? 0).toLocaleString("vi-VN");
  const outOfStockDisplay = (stats?.outOfStockCount ?? 0).toLocaleString("vi-VN");
  const inStockDisplay = (stats?.inStockCount ?? 0).toLocaleString("vi-VN");
  const totalSkuDisplay = (stats?.totalProducts || totalRecords || 0).toLocaleString("vi-VN");

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-3 sm:space-y-4 max-w-[1700px] mx-auto min-h-screen">
      {/* 1. Header Card */}
      <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg sm:text-xl shrink-0">
              🏬
            </div>
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 mb-0.5">
                <span>Sapo Kho vận & Tồn kho</span>
                <span>/</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">Chi nhánh: Kho Tổng Yến Sen</span>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white leading-tight truncate">
                  Quản lý Kho & Tồn kho
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  {totalSkuDisplay} SKU
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 truncate mt-0.5 sm:hidden">
                {totalSkuDisplay} SKU • {totalStockDisplay} sp khả dụng
              </div>
            </div>
          </div>

          {/* Desktop Toolbar */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSyncFromSapo}
              disabled={syncingSapo || loading || refreshing}
              className="py-2 px-3 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs whitespace-nowrap"
              title="Đồng bộ toàn bộ sản phẩm và số lượng tồn kho mới nhất từ Sapo Omnichannel"
            >
              <span className={syncingSapo ? "animate-spin" : ""}>🔄</span>
              <span>{syncingSapo ? "Đang đồng bộ Sapo..." : "Đồng bộ Sapo"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="py-2 px-3.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <span>➕</span>
              <span>Nhập hàng / Thêm SKU</span>
            </button>
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="py-2 px-3.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <span>📷</span>
              <span>Quét Mã QR</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="py-2 px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <span>📊</span>
              <span>Xuất CSV</span>
            </button>
            <button
              type="button"
              onClick={() => fetchInventory(true)}
              disabled={loading || refreshing || syncingSapo}
              className="py-2 px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 shadow-2xs disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>🔄</span>
              <span>{refreshing ? "Đang tải..." : "Làm mới"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Toolbar (sm:hidden) - 1 hàng gọn gàng, không bị mất text hay tràn viền */}
        <div className="sm:hidden pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-1.5">
          {/* Nút 1: Quét mã QR */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 h-9 px-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition cursor-pointer whitespace-nowrap"
          >
            <span className="shrink-0">📷</span>
            <span>Quét mã QR</span>
          </button>

          {/* Nút 2: Nhập hàng */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex-1 h-9 px-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition cursor-pointer whitespace-nowrap"
          >
            <span className="shrink-0">➕</span>
            <span>Nhập hàng</span>
          </button>

          {/* Nút 3: Làm mới tồn kho */}
          <button
            type="button"
            onClick={() => fetchInventory(true)}
            disabled={loading || refreshing || syncingSapo}
            className="h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 active:scale-95 transition flex items-center justify-center cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs"
            title="Làm mới tồn kho"
          >
            <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>🔄</span>
          </button>

          {/* Nút 4: Menu More (Đồng bộ Sapo, Xuất CSV, Nhà cung cấp) */}
          <div className="relative shrink-0" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className="h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 active:scale-95 transition flex items-center justify-center cursor-pointer font-bold text-base shadow-2xs"
              title="Tùy chọn khác"
            >
              ⋯
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleSyncFromSapo();
                  }}
                  disabled={syncingSapo}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
                >
                  <span className={`text-sm ${syncingSapo ? "animate-spin" : ""}`}>🔄</span>
                  <span>{syncingSapo ? "Đang đồng bộ..." : "Đồng bộ kho từ Sapo"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleExportCSV();
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
                >
                  <span className="text-sm">📊</span>
                  <span>Xuất báo cáo CSV</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Tổng mã SKU</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-xs sm:text-sm">
              📦
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-zinc-900 dark:text-white">
            {totalSkuDisplay}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Hàng hóa đang quản lý</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Tồn khả dụng</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs sm:text-sm">
              🏭
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {totalStockDisplay}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Sản phẩm sẵn sàng bán</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Sắp hết hàng (≤ 10)</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs sm:text-sm">
              ⚠️
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {lowStockDisplay}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Cần nhập hàng bổ sung</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Hết hàng (Stock = 0)</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs sm:text-sm">
              🚫
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {outOfStockDisplay}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Tạm ngưng kinh doanh</span>
        </div>
      </div>

      {/* 3. Search & Filter Bar (2 hàng gọn gàng trên mobile) */}
      <div className="bg-white dark:bg-zinc-900 p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs sm:shadow-sm space-y-2 sm:space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 md:pb-0 scrollbar-none [&::-webkit-scrollbar]:hidden -mx-0.5 px-0.5">
            <button
              type="button"
              onClick={() => {
                setStockFilter("all");
                setCurrentPage(1);
              }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1 sm:gap-1.5 active:scale-95 ${stockFilter === "all"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-zinc-50 dark:bg-zinc-800/60"
                }`}
            >
              <span>Tất cả</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${stockFilter === "all"
                ? "bg-zinc-700 text-zinc-200 dark:bg-zinc-300 dark:text-zinc-900"
                : "bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300"
                }`}>
                {totalSkuDisplay}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStockFilter("in_stock");
                setCurrentPage(1);
              }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1 sm:gap-1.5 active:scale-95 ${stockFilter === "in_stock"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                }`}
            >
              <span>Còn hàng</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${stockFilter === "in_stock"
                ? "bg-emerald-800 text-white"
                : "bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                }`}>
                {inStockDisplay}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStockFilter("low_stock");
                setCurrentPage(1);
              }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1 sm:gap-1.5 active:scale-95 ${stockFilter === "low_stock"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 bg-amber-50/50 dark:bg-amber-950/20"
                }`}
            >
              <span>Sắp hết</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${stockFilter === "low_stock"
                ? "bg-amber-800 text-white"
                : "bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                }`}>
                {lowStockDisplay}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStockFilter("out_of_stock");
                setCurrentPage(1);
              }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1 sm:gap-1.5 active:scale-95 ${stockFilter === "out_of_stock"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-rose-50/50 dark:bg-rose-950/20"
                }`}
            >
              <span>Hết hàng</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${stockFilter === "out_of_stock"
                ? "bg-rose-800 text-white"
                : "bg-rose-200/70 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300"
                }`}>
                {outOfStockDisplay}
              </span>
            </button>
          </div>

          {/* Search Input & Page Size */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã SKU, tên hàng hóa, ID..."
                className="w-full pl-7 pr-7 py-1.5 sm:py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded text-xs cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Select page size on Desktop */}
            <div className="hidden sm:block relative shrink-0">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="appearance-none pl-2.5 pr-6 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer font-medium"
                title="Số dòng mỗi trang"
              >
                <option value={15}>15 / trang</option>
                <option value={25}>25 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-zinc-400">
                ▼
              </span>
            </div>

            {/* Reset Filter Button */}
            {(stockFilter !== "all" || search) && (
              <button
                type="button"
                onClick={() => {
                  setStockFilter("all");
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="py-1.5 px-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-xl border border-rose-200 dark:border-rose-900/40 transition shrink-0 cursor-pointer flex items-center gap-1 active:scale-95"
                title="Đặt lại bộ lọc"
              >
                <span>✕</span>
                <span className="hidden sm:inline">Đặt lại</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 sm:p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => fetchInventory()}
            className="underline font-semibold hover:text-rose-900 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4. Inventory Data Display */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium">
            <span className="animate-spin text-base">⏳</span>
            <span>Đang tải số liệu tồn kho...</span>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="text-3xl">📦</div>
          <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Không tìm thấy sản phẩm nào trong kho
          </div>
          {(search || stockFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStockFilter("all");
                setCurrentPage(1);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* =========================================================================
              GIAO DIỆN MOBILE: DANH SÁCH DẠNG THẺ (CARD VIEW - md:hidden)
             ========================================================================= */}
          <div className="md:hidden space-y-2.5">
            {products.map((p) => {
              const stockNum = Number(p.stock) || 0;
              const isOutOfStock = stockNum <= 0;
              const isLowStock = !isOutOfStock && stockNum <= 10;
              const variationCount = (p.variations || []).length;
              const skuCode = p.parent_sku || `SKU-${p.item_id}`;
              const isCopied = copiedSku === skuCode;

              return (
                <div
                  key={p.item_id}
                  onClick={() => setSelectedProduct(p)}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 shadow-2xs space-y-2.5 transition active:scale-[0.99] cursor-pointer"
                >
                  {/* Hàng 1: Mã SKU & Badge Tồn kho */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white truncate">
                        {skuCode}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopySku(skuCode, e)}
                        className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs shrink-0 cursor-pointer"
                        title="Sao chép mã SKU"
                      >
                        {isCopied ? "✓" : "📋"}
                      </button>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono font-bold text-[11px] shadow-2xs shrink-0 ${isOutOfStock
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : isLowStock
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                    >
                      {isOutOfStock ? "🚫 Hết 0" : isLowStock ? `⚠️ Còn ${stockNum}` : `🟢 Còn ${stockNum}`}
                    </span>
                  </div>

                  {/* Hàng 2: Ảnh sản phẩm, Tên hàng hóa & Phân loại */}
                  <div className="flex items-center gap-2.5">
                    {p.image || p.variations?.[0]?.image ? (
                      <img
                        src={p.image || p.variations?.[0]?.image}
                        alt=""
                        className="w-11 h-11 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 bg-zinc-100 dark:bg-zinc-800"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";
                        }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 text-base">
                        📦
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-zinc-900 dark:text-white line-clamp-2 leading-snug">
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {variationCount > 0 ? (
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.2 rounded">
                            {variationCount} phân loại
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Đơn lẻ</span>
                        )}
                        <span className="text-[10px] text-zinc-400 font-mono">
                          ID: #{p.item_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hàng 3: Giá bán & Cụm nút Thao tác nhanh */}
                  <div
                    className="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <div className="text-[10px] text-zinc-400">Giá niêm yết</div>
                      <div className="font-mono font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                        {p.price_display && p.price_display !== "₫0" && p.price_display !== "₫"
                          ? p.price_display
                          : p.price_min > 0
                            ? `₫${p.price_min.toLocaleString("vi-VN")}`
                            : "--"}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Điều chỉnh tồn kho */}
                      <button
                        type="button"
                        onClick={() => setAdjustProduct(p)}
                        className="py-1 px-2 text-[11px] font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 transition flex items-center gap-1 cursor-pointer active:scale-95"
                        title="Kiểm kê tồn kho"
                      >
                        <span>⚡</span>
                        <span>Kiểm kê</span>
                      </button>

                      {/* In mã QR */}
                      <button
                        type="button"
                        onClick={() => setPrintProduct(p)}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 transition cursor-pointer active:scale-95"
                        title="In tem mã QR"
                      >
                        🖨️
                      </button>

                      {/* Xóa SKU */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProduct(p, e)}
                        disabled={deletingItemId === String(p.item_id)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Xóa hàng hóa"
                      >
                        {deletingItemId === String(p.item_id) ? "⏳" : "🗑️"}
                      </button>
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
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Mã SKU</th>
                    <th className="py-3.5 px-4">Tên hàng hóa / Sản phẩm</th>
                    <th className="py-3.5 px-4 text-center">Phân loại</th>
                    <th className="py-3.5 px-4 text-right">Giá bán</th>
                    <th className="py-3.5 px-4 text-center">Tồn khả dụng</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-center">Kho lưu trữ</th>
                    <th className="py-3.5 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {products.map((p) => {
                    const stockNum = Number(p.stock) || 0;
                    const isOutOfStock = stockNum <= 0;
                    const isLowStock = !isOutOfStock && stockNum <= 10;
                    const variationCount = (p.variations || []).length;
                    const skuCode = p.parent_sku || `SKU-${p.item_id}`;

                    return (
                      <tr
                        key={p.item_id}
                        onClick={() => setSelectedProduct(p)}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition cursor-pointer"
                      >
                        {/* SKU */}
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{skuCode}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopySku(skuCode, e)}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                              title="Sao chép mã SKU"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>

                        {/* Name & Thumbnail */}
                        <td className="py-3 px-4 max-w-[340px]">
                          <div className="flex items-center gap-2.5">
                            {p.image || p.variations?.[0]?.image ? (
                              <img
                                src={p.image || p.variations?.[0]?.image}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 bg-zinc-100 dark:bg-zinc-800"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.onerror = null;
                                  target.src =
                                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";
                                }}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 text-sm">
                                📦
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-medium text-zinc-900 dark:text-zinc-100 truncate hover:text-amber-600 transition-colors"
                                title={p.name}
                              >
                                {p.name}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                ID: #{p.item_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Variations */}
                        <td className="py-3 px-4 text-center">
                          {variationCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/40">
                              {variationCount} phân loại
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">Đơn lẻ</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono whitespace-nowrap">
                          {p.price_display && p.price_display !== "₫0" && p.price_display !== "₫"
                            ? p.price_display
                            : p.price_min > 0
                              ? `₫${p.price_min.toLocaleString("vi-VN")}`
                              : "--"}
                        </td>

                        {/* Stock */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-3 py-1 rounded-full font-mono font-extrabold text-xs shadow-xs ${isOutOfStock
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : isLowStock
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                          >
                            {stockNum.toLocaleString("vi-VN")}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                              <span>✕</span>
                              <span>Hết hàng</span>
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                              <span>⚠️</span>
                              <span>Sắp hết</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              <span>✓</span>
                              <span>Ổn định</span>
                            </span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-3 px-4 text-center text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                          Kho Tổng Yến Sen
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setAdjustProduct(p)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                              title="Kiểm kê & Điều chỉnh tồn kho thực tế"
                            >
                              <span className="text-sm">⚡</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrintProduct(p)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                              title="In tem mã QR sản phẩm"
                            >
                              <span className="text-sm">🖨️</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedProduct(p)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                              title="Xem chi tiết SKU"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteProduct(p, e)}
                              disabled={deletingItemId === String(p.item_id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Xóa mã hàng này"
                            >
                              {deletingItemId === String(p.item_id) ? (
                                <span className="text-xs animate-spin">⏳</span>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              )}
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

          {/* 5. Pagination Bar */}
          {totalRecords > 0 && (
            <div className="p-3 sm:p-4 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs shadow-2xs">
              {/* Giao diện Mobile (sm:hidden) */}
              <div className="flex sm:hidden items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
                >
                  ‹ Trước
                </button>

                <div className="text-center font-semibold text-zinc-700 dark:text-zinc-300">
                  <span>
                    Trang <span className="font-bold text-zinc-900 dark:text-white">{currentPage}</span> / {totalPages}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
                >
                  Sau ›
                </button>
              </div>

              {/* Giao diện Desktop (hidden sm:flex) */}
              <div className="hidden sm:flex items-center justify-between gap-4">
                <div className="text-zinc-500 dark:text-zinc-400 font-medium">
                  Hiển thị{" "}
                  <strong className="text-zinc-900 dark:text-white font-semibold">
                    {Math.min((currentPage - 1) * pageSize + 1, totalRecords).toLocaleString("vi-VN")} -{" "}
                    {Math.min(currentPage * pageSize, totalRecords).toLocaleString("vi-VN")}
                  </strong>{" "}
                  trong tổng số{" "}
                  <strong className="text-zinc-900 dark:text-white font-semibold">
                    {totalRecords.toLocaleString("vi-VN")}
                  </strong>{" "}
                  SKU (Trang {currentPage} / {totalPages})
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer text-zinc-700 dark:text-zinc-200"
                  >
                    ‹ Trước
                  </button>

                  <div className="flex items-center gap-1">
                    {paginationItems.map((item, idx) => {
                      if (item === "...") {
                        return (
                          <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-zinc-400 font-bold">
                            ...
                          </span>
                        );
                      }
                      const pageNum = Number(item);
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={`page-${pageNum}`}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 text-xs font-semibold rounded-lg transition-all cursor-pointer ${isActive
                            ? "bg-amber-600 text-white shadow-2xs font-bold"
                            : "border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer text-zinc-700 dark:text-zinc-200"
                  >
                    Sau ›
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Product Detail & Variations Breakdown Modal */}
      {selectedProduct && (
        <ShopeeProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* 7. Barcode & QR Code Print Modal */}
      <BarcodePrintModal
        product={printProduct}
        isOpen={!!printProduct}
        onClose={() => setPrintProduct(null)}
      />

      {/* 8. Barcode & QR Scanner Modal (Camera / Gun / Image) */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* 9. Scanned Product & Stock Result Modal */}
      <ScannedProductModal
        product={scannedProduct}
        scannedCode={scannedCode}
        isOpen={isScannedResultOpen}
        onClose={() => setIsScannedResultOpen(false)}
        onScanAnother={() => {
          setIsScannedResultOpen(false);
          setIsScannerOpen(true);
        }}
        onPrintLabel={(prod) => {
          setPrintProduct(prod);
        }}
        onAdjustStock={(prod) => {
          setAdjustProduct(prod);
        }}
      />

      {/* 10. Stock Adjustment Modal (2-Way Sapo) */}
      <StockAdjustModal
        product={adjustProduct}
        isOpen={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        onSuccess={() => fetchInventory(true)}
      />

      {/* 11. Create New Product / SKU Modal (2-Way Sapo) */}
      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchInventory(true)}
      />
    </div>
  );
}

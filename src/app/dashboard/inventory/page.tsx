"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ShopeeProduct } from "@/types";
import { ShopeeProductDetailModal } from "@/components/shopee/ShopeeProductDetailModal";
import { BarcodePrintModal } from "@/components/inventory/BarcodePrintModal";
import { BarcodeScannerModal } from "@/components/inventory/BarcodeScannerModal";
import { ScannedProductModal } from "@/components/inventory/ScannedProductModal";
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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

  // Xử lý khi quét mã thành công (từ Camera, Máy quét cầm tay hoặc tải ảnh)
  const handleScanSuccess = async (code: string) => {
    setIsScannerOpen(false);
    const cleanCode = code.trim();
    setScannedCode(cleanCode);

    try {
      // 1. Thử tra cứu bằng mã quét đầy đủ
      let res = await fetch(`/api/shopee/products?search=${encodeURIComponent(cleanCode)}&limit=1`);
      let json = await res.json();

      // 2. Nếu không ra và mã có tiền tố SKU-, thử bỏ tiền tố
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
      setScannedProduct(null);
      setIsScannedResultOpen(true);
    }
  };

  // Lắng nghe phím bấm từ Máy quét mã vạch cầm tay (USB / Bluetooth)
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu người dùng đang nhập trong input / textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      // Máy quét mã vạch thường gửi các ký tự cực nhanh (< 70ms)
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
      "Số lượng tồn kho",
      "Trạng thái tồn",
      "Đơn giá (₫)",
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
  const lowStockDisplay = stats?.lowStockCount ?? 0;
  const outOfStockDisplay = stats?.outOfStockCount ?? 0;
  const inStockDisplay = stats?.inStockCount ?? 0;
  const totalSkuDisplay = (stats?.totalProducts || totalRecords || 0).toLocaleString("vi-VN");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto min-h-screen">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              Sapo Kho vận & Tồn kho
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full font-medium">
              <span>🏬</span>
              <span>Chi nhánh:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Kho Tổng Yến Sen (Mặc định)</option>
                <option value="branch_hcm">Chi nhánh TP. Hồ Chí Minh</option>
                <option value="branch_hanoi">Chi nhánh Hà Nội</option>
              </select>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1.5">
            Quản lý Kho & Tồn kho chi nhánh
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Theo dõi mức tồn thực tế theo từng SKU, in mã QR và quét mã tra cứu nhanh số lượng tồn kho
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Quét Mã Tồn Kho Nổi Bật */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm cursor-pointer"
            title="Mở camera hoặc máy quét để tra cứu tồn kho bằng mã QR tức thì"
          >
            <span className="text-sm">📷</span>
            <span>Quét Mã QR Tồn Kho</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition shadow-xs"
            title="Xuất danh sách tồn kho ra file CSV / Excel"
          >
            <span>📊</span>
            <span>Xuất CSV</span>
          </button>

          <button
            type="button"
            onClick={() => fetchInventory(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition shadow-xs disabled:opacity-60"
            title="Làm mới số liệu tồn kho"
          >
            <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>🔄</span>
            <span>{refreshing ? "Đang tải..." : "Làm mới"}</span>
          </button>

          <Link
            href="/dashboard/suppliers"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition shadow-xs"
          >
            <span>🏭</span>
            <span>Nhà cung cấp</span>
          </Link>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tổng sản phẩm SKU</span>
            <span className="text-xl">📦</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {totalSkuDisplay}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Mã hàng hóa đang quản lý trong kho</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tổng lượng tồn khả dụng</span>
            <span className="text-xl">🏭</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            {totalStockDisplay}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Tổng số đơn vị hàng hóa sẵn sàng bán</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sắp hết hàng (≤ 10)</span>
            <span className="text-xl">⚠️</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-amber-600 dark:text-amber-400">
            {lowStockDisplay}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Cần lập đơn nhập hàng bổ sung</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Hết hàng (Stock = 0)</span>
            <span className="text-xl">🚫</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-rose-600 dark:text-rose-400">
            {outOfStockDisplay}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">SKU đang tạm ngưng kinh doanh</div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã SKU, tên hàng hóa, mã Item ID hoặc quét mã..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all"
          />
          <span className="absolute left-3 top-2.5 text-zinc-400 text-xs">🔍</span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setStockFilter("all");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              stockFilter === "all"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                : "border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Tất cả ({stats?.totalProducts ?? totalRecords})
          </button>

          <button
            type="button"
            onClick={() => {
              setStockFilter("in_stock");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              stockFilter === "in_stock"
                ? "bg-emerald-600 text-white shadow-xs"
                : "border border-zinc-200 dark:border-zinc-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
          >
            Còn hàng ({inStockDisplay})
          </button>

          <button
            type="button"
            onClick={() => {
              setStockFilter("low_stock");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              stockFilter === "low_stock"
                ? "bg-amber-600 text-white shadow-xs"
                : "border border-zinc-200 dark:border-zinc-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            }`}
          >
            Sắp hết ({lowStockDisplay})
          </button>

          <button
            type="button"
            onClick={() => {
              setStockFilter("out_of_stock");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              stockFilter === "out_of_stock"
                ? "bg-rose-600 text-white shadow-xs"
                : "border border-zinc-200 dark:border-zinc-700 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            }`}
          >
            Hết hàng ({outOfStockDisplay})
          </button>

          {/* Page size dropdown */}
          <div className="pl-2 border-l border-zinc-200 dark:border-zinc-800 flex items-center gap-1">
            <span className="text-[11px] text-zinc-400 whitespace-nowrap hidden sm:inline">Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              <option value={15}>15 / trang</option>
              <option value={25}>25 / trang</option>
              <option value={50}>50 / trang</option>
              <option value={100}>100 / trang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div>
            <strong>Lỗi: </strong> {error}
          </div>
          <button
            type="button"
            onClick={() => fetchInventory()}
            className="underline font-semibold hover:text-rose-900"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4. Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
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
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-zinc-500">
                    <div className="inline-flex items-center gap-2">
                      <span className="animate-spin text-base">⏳</span>
                      <span>Đang tải số liệu tồn kho...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-zinc-500">
                    <div className="max-w-xs mx-auto space-y-1">
                      <div className="text-2xl">📦</div>
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                        Không tìm thấy sản phẩm nào
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc trạng thái tồn kho
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
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
                          {p.image ? (
                            <img
                              src={p.image}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
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
                          className={`inline-block px-3 py-1 rounded-full font-mono font-extrabold text-xs shadow-xs ${
                            isOutOfStock
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
                          {/* Nút In tem nhãn mã QR */}
                          <button
                            type="button"
                            onClick={() => setPrintProduct(p)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="In tem mã QR sản phẩm"
                          >
                            <span className="text-sm">🖨️</span>
                          </button>

                          {/* Nút Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(p)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="Xem chi tiết SKU và phân loại tồn kho"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar */}
        {!loading && totalRecords > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
              Hiển thị{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {Math.min((currentPage - 1) * pageSize + 1, totalRecords).toLocaleString("vi-VN")} -{" "}
                {Math.min(currentPage * pageSize, totalRecords).toLocaleString("vi-VN")}
              </strong>{" "}
              trong tổng số{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {totalRecords.toLocaleString("vi-VN")}
              </strong>{" "}
              sản phẩm SKU (Trang{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {currentPage} / {totalPages}
              </span>
              )
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {/* Trang đầu */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Về trang đầu tiên"
              >
                ««
              </button>

              {/* Trang trước */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>

              {/* Danh sách trang số */}
              {paginationItems.map((item, idx) => {
                if (item === "...") {
                  return (
                    <span
                      key={`dots-${idx}`}
                      className="w-8 h-8 flex items-center justify-center text-xs text-zinc-400 font-bold"
                    >
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
                    className={`w-8 h-8 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? "bg-amber-600 text-white shadow-sm font-bold scale-105"
                        : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Trang sau */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sau
              </button>

              {/* Trang cuối */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Đến trang cuối cùng"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>

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
      />
    </div>
  );
}

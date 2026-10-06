"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProductItem {
  item_id: number;
  name: string;
  item_sku?: string;
  price: number;
  stock: number;
  sales?: number;
  image?: string;
  status?: string;
  shop_username?: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shopee/products?limit=100");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tải dữ liệu tồn kho");
      }
      setProducts(json.data.products || []);
    } catch (err: any) {
      setError(err.message || "Lỗi tải dữ liệu tồn kho");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.item_sku && p.item_sku.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (stockFilter === "low") {
      return (p.stock || 0) > 0 && (p.stock || 0) <= 10;
    }
    if (stockFilter === "out") {
      return (p.stock || 0) <= 0;
    }
    return true;
  });

  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const outOfStockCount = products.filter((p) => (p.stock || 0) <= 0).length;
  const lowStockCount = products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= 10).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              Sapo Kho vận & Tồn kho
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Chi nhánh: Kho Tổng Yến Sen
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            Quản lý Kho & Tồn kho chi nhánh
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Theo dõi mức tồn thực tế, cảnh báo chạm ngưỡng an toàn và quản lý phiếu nhập xuất hàng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            Làm mới tồn kho
          </button>
          <Link
            href="/dashboard/suppliers"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shadow-xs"
          >
            <span>🏭</span>
            Nhà cung cấp
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tổng sản phẩm SKU</span>
            <span className="text-lg">📦</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {products.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Mã hàng hóa đang quản lý</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tổng lượng tồn kho</span>
            <span className="text-lg">🏭</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            {totalStock.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Đơn vị sản phẩm có sẵn</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sắp hết hàng (≤ 10)</span>
            <span className="text-lg">⚠️</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-amber-600 dark:text-amber-400">
            {lowStockCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Cần lập đơn nhập hàng bổ sung</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Hết hàng (Stock = 0)</span>
            <span className="text-lg">🚫</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-rose-600 dark:text-rose-400">
            {outOfStockCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">SKU đang tạm ngưng bán</div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã SKU, tên hàng hóa..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
          <span className="absolute left-3 top-2.5 text-zinc-400 text-xs">🔍</span>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setStockFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${stockFilter === "all"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
          >
            Tất cả ({products.length})
          </button>
          <button
            onClick={() => setStockFilter("low")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${stockFilter === "low"
              ? "bg-amber-600 text-white"
              : "border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-amber-600 dark:text-amber-400"
              }`}
          >
            Sắp hết ({lowStockCount})
          </button>
          <button
            onClick={() => setStockFilter("out")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${stockFilter === "out"
              ? "bg-rose-600 text-white"
              : "border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-rose-600 dark:text-rose-400"
              }`}
          >
            Hết hàng ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          <strong>Lỗi: </strong> {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Mã SKU</th>
                <th className="py-3 px-4">Tên hàng hóa / Sản phẩm</th>
                <th className="py-3 px-4 text-center">Tồn kho khả dụng</th>
                <th className="py-3 px-4 text-center">Trạng thái tồn</th>
                <th className="py-3 px-4 text-center">Kho lưu trữ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <div className="inline-flex items-center gap-2">
                      <span className="animate-spin text-base">⏳</span>
                      <span>Đang tải số liệu tồn kho...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    Không tìm thấy sản phẩm nào trong kho
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = (p.stock || 0) <= 0;
                  const isLowStock = !isOutOfStock && (p.stock || 0) <= 10;

                  return (
                    <tr
                      key={p.item_id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                    >
                      {/* SKU */}
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {p.item_sku || `SKU-${p.item_id}`}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 max-w-[320px]">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate" title={p.name}>
                          {p.name}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          ID: #{p.item_id}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full font-mono font-extrabold text-xs ${isOutOfStock
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          : isLowStock
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}>
                          {(p.stock || 0).toLocaleString("vi-VN")}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                            ✕ Hết hàng
                          </span>
                        ) : isLowStock ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            ⚠️ Sắp hết
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            ✓ Ổn định
                          </span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-center text-zinc-500 font-mono text-[11px]">
                        Kho Tổng Yến Sen
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

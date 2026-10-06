"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [stats, setStats] = useState({
    pageTotalSpent: 0,
    pageTotalOrders: 0,
    vipCount: 0,
    totalCustomers: 0,
  });

  // Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [, startTransition] = useTransition();

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

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString("vi-VN") + " ₫";
  };

  const getFullName = (c: Customer) => {
    const parts = [c.last_name, c.first_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Khách lẻ (Chưa đặt tên)";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Sapo CRM & Công nợ
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Store: cua-hang-yen-sen.mysapo.net
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            Quản lý Khách hàng & CRM
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Dữ liệu khách hàng đồng bộ thời gian thực từ Sapo Omnichannel và các sàn thương mại
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchCustomers(page, activeQuery)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            Làm mới
          </button>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs"
          >
            <span>📦</span>
            Xem đơn hàng
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tổng khách hàng</span>
            <span className="text-lg">👥</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {totalCount.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Hồ sơ khách hàng trên hệ thống</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Khách VIP trang này</span>
            <span className="text-lg">💎</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-amber-600 dark:text-amber-400">
            {stats.vipCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Chi tiêu tích lũy ≥ 1.000.000 ₫</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tổng đơn đặt (trang này)</span>
            <span className="text-lg">📦</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-indigo-600 dark:text-indigo-400">
            {stats.pageTotalOrders.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Lượt mua hàng đã ghi nhận</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Doanh số (trang này)</span>
            <span className="text-lg">💰</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono mt-1 text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(stats.pageTotalSpent)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Tổng tiền khách đã thanh toán</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên khách hàng, số điện thoại..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-zinc-400 text-xs">🔍</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Tìm kiếm
            </button>
            {activeQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>
        </form>
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
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Khu vực / Địa chỉ</th>
                <th className="py-3 px-4 text-center">Đơn hàng</th>
                <th className="py-3 px-4 text-right">Tổng chi tiêu</th>
                <th className="py-3 px-4">Đơn cuối</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="inline-flex items-center gap-2">
                      <span className="animate-spin text-base">⏳</span>
                      <span>Đang tải danh sách khách hàng từ Sapo...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Không tìm thấy khách hàng nào phù hợp
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const fullName = getFullName(c);
                  const isVip = (c.total_spent || 0) >= 1000000;
                  const addr = c.default_address;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isVip
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          }`}>
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <span>{fullName}</span>
                              {isVip && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white">
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              ID: #{c.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <span>📞</span>
                            <span>{c.phone}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-400 italic">Chưa có SĐT</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4 max-w-[240px]">
                        {addr ? (
                          <div className="truncate text-zinc-700 dark:text-zinc-300" title={`${addr.address1 || ""}, ${addr.district || ""}, ${addr.city || ""}`}>
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
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          {c.orders_count || 0}
                        </span>
                      </td>

                      {/* Total spent */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(c.total_spent)}
                        </span>
                      </td>

                      {/* Last order */}
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                        {c.last_order_name || (c.last_order_id ? `#${c.last_order_id}` : "Chưa có đơn")}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(c)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs">
            <div className="text-zinc-500">
              Trang <span className="font-bold text-zinc-900 dark:text-zinc-100">{page}</span> / {totalPages} (Tổng {totalCount} khách hàng)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
              >
                ← Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm">
                  {getFullName(selectedCustomer).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {getFullName(selectedCustomer)}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Sapo Customer ID: #{selectedCustomer.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Customer Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[11px] text-zinc-500">Tổng số đơn hàng</div>
                <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {selectedCustomer.orders_count || 0}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[11px] text-zinc-500">Tổng chi tiêu</div>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(selectedCustomer.total_spent)}
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Thông tin liên lạc:</div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Số điện thoại:</span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedCustomer.phone || "Chưa có"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Email:</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {selectedCustomer.email || "Chưa cập nhật"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Đơn hàng gần nhất:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {selectedCustomer.last_order_name || (selectedCustomer.last_order_id ? `#${selectedCustomer.last_order_id}` : "Chưa có")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Ngày tạo hồ sơ:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {new Date(selectedCustomer.created_on).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Địa chỉ giao hàng:</div>
              {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedCustomer.addresses.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300"
                    >
                      <div className="flex items-center justify-between font-medium text-zinc-900 dark:text-zinc-100">
                        <span>{a.city || a.district || "Địa chỉ"}</span>
                        {a.default && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
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
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 text-zinc-400 italic text-center">
                  Khách hàng chưa lưu sổ địa chỉ
                </div>
              )}
            </div>

            {/* Close */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition"
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

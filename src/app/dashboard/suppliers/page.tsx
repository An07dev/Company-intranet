"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Supplier {
  id: number;
  store_id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  description: string | null;
  website: string | null;
  status: string;
  country: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  address1: string | null;
  address2: string | null;
  created_on: string;
  updated_on: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sapo/suppliers");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tải danh sách nhà cung cấp");
      }
      setSuppliers(json.data.suppliers || []);
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối Sapo API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  const activeCount = suppliers.filter((s) => s.status === "active").length;
  const withPhoneCount = suppliers.filter((s) => Boolean(s.phone)).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Sapo Quản lý Nhập hàng & NCC
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Store: cua-hang-yen-sen.mysapo.net
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            Quản lý Nhà cung cấp & Đối tác
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Danh bạ các nhà cung ứng hàng hóa, bao bì, nguyên vật liệu kết nối trực tiếp từ Sapo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSuppliers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            Đồng bộ từ Sapo
          </button>
          <Link
            href="/dashboard/shopee-products"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
          >
            <span>📦</span>
            Xem sản phẩm
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tổng nhà cung cấp</span>
            <span className="text-lg">🏭</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {suppliers.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Đối tác nhập hàng đã cấu hình</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Đang hoạt động</span>
            <span className="text-lg">🟢</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Sẵn sàng lập đơn nhập kho</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Đã cập nhật Hotline</span>
            <span className="text-lg">📞</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-blue-600 dark:text-blue-400">
            {withPhoneCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Có số điện thoại liên lạc</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Phân quyền Sapo</span>
            <span className="text-lg">🔐</span>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            Đọc & Ghi
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Admin REST API kết nối thông suốt</div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã SUP, tên nhà cung cấp, SĐT..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
          <span className="absolute left-3 top-2.5 text-zinc-400 text-xs">🔍</span>
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
                <th className="py-3 px-4">Mã NCC</th>
                <th className="py-3 px-4">Tên nhà cung cấp</th>
                <th className="py-3 px-4">Liên hệ (SĐT / Email)</th>
                <th className="py-3 px-4">Địa chỉ / Khu vực</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4">Cập nhật</th>
                <th className="py-3 px-4 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="inline-flex items-center gap-2">
                      <span className="animate-spin text-base">⏳</span>
                      <span>Đang kết nối tải 23 nhà cung cấp từ Sapo...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Không tìm thấy nhà cung cấp nào
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                  >
                    {/* Code */}
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {s.code || `ID-${s.id}`}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {s.name}
                      </div>
                      {s.tax_number && (
                        <div className="text-[11px] text-zinc-400 font-mono">
                          MST: {s.tax_number}
                        </div>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4">
                      {s.phone ? (
                        <a
                          href={`tel:${s.phone}`}
                          className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>📞</span>
                          <span>{s.phone}</span>
                        </a>
                      ) : (
                        <span className="text-zinc-400 italic">Chưa có SĐT</span>
                      )}
                      {s.email && (
                        <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                          ✉️ {s.email}
                        </div>
                      )}
                    </td>

                    {/* Address */}
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate">
                      {[s.address1, s.district, s.province || s.country].filter(Boolean).join(", ") || (
                        <span className="text-zinc-400 italic">Chưa nhập địa chỉ</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        s.status === "active"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                      }`}>
                        {s.status === "active" ? "Đang hợp tác" : "Tạm ngưng"}
                      </span>
                    </td>

                    {/* Updated on */}
                    <td className="py-3 px-4 text-zinc-500 text-[11px]">
                      {s.updated_on ? new Date(s.updated_on).toLocaleDateString("vi-VN") : "—"}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedSupplier(s)}
                        className="px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {selectedSupplier.code || `ID-${selectedSupplier.id}`}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                  {selectedSupplier.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Details */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Mã số thuế:</span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedSupplier.tax_number || "Chưa có"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Số điện thoại:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    {selectedSupplier.phone || "Chưa cập nhật"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Email:</span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {selectedSupplier.email || "Chưa có"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Website:</span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {selectedSupplier.website || "Chưa có"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-zinc-500">Địa chỉ:</span>
                  <span className="text-right text-zinc-800 dark:text-zinc-200 max-w-[260px]">
                    {[selectedSupplier.address1, selectedSupplier.ward, selectedSupplier.district, selectedSupplier.province].filter(Boolean).join(", ") || "Chưa cập nhật"}
                  </span>
                </div>
              </div>

              {selectedSupplier.description && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
                  <div className="font-medium text-zinc-500 mb-1">Ghi chú:</div>
                  <p className="text-zinc-700 dark:text-zinc-300">{selectedSupplier.description}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
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

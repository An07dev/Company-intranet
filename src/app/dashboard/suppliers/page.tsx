"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";

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
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filter & Pagination State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "with_phone">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Detail & Edit
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Supplier>>({});
  const [editError, setEditError] = useState<string | null>(null);

  // Modal Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal Delete
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    phone: "",
    email: "",
    tax_number: "",
    address1: "",
    province: "",
    website: "",
    description: "",
    status: "active",
  });

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

  const handleOpenDetail = (s: Supplier) => {
    setSelectedSupplier(s);
    setIsEditing(false);
    setEditError(null);
    setEditForm({
      name: s.name || "",
      code: s.code || "",
      phone: s.phone || "",
      email: s.email || "",
      tax_number: s.tax_number || "",
      address1: s.address1 || "",
      province: s.province || "",
      district: s.district || "",
      website: s.website || "",
      description: s.description || "",
      status: s.status || "active",
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedSupplier) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/sapo/suppliers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSupplier.id,
          ...editForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Đã cập nhật nhà cung cấp lên Sapo!");
        // Update local state
        setSuppliers((prev) =>
          prev.map((item) => (item.id === selectedSupplier.id ? { ...item, ...editForm } : item))
        );
        setSelectedSupplier((prev) => (prev ? { ...prev, ...editForm } : null));
        setIsEditing(false);
        setEditError(null);
      } else {
        const errMsg = data.sapo_detail || data.message || data.error || "Lỗi cập nhật nhà cung cấp lên Sapo";
        setEditError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || "Không thể kết nối đến máy chủ Sapo";
      setEditError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Vui lòng nhập tên nhà cung cấp");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/sapo/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã tạo nhà cung cấp mới trên Sapo thành công!");
        setIsCreateOpen(false);
        setCreateError(null);
        setCreateForm({
          name: "",
          code: "",
          phone: "",
          email: "",
          tax_number: "",
          address1: "",
          province: "",
          website: "",
          description: "",
          status: "active",
        });
        await fetchSuppliers();
      } else {
        const errMsg = data.sapo_detail || data.message || data.error || "Lỗi tạo nhà cung cấp trên Sapo";
        setCreateError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || "Không thể kết nối đến máy chủ";
      setCreateError(errMsg);
      toast.error(errMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/sapo/suppliers?id=${supplierToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa nhà cung cấp "${supplierToDelete.name}" thành công trên Sapo!`);
        setSuppliers((prev) => prev.filter((s) => s.id !== supplierToDelete.id));
        if (selectedSupplier?.id === supplierToDelete.id) {
          setSelectedSupplier(null);
        }
        setSupplierToDelete(null);
        setDeleteError(null);
      } else {
        const errMsg = data.sapo_detail || data.message || data.error || "Lỗi xóa nhà cung cấp trên Sapo";
        setDeleteError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || "Không thể kết nối đến máy chủ để xóa nhà cung cấp";
      setDeleteError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Filtered suppliers based on search & status filter
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilter === "active" && s.status !== "active") return false;
      if (statusFilter === "inactive" && s.status === "active") return false;
      if (statusFilter === "with_phone" && !s.phone) return false;

      if (!debouncedSearch) return true;
      const q = debouncedSearch.toLowerCase();
      return (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.address1 && s.address1.toLowerCase().includes(q)) ||
        (s.province && s.province.toLowerCase().includes(q)) ||
        (s.tax_number && s.tax_number.includes(q))
      );
    });
  }, [suppliers, statusFilter, debouncedSearch]);

  const totalRecords = filteredSuppliers.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Clamp current page if total pages shrank
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Sliced items for current page
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, currentPage, pageSize]);

  // Pagination page buttons with ellipsis
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

  const activeCount = suppliers.filter((s) => s.status === "active").length;
  const inactiveCount = suppliers.length - activeCount;
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
            Danh bạ các nhà cung ứng hàng hóa, bao bì, nguyên vật liệu kết nối 2 chiều trực tiếp từ Sapo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer"
          >
            <span>➕</span>
            <span>Thêm NCC mới</span>
          </button>

          <button
            onClick={fetchSuppliers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            Làm mới
          </button>

          <Link
            href="/dashboard/shopee-products"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
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
            {withPhoneCount} / {suppliers.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Có số điện thoại liên lạc</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Đồng bộ 2 Chiều</span>
            <span className="text-lg">🔐</span>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            Đọc & Ghi (REST API)
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Cập nhật trực tiếp lên Sapo</div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã SUP, tên nhà cung cấp, SĐT, MST, địa chỉ..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
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

        {/* Filter Pills & Page Size Dropdown */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === "all"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                : "border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Tất cả ({suppliers.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("active");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white shadow-xs"
                : "border border-zinc-200 dark:border-zinc-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
          >
            Đang hợp tác ({activeCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("inactive");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === "inactive"
                ? "bg-zinc-700 text-white shadow-xs"
                : "border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Tạm ngưng ({inactiveCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("with_phone");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === "with_phone"
                ? "bg-blue-600 text-white shadow-xs"
                : "border border-zinc-200 dark:border-zinc-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            }`}
          >
            Có Hotline ({withPhoneCount})
          </button>

          {/* Page size selector */}
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
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
              <option value={100}>100 / trang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          <strong>Lỗi: </strong> {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
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
                <th className="py-3 px-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="inline-flex items-center gap-2">
                      <span className="animate-spin text-base">⏳</span>
                      <span>Đang kết nối tải danh sách nhà cung cấp từ Sapo...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="max-w-xs mx-auto space-y-1">
                      <div className="text-2xl">🏭</div>
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                        Không tìm thấy nhà cung cấp nào
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn bộ lọc trạng thái
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s) => (
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
                          className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
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
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 max-w-[220px] truncate">
                      {[s.address1, s.district, s.province].filter(Boolean).join(", ") || (
                        <span className="text-zinc-400 italic">Chưa nhập địa chỉ</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.status === "active"
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
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(s)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                        >
                          Chi tiết / Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setSupplierToDelete(s)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                          title="Xóa nhà cung cấp"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
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
              nhà cung cấp (Trang{" "}
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
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Về trang đầu tiên"
              >
                ««
              </button>

              {/* Trang trước */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                        ? "bg-emerald-600 text-white shadow-sm font-bold scale-105"
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
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Sau
              </button>

              {/* Trang cuối */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Đến trang cuối cùng"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Chi tiết & Chỉnh sửa Nhà Cung Cấp */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
                  🏭
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {selectedSupplier.code || `ID-${selectedSupplier.id}`}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${selectedSupplier.status === "active"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                      {selectedSupplier.status === "active" ? "Đang hợp tác" : "Tạm ngưng"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {selectedSupplier.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm"
              >
                ✕
              </button>
            </div>

            {/* View Mode */}
            {!isEditing ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-700/60 pb-2">
                    <span className="text-zinc-500">Mã nhà cung cấp:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedSupplier.code || "Chưa có"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-700/60 pb-2">
                    <span className="text-zinc-500">Số điện thoại liên hệ:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {selectedSupplier.phone || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-700/60 pb-2">
                    <span className="text-zinc-500">Hòm thư Email:</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                      {selectedSupplier.email || "Chưa có"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-700/60 pb-2">
                    <span className="text-zinc-500">Mã số thuế:</span>
                    <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedSupplier.tax_number || "Chưa có"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-700/60 pb-2">
                    <span className="text-zinc-500">Website:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {selectedSupplier.website || "Chưa có"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-zinc-500">Địa chỉ kho / trụ sở:</span>
                    <span className="text-right text-zinc-800 dark:text-zinc-200 max-w-[280px]">
                      {[selectedSupplier.address1, selectedSupplier.district, selectedSupplier.province].filter(Boolean).join(", ") || "Chưa cập nhật"}
                    </span>
                  </div>
                </div>

                {selectedSupplier.description && (
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40">
                    <div className="font-medium text-zinc-500 mb-1">Mô tả / Ghi chú đối tác:</div>
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{selectedSupplier.description}</p>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-[11px] text-zinc-400">
                    Cập nhật lần cuối: {selectedSupplier.updated_on ? new Date(selectedSupplier.updated_on).toLocaleString("vi-VN") : "—"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSupplierToDelete(selectedSupplier)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>🗑️</span>
                      <span>Xóa NCC</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>✏️</span>
                      <span>Chỉnh sửa thông tin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSupplier(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Form Mode */
              <div className="space-y-3.5 text-xs">
                {editError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                      <span className="text-base">⚠️</span>
                      <span>Lỗi cập nhật từ Sapo:</span>
                    </div>
                    <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2.5 rounded-xl text-rose-900 dark:text-rose-100 border border-rose-200/50">
                      {editError}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Tên nhà cung cấp *</label>
                    <input
                      type="text"
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Mã NCC</label>
                    <input
                      type="text"
                      value={editForm.code || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Số điện thoại liên hệ</label>
                    <input
                      type="text"
                      value={editForm.phone || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="VD: 0987654321 / 18008000"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Hòm thư Email</label>
                    <input
                      type="email"
                      value={editForm.email || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@doitac.com"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Mã số thuế (MST)</label>
                    <input
                      type="text"
                      value={editForm.tax_number || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, tax_number: e.target.value }))}
                      placeholder="VD: 0100109106"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Trạng thái</label>
                    <select
                      value={editForm.status || "active"}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="active">Đang hợp tác (Active)</option>
                      <option value="inactive">Tạm ngưng (Inactive)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Địa chỉ chi tiết</label>
                  <input
                    type="text"
                    value={editForm.address1 || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, address1: e.target.value }))}
                    placeholder="VD: Số 1 Giang Văn Minh, Ba Đình"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Tỉnh / Thành phố</label>
                    <input
                      type="text"
                      value={editForm.province || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, province: e.target.value }))}
                      placeholder="Hà Nội / TP.HCM"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Website</label>
                    <input
                      type="text"
                      value={editForm.website || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Ghi chú / Mô tả</label>
                  <textarea
                    rows={2}
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Nhập ghi chú thêm về nhà cung cấp này..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <span className="inline-block animate-spin">⏳</span>
                        <span>Đang lưu lên Sapo...</span>
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        <span>Lưu thay đổi lên Sapo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Thêm Nhà Cung Cấp Mới */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
                  ➕
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Thêm Nhà Cung Cấp Mới
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Tạo mới và tự động đồng bộ trực tiếp lên hệ thống Sapo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3.5 text-xs">
              {createError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                    <span className="text-base">⚠️</span>
                    <span>Phản hồi lỗi từ hệ thống Sapo:</span>
                  </div>
                  <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2.5 rounded-xl text-rose-900 dark:text-rose-100 border border-rose-200/50">
                    {createError}
                  </div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400">
                    💡 <em>Mẹo khắc phục:</em> Nếu lỗi do trùng mã, bạn chỉ cần <strong>xóa trắng ô Mã NCC</strong> để Sapo tự động sinh mã mới, hoặc kiểm tra lại định dạng email và SĐT.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Tên nhà cung cấp *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Bao bì An Phát"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Mã NCC (để trống tự tạo)</label>
                  <input
                    type="text"
                    value={createForm.code}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="VD: SUP00020"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="VD: 0912345678"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Hòm thư Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@supplier.vn"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={createForm.tax_number}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, tax_number: e.target.value }))}
                    placeholder="VD: 0312345678"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Tỉnh / Thành phố</label>
                  <input
                    type="text"
                    value={createForm.province}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, province: e.target.value }))}
                    placeholder="Hà Nội / TP.HCM"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 font-medium mb-1">Địa chỉ chi tiết</label>
                <input
                  type="text"
                  value={createForm.address1}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, address1: e.target.value }))}
                  placeholder="Số nhà, tên đường, phường xã..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-500 font-medium mb-1">Mô tả / Ghi chú</label>
                <textarea
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Chuyên cung ứng bao bì carton, tem nhãn..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {creating ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      <span>Đang tạo trên Sapo...</span>
                    </>
                  ) : (
                    <>
                      <span>➕</span>
                      <span>Tạo nhà cung cấp</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa Nhà Cung Cấp */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shrink-0">
                🗑️
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Xác nhận xóa nhà cung cấp
                </h3>
                <p className="text-xs text-zinc-500">
                  Đồng bộ gỡ bỏ nhà cung cấp trên hệ thống và Sapo
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Tên nhà cung cấp:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right">{supplierToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Mã NCC:</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{supplierToDelete.code || `ID-${supplierToDelete.id}`}</span>
              </div>
              {supplierToDelete.phone && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Số điện thoại:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{supplierToDelete.phone}</span>
                </div>
              )}
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                  <span className="text-base">⚠️</span>
                  <span>Không thể xóa trên Sapo:</span>
                </div>
                <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2.5 rounded-xl text-rose-900 dark:text-rose-100 border border-rose-200/50">
                  {deleteError}
                </div>
              </div>
            )}

            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/40">
              ⚠️ <strong>Cảnh báo:</strong> Thao tác này sẽ gỡ bỏ nhà cung cấp khỏi danh sách và đồng bộ trạng thái <em>Đã xóa (deleted)</em> sang Sapo. Bạn có chắc chắn muốn xóa?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSupplierToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    <span>Đang xóa trên Sapo...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

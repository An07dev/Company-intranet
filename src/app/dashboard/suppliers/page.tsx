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
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

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

  // Modal Delete
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [syncingSapo, setSyncingSapo] = useState(false);

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
      toast.error(err.message || "Lỗi kết nối Sapo API");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromSapo = async () => {
    setSyncingSapo(true);
    try {
      const res = await fetch("/api/sapo/suppliers/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Lỗi đồng bộ nhà cung cấp từ Sapo");
      }
      toast.success(json.message || "Đã đồng bộ nhà cung cấp từ Sapo thành công!");
      if (json.data?.suppliers && Array.isArray(json.data.suppliers)) {
        setSuppliers(json.data.suppliers);
      } else {
        await fetchSuppliers();
      }
    } catch (err: any) {
      toast.error(err.message || "Không thể đồng bộ nhà cung cấp từ Sapo");
    } finally {
      setSyncingSapo(false);
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

  const handleCopyPhone = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast.success(`Đã sao chép SĐT: ${phone}`);
    setTimeout(() => setCopiedPhone(null), 2000);
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
      if (data.success && data.data?.supplier) {
        toast.success(`Đã tạo mới nhà cung cấp "${createForm.name}" thành công trên Sapo!`);
        setSuppliers((prev) => [data.data.supplier, ...prev]);
        setIsCreateOpen(false);
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
      } else {
        const errMsg = data.sapo_detail || data.message || data.error || "Lỗi khi tạo nhà cung cấp trên Sapo";
        setCreateError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || "Không thể kết nối đến máy chủ Sapo";
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

  // Filtered suppliers
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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, currentPage, pageSize]);

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
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-3 sm:space-y-4 max-w-[1650px] mx-auto min-h-screen">
      {/* 1. Header Card */}
      <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg sm:text-xl shrink-0">
              🏭
            </div>
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 mb-0.5">
                <span>Sapo Quản lý Nhập hàng</span>
                <span>/</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">Danh bạ nhà cung cấp</span>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white leading-tight truncate">
                  Quản lý Nhà cung cấp & Đối tác
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {suppliers.length} đối tác
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 truncate mt-0.5 sm:hidden">
                {suppliers.length} đối tác • Đồng bộ 2 chiều Sapo
              </div>
            </div>
          </div>

          {/* Desktop Toolbar */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSyncFromSapo}
              disabled={syncingSapo || loading}
              className="py-2 px-3 text-xs font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs whitespace-nowrap"
              title="Đồng bộ danh sách nhà cung cấp mới nhất từ Sapo Omnichannel"
            >
              <span className={syncingSapo ? "animate-spin" : ""}>🔄</span>
              <span>{syncingSapo ? "Đang đồng bộ Sapo..." : "Đồng bộ Sapo"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="py-2 px-3.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <span>➕</span>
              <span>Thêm NCC mới</span>
            </button>
            <button
              type="button"
              onClick={fetchSuppliers}
              disabled={loading || syncingSapo}
              className="py-2 px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs whitespace-nowrap"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Mobile Toolbar (sm:hidden) - Tối ưu 2 hàng sạch sẽ, chống mất text */}
        <div className="sm:hidden pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
          {/* Hàng 1: 2 nút thao tác chính */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSyncFromSapo}
              disabled={syncingSapo || loading}
              className="h-10 px-3 text-xs font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap shadow-2xs"
              title="Đồng bộ từ Sapo"
            >
              <span className={`shrink-0 ${syncingSapo ? "animate-spin" : ""}`}>🔄</span>
              <span>{syncingSapo ? "Đang đồng bộ..." : "Đồng bộ Sapo"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="h-10 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition cursor-pointer whitespace-nowrap"
            >
              <span className="shrink-0">➕</span>
              <span>Thêm NCC mới</span>
            </button>
          </div>

          {/* Hàng 2: Làm mới và Sản phẩm */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fetchSuppliers}
              disabled={loading || syncingSapo}
              className="h-9 px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-2xs"
              title="Làm mới danh sách"
            >
              <span className={`shrink-0 ${loading ? "animate-spin" : ""}`}>🔄</span>
              <span>Làm mới</span>
            </button>
            <Link
              href="/dashboard/shopee-products"
              className="h-9 px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <span className="shrink-0">📦</span>
              <span>Sản phẩm</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Tổng nhà cung cấp</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs sm:text-sm">
              🏭
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-zinc-900 dark:text-white">
            {suppliers.length}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Đối tác đã cấu hình</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Đang hoạt động</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs sm:text-sm">
              🟢
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Sẵn sàng lập đơn nhập</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Có Hotline</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs sm:text-sm">
              📞
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {withPhoneCount}
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Có SĐT liên hệ</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">Đồng bộ 2 Chiều</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs sm:text-sm">
              🔐
            </div>
          </div>
          <div className="mt-1 sm:mt-2 text-[14px] sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
            Đọc & Ghi (REST)
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 block truncate">Cập nhật trực tiếp Sapo</span>
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
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 ${statusFilter === "all"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-zinc-50 dark:bg-zinc-800/60"
                }`}
            >
              <span>Tất cả</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${statusFilter === "all"
                ? "bg-zinc-700 text-zinc-200 dark:bg-zinc-300 dark:text-zinc-900"
                : "bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300"
                }`}>
                {suppliers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("active");
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 ${statusFilter === "active"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                }`}
            >
              <span>Đang hợp tác</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${statusFilter === "active"
                ? "bg-emerald-800 text-white"
                : "bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                }`}>
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("inactive");
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 ${statusFilter === "inactive"
                ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-zinc-50 dark:bg-zinc-800/60"
                }`}
            >
              <span>Tạm ngưng</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${statusFilter === "inactive"
                ? "bg-zinc-600 text-zinc-100 dark:bg-zinc-400 dark:text-zinc-900"
                : "bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300"
                }`}>
                {inactiveCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("with_phone");
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 ${statusFilter === "with_phone"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 bg-blue-50/50 dark:bg-blue-950/20"
                }`}
            >
              <span>Có Hotline</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${statusFilter === "with_phone"
                ? "bg-blue-800 text-white"
                : "bg-blue-200/70 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300"
                }`}>
                {withPhoneCount}
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
                placeholder="Tìm mã, tên NCC, SĐT, MST..."
                className="w-full pl-7 pr-7 py-1.5 sm:py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all"
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
                className="appearance-none pl-2.5 pr-6 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer font-medium"
                title="Số dòng mỗi trang"
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-zinc-400">
                ▼
              </span>
            </div>

            {/* Reset Filter Button */}
            {(statusFilter !== "all" || search) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
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
        <div className="p-3 sm:p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 4. Supplier List Display */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium">
            <span className="animate-spin text-base">⏳</span>
            <span>Đang kết nối tải danh sách nhà cung cấp từ Sapo...</span>
          </div>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="text-3xl">🏭</div>
          <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Không tìm thấy nhà cung cấp nào phù hợp
          </div>
          {(search || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
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
            {paginatedSuppliers.map((s) => {
              const isPhoneCopied = copiedPhone === s.phone;

              return (
                <div
                  key={s.id}
                  onClick={() => handleOpenDetail(s)}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 shadow-2xs space-y-2.5 transition active:scale-[0.99] cursor-pointer"
                >
                  {/* Hàng 1: Mã NCC & Trạng thái & Thao tác */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {s.code || `ID-${s.id}`}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.status === "active"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}
                      >
                        {s.status === "active" ? "🟢 Đang hợp tác" : "⚪ Tạm ngưng"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(s)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                      >
                        Chi tiết ›
                      </button>
                      <button
                        type="button"
                        onClick={() => setSupplierToDelete(s)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 transition cursor-pointer"
                        title="Xóa NCC"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Hàng 2: Tên nhà cung cấp & MST */}
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white line-clamp-1">
                      {s.name}
                    </div>
                    {s.tax_number && (
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        MST: {s.tax_number}
                      </div>
                    )}
                  </div>

                  {/* Hàng 3: SĐT, Email & Địa chỉ */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      {s.phone ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${s.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <span>📞</span>
                            <span>{s.phone}</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(s.phone!, e)}
                            className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[11px]"
                            title="Sao chép SĐT"
                          >
                            {isPhoneCopied ? "✓" : "📋"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic text-[11px]">Chưa có số hotline</span>
                      )}

                      {s.email && (
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]">
                          ✉️ {s.email}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      📍 {[s.address1, s.district, s.province].filter(Boolean).join(", ") || "Chưa cập nhật địa chỉ"}
                    </div>
                  </div>

                  {/* Hàng 4: Thời gian cập nhật */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                    <span>
                      Cập nhật: {s.updated_on ? new Date(s.updated_on).toLocaleDateString("vi-VN") : "—"}
                    </span>
                    {s.website && (
                      <span className="truncate max-w-[140px] text-zinc-400">
                        🌐 {s.website.replace(/^https?:\/\//, "")}
                      </span>
                    )}
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
                  {paginatedSuppliers.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition cursor-pointer"
                      onClick={() => handleOpenDetail(s)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {s.code || `ID-${s.id}`}
                        </span>
                      </td>

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

                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        {s.phone ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${s.phone}`}
                              className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                            >
                              <span>📞</span>
                              <span>{s.phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={(e) => handleCopyPhone(s.phone!, e)}
                              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
                              title="Sao chép SĐT"
                            >
                              {copiedPhone === s.phone ? "✓" : "📋"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Chưa có SĐT</span>
                        )}
                        {s.email && (
                          <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                            ✉️ {s.email}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 max-w-[220px] truncate">
                        {[s.address1, s.district, s.province].filter(Boolean).join(", ") || (
                          <span className="text-zinc-400 italic">Chưa nhập địa chỉ</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.status === "active"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                            }`}
                        >
                          {s.status === "active" ? "Đang hợp tác" : "Tạm ngưng"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-zinc-500 text-[11px]">
                        {s.updated_on ? new Date(s.updated_on).toLocaleDateString("vi-VN") : "—"}
                      </td>

                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
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
                  ))}
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
                    {Math.min((currentPage - 1) * pageSize + 1, totalRecords)} -{" "}
                    {Math.min(currentPage * pageSize, totalRecords)}
                  </strong>{" "}
                  trong tổng số{" "}
                  <strong className="text-zinc-900 dark:text-white font-semibold">
                    {totalRecords}
                  </strong>{" "}
                  đối tác (Trang {currentPage} / {totalPages})
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
                            ? "bg-emerald-600 text-white shadow-2xs font-bold"
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

      {/* =========================================================================
          6. MODAL CHI TIẾT & CHỈNH SỬA NCC (MOBILE OPTIMIZED)
         ========================================================================= */}
      {selectedSupplier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedSupplier(null)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3.5 py-3 sm:px-5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base shrink-0">
                  🏭
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {selectedSupplier.code || `ID-${selectedSupplier.id}`}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${selectedSupplier.status === "active"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                    >
                      {selectedSupplier.status === "active" ? "Đang hợp tác" : "Tạm ngưng"}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                    {selectedSupplier.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
                title="Đóng modal"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4">
              {!isEditing ? (
                /* View Mode */
                <div className="space-y-3 text-xs">
                  <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Mã đối tác</span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {selectedSupplier.code || "Chưa có mã"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Số điện thoại hotline</span>
                      <div className="mt-0.5">
                        {selectedSupplier.phone ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${selectedSupplier.phone}`}
                              className="font-mono text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                            >
                              {selectedSupplier.phone}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(selectedSupplier.phone!)}
                              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs p-0.5"
                              title="Sao chép SĐT"
                            >
                              {copiedPhone === selectedSupplier.phone ? "✓" : "📋"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic text-[11px]">Chưa cập nhật</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Hòm thư Email</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate block">
                        {selectedSupplier.email || "Chưa có email"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Mã số thuế (MST)</span>
                      <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                        {selectedSupplier.tax_number || "Chưa có"}
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-zinc-400 font-medium block">Địa chỉ kho / trụ sở</span>
                      <span className="text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                        {[selectedSupplier.address1, selectedSupplier.district, selectedSupplier.province].filter(Boolean).join(", ") || "Chưa cập nhật địa chỉ"}
                      </span>
                    </div>

                    {selectedSupplier.website && (
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-zinc-400 font-medium block">Website</span>
                        <a
                          href={selectedSupplier.website.startsWith("http") ? selectedSupplier.website : `https://${selectedSupplier.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline truncate block"
                        >
                          🌐 {selectedSupplier.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {selectedSupplier.description && (
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 font-medium block mb-0.5">Ghi chú đối tác</span>
                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-[11px] whitespace-pre-wrap">
                        {selectedSupplier.description}
                      </p>
                    </div>
                  )}

                  <div className="text-[10px] text-zinc-400">
                    Cập nhật lần cuối: {selectedSupplier.updated_on ? new Date(selectedSupplier.updated_on).toLocaleString("vi-VN") : "—"}
                  </div>
                </div>
              ) : (
                /* Edit Form Mode */
                <div className="space-y-3 text-xs">
                  {editError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                        <span>⚠️</span>
                        <span>Lỗi cập nhật từ Sapo:</span>
                      </div>
                      <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2 rounded-lg text-rose-900 dark:text-rose-100">
                        {editError}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-medium mb-1">Tên nhà cung cấp *</label>
                      <input
                        type="text"
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-medium mb-1">Mã NCC</label>
                      <input
                        type="text"
                        value={editForm.code || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-medium mb-1">Số điện thoại liên hệ</label>
                      <input
                        type="text"
                        value={editForm.phone || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="VD: 0987654321"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-medium mb-1">Hòm thư Email</label>
                      <input
                        type="email"
                        value={editForm.email || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="contact@doitac.com"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-medium mb-1">Mã số thuế (MST)</label>
                      <input
                        type="text"
                        value={editForm.tax_number || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, tax_number: e.target.value }))}
                        placeholder="VD: 0100109106"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-medium mb-1">Trạng thái</label>
                      <select
                        value={editForm.status || "active"}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 cursor-pointer"
                      >
                        <option value="active">Đang hợp tác (Active)</option>
                        <option value="inactive">Tạm ngưng (Inactive)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-medium mb-1">Địa chỉ chi tiết</label>
                    <input
                      type="text"
                      value={editForm.address1 || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, address1: e.target.value }))}
                      placeholder="Số nhà, tên đường, phường xã..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-medium mb-1">Tỉnh / Thành phố</label>
                      <input
                        type="text"
                        value={editForm.province || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, province: e.target.value }))}
                        placeholder="Hà Nội / TP.HCM"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-medium mb-1">Website</label>
                      <input
                        type="text"
                        value={editForm.website || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-medium mb-1">Ghi chú / Mô tả</label>
                    <textarea
                      rows={2}
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Nhập ghi chú thêm..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-2.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center justify-between gap-2 shrink-0">
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-1.5">
                    {selectedSupplier.phone && (
                      <a
                        href={`tel:${selectedSupplier.phone}`}
                        className="py-1.5 px-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold text-xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>📞</span>
                        <span>Gọi</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSupplierToDelete(selectedSupplier)}
                      className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs transition cursor-pointer active:scale-95"
                      title="Xóa NCC"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <span>✏️</span>
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSupplier(null)}
                      className="py-1.5 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs transition cursor-pointer active:scale-95"
                    >
                      Đóng
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="py-1.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-xs transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        <span>Lưu thay đổi Sapo</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAL THÊM MỚI NCC (MOBILE OPTIMIZED)
         ========================================================================= */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-3 sm:px-5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base shrink-0">
                  ➕
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Thêm Nhà Cung Cấp Mới
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400">
                    Tạo mới và tự động đồng bộ trực tiếp lên hệ thống Sapo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateSupplier} className="p-3 sm:p-4 overflow-y-auto space-y-3 text-xs flex-1">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                    <span>⚠️</span>
                    <span>Lỗi từ hệ thống Sapo:</span>
                  </div>
                  <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2 rounded-lg text-rose-900 dark:text-rose-100">
                    {createError}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-zinc-400 font-medium mb-1">Tên nhà cung cấp *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Bao bì An Phát"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 font-medium mb-1">Mã NCC (để trống tự tạo)</label>
                  <input
                    type="text"
                    value={createForm.code}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="VD: SUP00020"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-zinc-400 font-medium mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="VD: 0912345678"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 font-medium mb-1">Hòm thư Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@supplier.vn"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-zinc-400 font-medium mb-1">Mã số thuế (MST)</label>
                  <input
                    type="text"
                    value={createForm.tax_number}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, tax_number: e.target.value }))}
                    placeholder="VD: 0312345678"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 font-medium mb-1">Tỉnh / Thành phố</label>
                  <input
                    type="text"
                    value={createForm.province}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, province: e.target.value }))}
                    placeholder="Hà Nội / TP.HCM"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-medium mb-1">Địa chỉ chi tiết</label>
                <input
                  type="text"
                  value={createForm.address1}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, address1: e.target.value }))}
                  placeholder="Số nhà, tên đường, phường xã..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-medium mb-1">Ghi chú / Mô tả</label>
                <textarea
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Chuyên cung ứng bao bì carton, tem nhãn..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                  className="py-1.5 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-xs transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95"
                >
                  {creating ? (
                    <>
                      <span className="animate-spin">⏳</span>
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

      {/* =========================================================================
          8. MODAL XÁC NHẬN XÓA NCC (MOBILE OPTIMIZED)
         ========================================================================= */}
      {supplierToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSupplierToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4 sm:p-6 space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg shrink-0">
                🗑️
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  Xác nhận xóa nhà cung cấp
                </h3>
                <p className="text-[11px] text-zinc-500 truncate">
                  Gỡ bỏ đối tác trên hệ thống và đồng bộ sang Sapo
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-zinc-400">Tên NCC:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-right">{supplierToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Mã NCC:</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{supplierToDelete.code || `ID-${supplierToDelete.id}`}</span>
              </div>
              {supplierToDelete.phone && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Số điện thoại:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{supplierToDelete.phone}</span>
                </div>
              )}
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
                ⚠️ {deleteError}
              </div>
            )}

            <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
              ⚠️ Hành động này sẽ chuyển trạng thái nhà cung cấp thành <em>Đã xóa</em> trên Sapo.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSupplierToDelete(null)}
                disabled={isDeleting}
                className="py-1.5 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-xs transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="py-1.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Đang xóa...</span>
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

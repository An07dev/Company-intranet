"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { User, UserRole, UserStatus } from "@/types";
import { LoadingSection } from "@/components/ui/Loading";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import { EditUserModal } from "@/components/users/EditUserModal";
import { ResetPasswordModal } from "@/components/users/ResetPasswordModal";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";

const DEFAULT_DEPARTMENTS = [
  "Ban Giám Đốc",
  "Ban Công Nghệ & Quản Trị Hệ Thống",
  "Bộ Phận Phát Triển Sản Phẩm",
  "Phòng Kinh Doanh",
  "Phòng Kế Toán",
  "Phòng Nhân Sự",
  "Khối Vận Hành",
  "Phòng Marketing",
];

export default function UsersManagementPage() {
  const { user: currentUser, isLoading } = useAuth();
  const router = useRouter();

  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc & Sắp xếp & Tìm kiếm
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contractFilter, setContractFilter] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("code_asc");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Phân trang: Chuẩn 10 bản ghi mỗi trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Kiểm tra quyền hạn: Chỉ Admin và Giám đốc được xem trang này
  useEffect(() => {
    if (!isLoading) {
      if (!currentUser) {
        router.replace("/");
      } else if (currentUser.role !== "admin" && currentUser.role !== "director") {
        router.replace("/dashboard/attendance");
      }
    }
  }, [isLoading, currentUser, router]);

  // Tải danh sách người dùng từ API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users?limit=500");
      const json = await res.json();
      if (json.success && json.data) {
        setUsersList(json.data.items || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách người dùng:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser && (currentUser.role === "admin" || currentUser.role === "director")) {
      fetchUsers();
    }
  }, [currentUser, fetchUsers]);

  // Tổng hợp danh sách các phòng ban duy nhất
  const availableDepartments = useMemo(() => {
    const set = new Set<string>(DEFAULT_DEPARTMENTS);
    usersList.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [usersList]);

  // Thống kê người dùng cho 4 thẻ KPI
  const stats = useMemo(() => {
    const total = usersList.length;
    const active = usersList.filter((u) => u.status === "active").length;
    const officialCount = usersList.filter((u) => (u.contractType || "official") === "official").length;
    const probationCount = usersList.filter((u) => u.contractType === "probation").length;
    return { total, active, officialCount, probationCount };
  }, [usersList]);

  // Bộ lọc & Sắp xếp người dùng
  const filteredUsers = useMemo(() => {
    const list = usersList.filter((u) => {
      // 1. Lọc theo role
      if (roleFilter !== "all" && u.role !== roleFilter) return false;

      // 2. Lọc theo status
      if (statusFilter !== "all") {
        if (statusFilter === "active" && u.status !== "active") return false;
        if (statusFilter === "inactive" && u.status === "active") return false;
      }

      // 3. Lọc theo hình thức nhân sự (chính thức vs thử việc)
      if (contractFilter !== "all") {
        const uContract = u.contractType || "official";
        if (uContract !== contractFilter) return false;
      }

      // 4. Lọc theo phòng ban
      if (selectedDept !== "all" && u.department !== selectedDept) return false;

      // 5. Tìm kiếm từ khóa (Tên, Mã NV, Email, Số điện thoại, Phòng ban)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchCode = u.employeeCode?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchPhone = u.phone?.toLowerCase().includes(q);
        const matchDept = u.department?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchEmail && !matchPhone && !matchDept) {
          return false;
        }
      }

      return true;
    });

    // Sắp xếp
    list.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "", "vi");
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "", "vi");
        case "created_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "code_asc":
        default:
          return (a.employeeCode || "").localeCompare(b.employeeCode || "");
      }
    });

    return list;
  }, [usersList, roleFilter, statusFilter, contractFilter, selectedDept, searchQuery, sortBy]);

  // Tự động reset về trang 1 khi thay đổi bất kỳ tiêu chí lọc nào
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, contractFilter, selectedDept, sortBy, searchQuery]);

  // Kiểm tra có đang kích hoạt bộ lọc nào không
  const hasActiveFilters =
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    contractFilter !== "all" ||
    selectedDept !== "all" ||
    sortBy !== "code_asc" ||
    searchQuery.trim().length > 0;

  const handleResetAllFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setContractFilter("all");
    setSelectedDept("all");
    setSortBy("code_asc");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Tính toán phân trang: Đúng 10 bản ghi mỗi trang
  const totalRecords = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Danh sách các số trang hiển thị
  const paginationItems = useMemo(() => {
    const items: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
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

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // Bật/tắt nhanh trạng thái hoạt động (Khóa / Mở khóa tài khoản)
  const handleToggleStatus = async (userToToggle: User) => {
    const newStatus: UserStatus = userToToggle.status === "active" ? "inactive" : "active";
    const actionText = newStatus === "active" ? "mở khóa" : "khóa";

    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của ${userToToggle.name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userToToggle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        fetchUsers();
      } else {
        alert(json.error || json.message || "Thao tác thất bại");
      }
    } catch {
      alert("Có lỗi xảy ra khi đổi trạng thái");
    }
  };

  // Badges màu theo vai trò
  const roleBadges: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
    director: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    manager: "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    employee: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSection text="Đang xác thực quyền quản trị..." size="lg" />
      </div>
    );
  }

  if (currentUser.role !== "admin" && currentUser.role !== "director") {
    return (
      <div className="p-8 text-center text-sm text-zinc-500">
        Bạn không có quyền truy cập trang Quản lý người dùng.
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* =========================================================================
          1. HEADER TRANG & NÚT THÊM NGƯỜI DÙNG
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Quản Lý Người Dùng &amp; Tài Khoản
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Admin &amp; Giám Đốc
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Quản lý hồ sơ nhân viên, phân quyền chức vụ (Admin, Giám đốc, Quản lý, Nhân viên) và kiểm soát quyền truy cập hệ thống.
          </p>
        </div>

        {/* Nút Thêm Người Dùng */}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold shadow-xs cursor-pointer transition-colors shrink-0"
        >
          <span className="text-sm">➕</span>
          <span>Thêm Người Dùng Mới</span>
        </button>
      </div>

      {/* =========================================================================
          2. HÀNG 4 THẺ CHỈ SỐ KPI TỔNG QUAN
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Thẻ 1: Tổng nhân sự */}
        {/* Thẻ 1: Tổng số tài khoản */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Tổng số tài khoản
            </span>
            <span className="text-base">👥</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {stats.total}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">người</span>
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 truncate">
            Toàn bộ nhân sự trong hệ thống
          </div>
        </div>

        {/* Thẻ 2: Nhân viên chính thức */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Nhân viên chính thức
            </span>
            <span className="text-base">🏢</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-blue-600 dark:text-blue-400">
            {stats.officialCount}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">nhân sự</span>
          </div>
          <div className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-2 truncate">
            +1 phép/tháng từ lúc lên chính thức (max 12)
          </div>
        </div>

        {/* Thẻ 3: Nhân viên thử việc */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Nhân sự thử việc
            </span>
            <span className="text-base">⏳</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-amber-600 dark:text-amber-400">
            {stats.probationCount}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">nhân sự</span>
          </div>
          <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-2 truncate">
            Chưa áp dụng chế độ nghỉ phép năm
          </div>
        </div>

        {/* Thẻ 4: Trạng thái hoạt động */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Trạng thái hoạt động
            </span>
            <span className="text-base">🟢</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            {stats.active}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">/ {stats.total}</span>
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 truncate">
            {stats.total - stats.active > 0 ? `${stats.total - stats.active} tài khoản đang bị khóa` : "Tất cả tài khoản đang hoạt động"}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. BẢNG DANH SÁCH & BỘ LỌC (GOM GỌN TRÊN 1 HÀNG)
         ========================================================================= */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        {/* Header trên bảng */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Danh Sách Nhân Sự &amp; Tài Khoản Hệ Thống
            </h2>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            Hiển thị {filteredUsers.length} / {usersList.length} người dùng
          </div>
        </div>

        {/* Thanh công cụ lọc & Tìm kiếm (GOM TRÊN 1 HÀNG DUY NHẤT) */}
        <div className="p-3 sm:p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto text-xs">
          {/* 1. Lọc theo vai trò (Role) */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-auto shrink-0 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
          >
            <option value="all">Tất cả chức vụ</option>
            <option value="director">👑 Giám đốc</option>
            <option value="admin">🛡️ Quản trị viên (Admin)</option>
            <option value="manager">👔 Quản lý</option>
            <option value="employee">👤 Nhân viên</option>
          </select>

          {/* 2. Lọc theo hình thức nhân sự (Chính thức / Thử việc) */}
          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            className="w-auto shrink-0 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
          >
            <option value="all">Tất cả hình thức</option>
            <option value="official">🏢 Chính thức ({stats.officialCount})</option>
            <option value="probation">⏳ Thử việc ({stats.probationCount})</option>
          </select>

          {/* 3. Lọc theo trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-auto shrink-0 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">🟢 Đang hoạt động</option>
            <option value="inactive">🔴 Đã khóa / Tạm dừng</option>
          </select>

          {/* 4. Lọc theo phòng ban */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-auto shrink-0 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
          >
            <option value="all">Tất cả phòng ban ({availableDepartments.length})</option>
            {availableDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* 5. Sắp xếp */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-auto shrink-0 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
          >
            <option value="code_asc">Mã NV: Tăng dần</option>
            <option value="name_asc">Tên: A → Z</option>
            <option value="name_desc">Tên: Z → A</option>
            <option value="created_desc">Ngày tạo: Mới nhất</option>
          </select>

          {/* 5. Ô tìm kiếm đa trường */}
          <div className="relative flex-1 min-w-[180px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên, mã NV, email, SĐT, phòng ban..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            <svg
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* 6. Nút xóa bộ lọc */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-colors cursor-pointer whitespace-nowrap"
              title="Đưa về mặc định"
            >
              <span>✕</span>
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        {/* ========================================================
            4. BẢNG MÀN HÌNH PC / DESKTOP (Chỉ 10 bản ghi/trang)
           ======================================================== */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <LoadingSection text="Đang tải danh sách người dùng..." size="md" />
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">Không tìm thấy người dùng nào phù hợp.</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 font-semibold">
                <tr>
                  <th className="px-4 py-3">Nhân sự</th>
                  <th className="px-4 py-3">Liên hệ</th>
                  <th className="px-4 py-3">Phòng ban</th>
                  <th className="px-4 py-3">Chức vụ</th>
                  <th className="px-4 py-3">Hình thức &amp; Phép</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {paginatedUsers.map((u) => {
                  const roleLabel = USER_ROLE_LABELS[u.role] || u.role;
                  const isActive = u.status === "active";
                  const isCurrent = u.id === currentUser?.id;
                  const isProbation = u.contractType === "probation";

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Avatar + Tên + Mã NV */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                              {u.name.slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-zinc-400 truncate">
                              {u.employeeCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email & Số điện thoại */}
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-zinc-700 dark:text-zinc-300 truncate">
                            {u.email}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono truncate">
                            {u.phone || "—"}
                          </div>
                        </div>
                      </td>

                      {/* Phòng ban */}
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {u.department || "—"}
                      </td>

                      {/* Vai trò */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${roleBadges[u.role] || ""}`}>
                          {roleLabel}
                        </span>
                      </td>

                      {/* Hình thức nhân sự & Phép năm */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isProbation ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <span>⏳</span> Thử việc
                            </span>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              0 phép năm
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <span>🏢</span> Chính thức
                            </span>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {(() => {
                                const dateStr = u.officialStartDate || u.createdAt;
                                if (!dateStr) return "12 phép";
                                const sDate = new Date(dateStr);
                                if (isNaN(sDate.getTime())) return "12 phép";
                                const now = new Date();
                                const diff = (now.getFullYear() - sDate.getFullYear()) * 12 + (now.getMonth() - sDate.getMonth()) + 1;
                                const totalLeave = Math.min(12, Math.max(0, diff));
                                return (
                                  <span>
                                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                      {totalLeave}
                                    </strong>
                                    /12 phép
                                    {u.officialStartDate && (
                                      <span className="ml-1 text-[9px] text-zinc-400 font-mono">
                                        ({u.officialStartDate})
                                      </span>
                                    )}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Trạng thái hoạt động */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {isActive ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>

                      {/* Thao tác CRUD */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Sửa thông tin */}
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Đặt lại mật khẩu */}
                          <button
                            type="button"
                            onClick={() => setResettingUser(u)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                            title="Đặt lại mật khẩu"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </button>

                          {/* Khóa / Mở khóa tài khoản */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isActive
                                ? "text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                : "text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            }`}
                            title={isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                          >
                            {isActive ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>

                          {/* Xóa người dùng */}
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title={isCurrent ? "Không thể tự xóa chính mình" : "Xóa tài khoản"}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ========================================================
            5. THẺ DANH SÁCH MÀN HÌNH MOBILE (Chỉ 10 bản ghi/trang)
           ======================================================== */}
        <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
          {loading ? (
            <div className="p-8 text-center">
              <LoadingSection text="Đang tải dữ liệu..." size="sm" />
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">Không tìm thấy người dùng nào.</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          ) : (
            paginatedUsers.map((u) => {
              const roleLabel = USER_ROLE_LABELS[u.role] || u.role;
              const isActive = u.status === "active";
              const isCurrent = u.id === currentUser?.id;

              return (
                <div key={u.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {u.employeeCode} • {u.department || "Khác"}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        isActive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {isActive ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </div>

                  {/* Thông tin liên hệ */}
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Email:</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">{u.email}</strong>
                    </div>
                    {u.phone && (
                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Điện thoại:</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-100">{u.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      <span>Hình thức &amp; Phép:</span>
                      {u.contractType === "probation" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                          <span>⏳ Thử việc</span>
                          <span className="text-[10px] text-zinc-400">(0 phép)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400">
                          <span>🏢 Chính thức</span>
                          {(() => {
                            const dateStr = u.officialStartDate || u.createdAt;
                            if (!dateStr) return <span className="text-emerald-600">(12/12 phép)</span>;
                            const sDate = new Date(dateStr);
                            if (isNaN(sDate.getTime())) return <span className="text-emerald-600">(12/12 phép)</span>;
                            const now = new Date();
                            const diff = (now.getFullYear() - sDate.getFullYear()) * 12 + (now.getMonth() - sDate.getMonth()) + 1;
                            const totalLeave = Math.min(12, Math.max(0, diff));
                            return (
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                                ({totalLeave}/12 phép)
                              </span>
                            );
                          })()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Mobile: Role & Buttons */}
                  <div className="pt-1 flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${roleBadges[u.role] || ""}`}>
                      {roleLabel}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setResettingUser(u)}
                        className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-amber-700 dark:text-amber-400 text-xs"
                      >
                        Đổi MK
                      </button>
                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() => setDeletingUser(u)}
                        className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 text-xs disabled:opacity-20"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================
            6. KHỐI PHÂN TRANG (PAGINATION) - Đúng 10 bản ghi/trang
           ======================================================== */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Thông tin số lượng hiển thị */}
          <div className="text-zinc-500 dark:text-zinc-400 font-mono text-center sm:text-left">
            {totalRecords > 0 ? (
              <>
                Hiển thị{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {(currentPage - 1) * pageSize + 1}
                </strong>{" "}
                -{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {Math.min(currentPage * pageSize, totalRecords)}
                </strong>{" "}
                trong tổng số{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">{totalRecords}</strong> người dùng
                {totalPages > 1 && ` (Trang ${currentPage}/${totalPages})`}
              </>
            ) : (
              <span>0 người dùng</span>
            )}
          </div>

          {/* Nút điều hướng trang */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* Nút Về Trang Đầu */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(1)}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Về trang đầu"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {/* Nút Trang Trước */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Trang trước"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Các số trang */}
              {paginationItems.map((item, idx) => {
                if (item === "...") {
                  return (
                    <span
                      key={`dots-${idx}`}
                      className="px-2 py-1 text-zinc-400 font-mono select-none"
                    >
                      …
                    </span>
                  );
                }

                const pageNum = item as number;
                const isActive = pageNum === currentPage;

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-8 h-8 px-2 rounded-md font-mono text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                        : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Nút Trang Sau */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Trang kế tiếp"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Nút Đến Trang Cuối */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Trang cuối"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          7. CÁC MODAL THAO TÁC NGƯỜI DÙNG
         ========================================================================= */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchUsers}
        availableDepartments={availableDepartments}
      />

      <EditUserModal
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSuccess={fetchUsers}
        availableDepartments={availableDepartments}
      />

      <ResetPasswordModal
        user={resettingUser}
        isOpen={Boolean(resettingUser)}
        onClose={() => setResettingUser(null)}
        onSuccess={fetchUsers}
      />

      <DeleteUserModal
        user={deletingUser}
        currentUserId={currentUser.id}
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}

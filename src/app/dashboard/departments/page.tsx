"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Department, User } from "@/types";
import { Spinner } from "@/components/ui/Loading";
import { CreateDepartmentModal } from "@/components/departments/CreateDepartmentModal";
import { EditDepartmentModal } from "@/components/departments/EditDepartmentModal";
import { DeleteDepartmentModal } from "@/components/departments/DeleteDepartmentModal";
import { DepartmentMembersModal } from "@/components/departments/DepartmentMembersModal";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const isAdminOrDirector = user?.role === "admin" || user?.role === "director";

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters & View state
  const [searchQuery, setSearchQuery] = useState("");
  const [managerFilter, setManagerFilter] = useState<"all" | "has_manager" | "no_manager">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [managingMembersDept, setManagingMembersDept] = useState<Department | null>(null);

  // Fetch departments data
  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch("/api/departments");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Không thể tải danh sách phòng ban");
      }
      setDepartments(json.data || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch users for manager selection and member addition
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?limit=200");
      const json = await res.json();
      if (res.ok && json.success) {
        const userList =
          json.data?.items ||
          json.data?.users ||
          (Array.isArray(json.data) ? json.data : []);
        setAllUsers(userList);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách users:", err);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, [fetchDepartments, fetchUsers]);

  // Cập nhật lại department đang mở modal nếu vừa có thay đổi
  const handleReload = useCallback(async () => {
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      if (res.ok && json.success) {
        const freshDepts: Department[] = json.data || [];
        setDepartments(freshDepts);

        // Nếu modal members đang mở, cập nhật lại dept object
        if (managingMembersDept) {
          const fresh = freshDepts.find((d) => d.id === managingMembersDept.id);
          if (fresh) setManagingMembersDept(fresh);
        }
      }
      fetchUsers();
    } catch (e) {
      console.error("Lỗi làm mới dữ liệu:", e);
    }
  }, [managingMembersDept, fetchUsers]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalDepartments = departments.length;
    let totalAssignedMembers = 0;
    let totalWithManager = 0;

    departments.forEach((dept) => {
      totalAssignedMembers += dept.members?.length || 0;
      if (dept.managerId) totalWithManager += 1;
    });

    const unassignedCount = Math.max(0, allUsers.length - totalAssignedMembers);

    return {
      totalDepartments,
      totalAssignedMembers,
      unassignedCount,
      totalWithManager,
    };
  }, [departments, allUsers]);

  // Danh sách phòng ban sau khi filter
  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const q = searchQuery.toLowerCase().trim();
      const managerName = dept.manager?.name || dept.managerName || "";
      const matchesSearch =
        !q ||
        dept.name.toLowerCase().includes(q) ||
        dept.code.toLowerCase().includes(q) ||
        (dept.location && dept.location.toLowerCase().includes(q)) ||
        managerName.toLowerCase().includes(q) ||
        (dept.description && dept.description.toLowerCase().includes(q));

      const matchesManager =
        managerFilter === "all" ||
        (managerFilter === "has_manager" && Boolean(dept.managerId)) ||
        (managerFilter === "no_manager" && !dept.managerId);

      return matchesSearch && matchesManager;
    });
  }, [departments, searchQuery, managerFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6">
      {/* 1. Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3.5 sm:pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
              <span className="text-xl sm:text-2xl lg:text-3xl shrink-0">🏢</span>
              <h1 className="text-[16px] sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 leading-snug sm:leading-normal py-0.5">
                Quản Lý Phòng Ban & Nhân Sự
              </h1>
            </div>

            {/* Nút reload chỉ hiển thị cạnh tiêu đề trên MOBILE (< sm) */}
            <button
              type="button"
              onClick={handleReload}
              className="sm:hidden p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 active:scale-95 shadow-2xs"
              title="Làm mới dữ liệu"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1 sm:line-clamp-none max-w-2xl">
            {isAdminOrDirector
              ? "Thiết lập cơ cấu phòng ban, quản lý điều chuyển nhân sự và bổ nhiệm lãnh đạo bộ phận."
              : "Xem thông tin cơ cấu phòng ban, danh sách nhân sự và lãnh đạo phụ trách bộ phận."}
          </p>
        </div>

        {/* Cụm Action Buttons: Trên PC (sm:flex) giữ NGUYÊN vị trí bên phải */}
        <div className={`items-center gap-2.5 shrink-0 ${isAdminOrDirector ? "flex w-full sm:w-auto" : "hidden sm:flex"}`}>
          {/* Nút reload trên PC nằm bên phải như cũ */}
          <button
            type="button"
            onClick={handleReload}
            className="hidden sm:flex p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 active:scale-95 shadow-2xs"
            title="Làm mới dữ liệu"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Nút Thêm Phòng Ban (chỉ hiện cho Admin / Giám đốc) */}
          {isAdminOrDirector && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold text-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Thêm Phòng Ban</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Thống kê KPI Cards (2x2 trên mobile, 4 trên desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Tổng số phòng ban */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900/40 text-sm sm:text-base">
            🏢
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
              <span className="sm:hidden">Phòng ban</span>
              <span className="hidden sm:inline">Tổng số phòng ban</span>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {stats.totalDepartments}
            </div>
          </div>
        </div>

        {/* Card 2: Nhân sự đã phân bổ */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-900/40 text-sm sm:text-base">
            👥
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
              <span className="sm:hidden">Đã phân bổ</span>
              <span className="hidden sm:inline">Nhân sự đã phân bổ</span>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {stats.totalAssignedMembers}
            </div>
          </div>
        </div>

        {/* Card 3: Trưởng phòng đã bổ nhiệm */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/40 text-sm sm:text-base">
            👑
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
              Có Trưởng phòng
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {stats.totalWithManager} <span className="text-xs sm:text-sm font-normal text-zinc-400">/ {stats.totalDepartments}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Nhân sự chưa phân bổ */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-900/40 text-sm sm:text-base">
            ⚡
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
              <span className="sm:hidden">Chưa phân bổ</span>
              <span className="hidden sm:inline">Chưa phân bổ / Tự do</span>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {stats.unassignedCount}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Tìm kiếm & Lọc trên mobile & desktop */}
      <div className="p-2.5 sm:p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-xs">
        {/* Tìm kiếm với nút xóa nhanh */}
        <div className="relative flex-1 min-w-0">
          <span className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên phòng, mã code, trưởng phòng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Bộ lọc và toggle view */}
        <div className="flex items-center gap-2 justify-between md:justify-end shrink-0">
          {/* Lọc trạng thái trưởng phòng */}
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value as "all" | "has_manager" | "no_manager")}
            className="flex-1 md:flex-initial min-w-0 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 focus:outline-hidden truncate"
          >
            <option value="all">Tất cả phòng ban</option>
            <option value="has_manager">Đã có Trưởng phòng</option>
            <option value="no_manager">Chưa có Trưởng phòng</option>
          </select>

          {/* Toggle Chế độ xem: Grid / Table */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
              title="Chế độ lưới thẻ"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Lưới</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
              title="Chế độ danh sách bảng"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Bảng</span>
            </button>
          </div>
        </div>
      </div>

      {/* Thông tin tìm kiếm / filter badge nếu có lọc */}
      {(searchQuery || managerFilter !== "all") && (
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
          <span>
            Tìm thấy <b className="text-zinc-900 dark:text-zinc-100">{filteredDepartments.length}</b> phòng ban phù hợp
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setManagerFilter("all");
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      )}

      {/* 4. Thông báo lỗi nếu có */}
      {errorMsg && (
        <div className="p-3 sm:p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg("")} className="hover:underline font-medium ml-2">
            Đóng
          </button>
        </div>
      )}

      {/* 5. Nội dung danh sách phòng ban */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Đang tải dữ liệu phòng ban...
          </span>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="py-12 sm:py-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 px-4">
          <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🏢</div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            Không tìm thấy phòng ban nào
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {searchQuery || managerFilter !== "all"
              ? "Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái."
              : "Hệ thống chưa có phòng ban nào. Nhấn Thêm Phòng Ban để bắt đầu."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* ====================== VIEW MODE: GRID CARDS ====================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {filteredDepartments.map((dept) => {
            const memberCount = dept.members?.length || 0;
            const previewMembers = dept.members?.slice(0, 5) || [];
            const remainingCount = Math.max(0, memberCount - previewMembers.length);
            const manager = dept.manager;
            const managerName = manager?.name || dept.managerName;
            const managerEmail = manager?.email || dept.managerEmail;

            return (
              <div
                key={dept.id}
                className="group relative rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition flex flex-col justify-between"
              >
                {/* Top Section */}
                <div>
                  {/* Mã code badge & Vị trí */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold tracking-wider rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-mono">
                      {dept.code}
                    </span>
                    {dept.location && (
                      <span
                        className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 min-w-0 truncate max-w-[170px] sm:max-w-none"
                        title={dept.location}
                      >
                        <span className="shrink-0">📍</span>
                        <span className="truncate">{dept.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Tên phòng ban */}
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                    {dept.name}
                  </h3>

                  {/* Mô tả */}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed min-h-[2rem]">
                    {dept.description || "Chưa có mô tả chi tiết nhiệm vụ và chức năng của phòng ban."}
                  </p>

                  {/* Trưởng phòng Section */}
                  <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span>👑 Trưởng Phòng</span>
                    </div>

                    {managerName ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        {manager?.avatarUrl || dept.managerAvatar ? (
                          <img
                            src={manager?.avatarUrl || dept.managerAvatar}
                            alt={managerName}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 ring-1 ring-amber-400/50"
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-200 dark:border-amber-800 shrink-0">
                            {managerName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {managerName}
                          </div>
                          {managerEmail && (
                            <div className="text-[11px] text-zinc-400 truncate">
                              {managerEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 italic py-1">
                        Chưa bổ nhiệm Trưởng phòng
                      </div>
                    )}
                  </div>

                  {/* Thành viên Section */}
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center -space-x-1.5 sm:-space-x-2 overflow-hidden py-0.5">
                      {previewMembers.map((m) => (
                        m.avatarUrl ? (
                          <img
                            key={m.id}
                            src={m.avatarUrl}
                            alt={m.name}
                            title={`${m.name} (${m.email})`}
                            className="inline-block h-6 w-6 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900 shadow-xs shrink-0"
                          />
                        ) : (
                          <div
                            key={m.id}
                            title={`${m.name} (${m.email})`}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-zinc-200 dark:bg-zinc-800 text-[10px] font-semibold flex items-center justify-center text-zinc-700 dark:text-zinc-300 shadow-xs shrink-0"
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )
                      ))}
                      {remainingCount > 0 && (
                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold flex items-center justify-center text-zinc-500 shrink-0">
                          +{remainingCount}
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60">
                      {memberCount} nhân sự
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  {/* Nút Xem / Điều chỉnh nhân sự */}
                  <button
                    type="button"
                    onClick={() => setManagingMembersDept(dept)}
                    className="flex-1 min-w-0 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <span>👥</span>
                    <span className="truncate">{isAdminOrDirector ? "Điều chỉnh nhân sự" : "Xem nhân sự"}</span>
                  </button>

                  {/* Nút Sửa & Xóa (Chỉ admin / director) */}
                  {isAdminOrDirector && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingDepartment(dept)}
                        title="Chỉnh sửa thông tin phòng ban"
                        className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingDepartment(dept)}
                        title="Xóa phòng ban"
                        className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ====================== VIEW MODE: TABLE ====================== */
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          {/* A. MOBILE VIEW (< md): Danh sách dạng bảng gọn gàng vừa khít 100% màn hình, không bị tràn/cắt cột */}
          <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredDepartments.map((dept) => {
              const manager = dept.manager;
              const managerName = manager?.name || dept.managerName;
              const memberCount = dept.members?.length || 0;

              return (
                <div key={dept.id} className="p-3.5 space-y-2.5">
                  {/* Hàng 1: Mã code, Tên phòng ban & Số lượng nhân sự */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shrink-0">
                        {dept.code}
                      </span>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {dept.name}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 shrink-0">
                      {memberCount} nhân sự
                    </span>
                  </div>

                  {/* Hàng 2: Trưởng phòng & Vị trí làm việc (chỉ hiện thông tin cần thiết) */}
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0 text-amber-500 text-xs">👑</span>
                      {managerName ? (
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {managerName}
                        </span>
                      ) : (
                        <span className="italic text-zinc-400 text-[11px]">Chưa bổ nhiệm</span>
                      )}
                    </div>
                    {dept.location && (
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[150px] shrink-0">
                        <span>📍</span>
                        <span className="truncate">{dept.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Hàng 3: Cụm nút thao tác di động - chạm bấm dễ dàng, không cần vuốt ngang */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setManagingMembersDept(dept)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                    >
                      <span>👥</span>
                      <span>{isAdminOrDirector ? "Điều chỉnh nhân sự" : "Xem nhân sự"}</span>
                    </button>

                    {isAdminOrDirector && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingDepartment(dept)}
                          title="Sửa phòng ban"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingDepartment(dept)}
                          title="Xóa phòng ban"
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* B. DESKTOP TABLE VIEW (>= md): Bảng đầy đủ 6 cột chuẩn desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Mã</th>
                  <th className="py-3.5 px-4 font-semibold">Tên Phòng Ban</th>
                  <th className="py-3.5 px-4 font-semibold">Vị Trí</th>
                  <th className="py-3.5 px-4 font-semibold">Trưởng Phòng</th>
                  <th className="py-3.5 px-4 font-semibold">Số Nhân Sự</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                {filteredDepartments.map((dept) => {
                  const manager = dept.manager;
                  const managerName = manager?.name || dept.managerName;
                  const managerEmail = manager?.email || dept.managerEmail;

                  return (
                    <tr
                      key={dept.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          {dept.code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {dept.name}
                        </div>
                        {dept.description && (
                          <div className="text-[11px] text-zinc-400 truncate max-w-xs mt-0.5">
                            {dept.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">
                        {dept.location || "—"}
                      </td>
                      <td className="py-3 px-4">
                        {managerName ? (
                          <div className="flex items-center gap-2">
                            {manager?.avatarUrl || dept.managerAvatar ? (
                              <img
                                src={manager?.avatarUrl || dept.managerAvatar}
                                alt={managerName}
                                className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-amber-400/50"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                                {managerName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {managerName}
                              </div>
                              {managerEmail && (
                                <div className="text-[10px] text-zinc-400">
                                  {managerEmail}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Chưa bổ nhiệm</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-medium">
                          {dept.members?.length || 0} người
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                          <button
                            type="button"
                            onClick={() => setManagingMembersDept(dept)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer whitespace-nowrap"
                          >
                            {isAdminOrDirector ? "Điều chỉnh nhân sự" : "Xem nhân sự"}
                          </button>

                          {isAdminOrDirector && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingDepartment(dept)}
                                title="Sửa phòng ban"
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingDepartment(dept)}
                                title="Xóa phòng ban"
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Modals */}
      {/* Create Modal */}
      <CreateDepartmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleReload}
        usersList={allUsers}
      />

      {/* Edit Modal */}
      <EditDepartmentModal
        isOpen={Boolean(editingDepartment)}
        onClose={() => setEditingDepartment(null)}
        onSuccess={handleReload}
        department={editingDepartment}
        usersList={allUsers}
      />

      {/* Delete Modal */}
      <DeleteDepartmentModal
        isOpen={Boolean(deletingDepartment)}
        onClose={() => setDeletingDepartment(null)}
        onSuccess={handleReload}
        department={deletingDepartment}
      />

      {/* Members Modal */}
      <DepartmentMembersModal
        isOpen={Boolean(managingMembersDept)}
        onClose={() => setManagingMembersDept(null)}
        department={managingMembersDept}
        canEdit={isAdminOrDirector}
        usersList={allUsers}
        onSuccess={handleReload}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Role, SystemPageItem } from "@/types";
import { LoadingSection } from "@/components/ui/Loading";
import { RoleMatrixModal } from "@/components/roles/RoleMatrixModal";
import { DeleteRoleModal } from "@/components/roles/DeleteRoleModal";

export default function RolesManagementPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [systemPages, setSystemPages] = useState<SystemPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // Bảo vệ trang: Chỉ Admin và Giám đốc được truy cập
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/");
      } else if (user.role !== "admin" && user.role !== "director") {
        router.replace("/dashboard");
      }
    }
  }, [isLoading, user, router]);

  // Tải danh sách roles và danh mục systemPages
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetch("/api/roles");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Không thể tải danh sách vai trò");
      }

      setRoles(json.data.roles || []);
      setSystemPages(json.data.systemPages || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "director")) {
      fetchRoles();
    }
  }, [user, fetchRoles]);

  // Xử lý sau khi lưu hoặc xóa role
  const handleRoleSaved = (savedRole: Role) => {
    setRoles((prev) => {
      const idx = prev.findIndex((r) => r.id === savedRole.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedRole;
        return next;
      }
      return [savedRole, ...prev];
    });
    fetchRoles();
  };

  const handleRoleDeleted = (deletedRoleId: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== deletedRoleId));
    fetchRoles();
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalRoles = roles.length;
    const systemRoles = roles.filter((r) => r.isSystem).length;
    const customRoles = totalRoles - systemRoles;
    const totalAssignedUsers = roles.reduce((acc, r) => acc + (r.userCount || 0), 0);

    return { totalRoles, systemRoles, customRoles, totalAssignedUsers };
  }, [roles]);

  // Tìm kiếm
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.trim().toLowerCase();

    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, searchQuery]);

  return (
    <div className="w-full px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* =========================================================================
          1. HEADER TRANG (Tối ưu cho cả Mobile & Desktop)
         ========================================================================= */}
      {/* 1.1 Mobile Header (sm:hidden) */}
      <div className="sm:hidden flex items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base shrink-0">🛡️</span>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Vai Trò &amp; Phân Quyền
            </h1>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
            Cơ chế bảo mật RBAC &amp; phân luồng trang
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={fetchRoles}
            disabled={loading}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 active:scale-95 transition"
            title="Làm mới"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingRole(null);
              setIsMatrixModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <span>➕</span>
            <span>Tạo vai trò</span>
          </button>
        </div>
      </div>

      {/* 1.2 Desktop Header (hidden sm:flex) */}
      <div className="hidden sm:flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl shrink-0">🛡️</span>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Vai Trò &amp; Phân Quyền Truy Cập (RBAC)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900 shrink-0">
              Bảo Mật Hệ Thống
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Thiết lập vai trò công việc theo thực tế doanh nghiệp và quản lý ma trận truy cập 23 trang dashboard cho nhân sự
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Nút Làm mới */}
          <button
            type="button"
            onClick={fetchRoles}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition cursor-pointer"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Làm mới</span>
          </button>

          {/* Nút Tạo vai trò mới */}
          <button
            type="button"
            onClick={() => {
              setEditingRole(null);
              setIsMatrixModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-98 cursor-pointer"
          >
            <span className="text-sm">➕</span>
            <span>Tạo vai trò mới</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. HÀNG 4 THẺ CHỈ SỐ KPI TỔNG QUAN
         ========================================================================= */}
      {/* 2.1 Giao diện Mobile (Lưới 2x2 gọn đẹp) */}
      <div className="sm:hidden grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Tổng vai trò</span>
            <span className="text-xs">🛡️</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {stats.totalRoles}
            <span className="text-[10px] text-zinc-400 font-sans font-normal ml-1">nhóm</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Cốt lõi hệ thống</span>
            <span className="text-xs">🔒</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {stats.systemRoles}
            <span className="text-[10px] text-amber-500/70 font-sans font-normal ml-1">vai trò</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-blue-700 dark:text-blue-400">Tùy chỉnh</span>
            <span className="text-xs">⚙️</span>
          </div>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {stats.customRoles}
            <span className="text-[10px] text-blue-500/70 font-sans font-normal ml-1">vai trò</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Đã gán quyền</span>
            <span className="text-xs">👥</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.totalAssignedUsers}
            <span className="text-[10px] text-emerald-500/70 font-sans font-normal ml-1">nhân sự</span>
          </div>
        </div>
      </div>

      {/* 2.2 Giao diện Desktop (4 Cột Chuẩn) */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tổng số vai trò</span>
            <span className="text-base">🛡️</span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1.5">
            {stats.totalRoles}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">vai trò</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Các nhóm quyền trong hệ thống</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Cốt lõi hệ thống</span>
            <span className="text-base">🔒</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1.5">
            {stats.systemRoles}
            <span className="text-xs text-amber-600/70 font-sans font-normal ml-1">vai trò</span>
          </div>
          <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">Admin, Giám đốc, Quản lý...</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Vai trò tùy chỉnh</span>
            <span className="text-base">⚙️</span>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1.5">
            {stats.customRoles}
            <span className="text-xs text-blue-600/70 font-sans font-normal ml-1">vai trò</span>
          </div>
          <div className="text-[11px] text-blue-700/80 dark:text-blue-400/80 mt-1">Tự do tạo mới và cấp quyền</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Nhân sự đã gán quyền</span>
            <span className="text-base">👥</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1.5">
            {stats.totalAssignedUsers}
            <span className="text-xs text-emerald-600/70 font-sans font-normal ml-1">nhân sự</span>
          </div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">Đang hoạt động trong tổ chức</div>
        </div>
      </div>

      {/* =========================================================================
          3. THANH TÌM KIẾM
         ========================================================================= */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-2xs">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên vai trò, mã định danh, mô tả nhiệm vụ..."
            className="w-full h-9 sm:h-10 pl-8 sm:pl-9 pr-7 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-xs sm:text-sm">
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          4. DANH SÁCH VAI TRÒ (Mobile Cards & Desktop Table)
         ========================================================================= */}
      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
          <LoadingSection text="Đang tải danh sách vai trò & phân quyền..." size="md" />
        </div>
      ) : errorMsg ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-xs text-rose-600 space-y-2">
          <p className="font-semibold">{errorMsg}</p>
          <button
            type="button"
            onClick={fetchRoles}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition"
          >
            Thử tải lại
          </button>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center text-xs text-zinc-400 space-y-2">
          <div className="text-3xl">🛡️</div>
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">Không tìm thấy vai trò nào phù hợp</p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-2 text-blue-600 dark:text-blue-400 underline"
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* 4.1 Mobile Cards View (< md) */}
          <div className="md:hidden space-y-2.5">
            {filteredRoles.map((role) => {
              const allowedCount = role.allowedPages?.length || 0;
              const totalCount = systemPages.length || 23;
              const isFull = allowedCount >= totalCount;
              const percent = Math.min(100, Math.round((allowedCount / totalCount) * 100));

              return (
                <div
                  key={role.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2.5"
                >
                  {/* Hàng 1: Tên vai trò, loại, mã slug */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {role.name}
                        </h3>
                        {role.isSystem ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                            🔒 Hệ thống
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            ⚙️ Tùy chỉnh
                          </span>
                        )}
                      </div>
                      <code className="text-[10px] font-mono text-zinc-400 block mt-0.5">#{role.id}</code>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0">
                      👥 {role.userCount || 0} NV
                    </span>
                  </div>

                  {/* Hàng 2: Mô tả nhiệm vụ */}
                  {role.description && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {role.description}
                    </p>
                  )}

                  {/* Hàng 3: Tiến độ phân quyền & Trang chính */}
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">Quyền truy cập:</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {allowedCount} / {totalCount} trang ({percent}%)
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFull ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                      <span>Trang chính sau login:</span>
                      <code className="font-mono text-zinc-600 dark:text-zinc-300 truncate max-w-[170px]">
                        {role.defaultPage || "/dashboard/attendance"}
                      </code>
                    </div>
                  </div>

                  {/* Hàng 4: Thao tác (Sửa quyền, Xóa) */}
                  <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRole(role);
                        setIsMatrixModalOpen(true);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition shadow-2xs"
                    >
                      <span>✏️</span>
                      <span>Chỉnh sửa quyền</span>
                    </button>

                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => setDeletingRole(role)}
                        disabled={(role.userCount || 0) > 0}
                        className="py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 active:scale-98 transition shadow-2xs"
                        title={
                          (role.userCount || 0) > 0
                            ? `Đang có ${role.userCount} nhân sự sử dụng vai trò này`
                            : "Xóa vai trò"
                        }
                      >
                        <span>🗑️</span>
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4.2 Desktop Table View (>= md) */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 font-semibold">
                  <tr>
                    <th className="px-4 py-3.5">Vai trò &amp; Mã Role</th>
                    <th className="px-4 py-3.5">Loại</th>
                    <th className="px-4 py-3.5">Mô tả nhiệm vụ</th>
                    <th className="px-4 py-3.5">Số trang truy cập</th>
                    <th className="px-4 py-3.5">Trang hạ cánh</th>
                    <th className="px-4 py-3.5 text-center">Số nhân sự</th>
                    <th className="px-4 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredRoles.map((role) => {
                    const allowedCount = role.allowedPages?.length || 0;
                    const totalCount = systemPages.length || 23;
                    const isFull = allowedCount >= totalCount;
                    const percent = Math.min(100, Math.round((allowedCount / totalCount) * 100));

                    return (
                      <tr key={role.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        {/* Tên & Mã */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">
                            {role.name}
                          </div>
                          <code className="text-[10px] font-mono text-zinc-400">#{role.id}</code>
                        </td>

                        {/* Loại */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {role.isSystem ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                              🔒 Hệ thống
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                              ⚙️ Tùy chỉnh
                            </span>
                          )}
                        </td>

                        {/* Mô tả */}
                        <td className="px-4 py-3.5 max-w-[260px]">
                          <p className="text-zinc-600 dark:text-zinc-300 text-xs line-clamp-2 leading-relaxed">
                            {role.description || "—"}
                          </p>
                        </td>

                        {/* Số trang truy cập */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono font-bold text-xs ${
                                isFull
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              {allowedCount}/{totalCount}
                            </span>
                            <span className="text-[10px] text-zinc-400">trang ({percent}%)</span>
                          </div>
                          <div className="w-24 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isFull ? "bg-emerald-500" : "bg-blue-600"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </td>

                        {/* Trang hạ cánh */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                          {role.defaultPage || "/dashboard/attendance"}
                        </td>

                        {/* Số nhân sự */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {role.userCount || 0}
                          </span>
                        </td>

                        {/* Thao tác */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRole(role);
                                setIsMatrixModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                              title="Chỉnh sửa phân quyền vai trò"
                            >
                              <span>✏️</span>
                              <span>Sửa quyền</span>
                            </button>

                            {!role.isSystem && (
                              <button
                                type="button"
                                onClick={() => setDeletingRole(role)}
                                disabled={(role.userCount || 0) > 0}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95 shadow-2xs"
                                title={
                                  (role.userCount || 0) > 0
                                    ? `Đang có ${role.userCount} nhân sự dùng vai trò này`
                                    : "Xóa vai trò"
                                }
                              >
                                <span>🗑️</span>
                                <span>Xóa</span>
                              </button>
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
        </div>
      )}

      {/* =========================================================================
          5. MODALS
         ========================================================================= */}
      {isMatrixModalOpen && (
        <RoleMatrixModal
          isOpen={isMatrixModalOpen}
          onClose={() => {
            setIsMatrixModalOpen(false);
            setEditingRole(null);
          }}
          role={editingRole}
          systemPages={systemPages}
          onRoleSaved={handleRoleSaved}
        />
      )}

      {deletingRole && (
        <DeleteRoleModal
          isOpen={Boolean(deletingRole)}
          onClose={() => setDeletingRole(null)}
          role={deletingRole}
          onRoleDeleted={handleRoleDeleted}
        />
      )}
    </div>
  );
}

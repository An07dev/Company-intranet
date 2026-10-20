"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Role, SystemPageItem, CreateRoleInput, UpdateRoleInput } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface RoleMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null; // null = Tạo mới, có giá trị = Chỉnh sửa
  systemPages: SystemPageItem[];
  onRoleSaved: (savedRole: Role) => void;
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function RoleMatrixModal({
  isOpen,
  onClose,
  role,
  systemPages,
  onRoleSaved,
}: RoleMatrixModalProps) {
  const isEditing = Boolean(role);

  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [isManualRoleId, setIsManualRoleId] = useState(false);
  const [description, setDescription] = useState("");
  const [defaultPage, setDefaultPage] = useState("/dashboard/attendance");
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [searchPage, setSearchPage] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Điền dữ liệu khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg("");
    setSearchPage("");
    setActiveCategoryFilter("all");

    if (role) {
      setName(role.name || "");
      setRoleId(role.id || "");
      setIsManualRoleId(true);
      setDescription(role.description || "");
      setDefaultPage(role.defaultPage || "/dashboard/attendance");
      setSelectedPages([...(role.allowedPages || [])]);
    } else {
      setName("");
      setRoleId("");
      setIsManualRoleId(false);
      setDescription("");
      setDefaultPage("/dashboard/attendance");
      setSelectedPages([
        "/dashboard/chat",
        "/dashboard/tasks",
        "/dashboard/attendance",
        "/dashboard/requests",
        "/dashboard/regulations",
        "/dashboard/guide",
        "/dashboard/profile",
      ]);
    }
  }, [isOpen, role]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && !isManualRoleId) {
      setRoleId(toSlug(val));
    }
  };

  // Gom nhóm các trang theo danh mục
  const groupedPages = useMemo(() => {
    const map = new Map<string, { label: string; pages: SystemPageItem[] }>();

    systemPages.forEach((p) => {
      if (!map.has(p.category)) {
        map.set(p.category, { label: p.categoryLabel, pages: [] });
      }
      map.get(p.category)!.pages.push(p);
    });

    return Array.from(map.entries()).map(([catKey, val]) => ({
      category: catKey,
      categoryLabel: val.label,
      pages: val.pages,
    }));
  }, [systemPages]);

  // Danh sách các danh mục để tạo filter tabs
  const categoriesList = useMemo(() => {
    return groupedPages.map((g) => ({
      key: g.category,
      label: g.categoryLabel,
      total: g.pages.length,
      selected: g.pages.filter((p) => selectedPages.includes(p.path)).length,
    }));
  }, [groupedPages, selectedPages]);

  // Lọc theo từ khóa tìm kiếm trang & danh mục
  const filteredGroups = useMemo(() => {
    let groups = groupedPages;

    // Lọc theo Tab Danh mục
    if (activeCategoryFilter === "selected") {
      groups = groups
        .map((g) => ({
          ...g,
          pages: g.pages.filter((p) => selectedPages.includes(p.path)),
        }))
        .filter((g) => g.pages.length > 0);
    } else if (activeCategoryFilter === "unselected") {
      groups = groups
        .map((g) => ({
          ...g,
          pages: g.pages.filter((p) => !selectedPages.includes(p.path)),
        }))
        .filter((g) => g.pages.length > 0);
    } else if (activeCategoryFilter !== "all") {
      groups = groups.filter((g) => g.category === activeCategoryFilter);
    }

    // Lọc theo từ khóa tìm kiếm
    if (searchPage.trim()) {
      const q = searchPage.trim().toLowerCase();
      groups = groups
        .map((g) => ({
          ...g,
          pages: g.pages.filter(
            (p) =>
              p.label.toLowerCase().includes(q) ||
              p.path.toLowerCase().includes(q) ||
              (p.description && p.description.toLowerCase().includes(q))
          ),
        }))
        .filter((g) => g.pages.length > 0);
    }

    return groups;
  }, [groupedPages, activeCategoryFilter, searchPage, selectedPages]);

  if (!isOpen) return null;

  const isSystemRole = Boolean(role?.isSystem);

  const togglePage = (path: string) => {
    if (isSystemRole) return;
    // Bắt buộc giữ lại các trang cơ bản
    if (path === "/dashboard/profile" || path === "/dashboard/regulations" || path === "/dashboard/guide") {
      return;
    }

    if (selectedPages.includes(path)) {
      const next = selectedPages.filter((p) => p !== path);
      setSelectedPages(next);
      if (defaultPage === path) {
        setDefaultPage(next[0] || "/dashboard/attendance");
      }
    } else {
      setSelectedPages([...selectedPages, path]);
    }
  };

  const selectAllCategory = (catPages: SystemPageItem[]) => {
    if (isSystemRole) return;
    const pathsToAdd = catPages.map((p) => p.path);
    const set = new Set([...selectedPages, ...pathsToAdd]);
    setSelectedPages(Array.from(set));
  };

  const deselectAllCategory = (catPages: SystemPageItem[]) => {
    if (isSystemRole) return;
    const pathsToRemove = new Set(
      catPages
        .map((p) => p.path)
        .filter(
          (p) =>
            p !== "/dashboard/profile" &&
            p !== "/dashboard/regulations" &&
            p !== "/dashboard/guide"
        )
    );
    setSelectedPages(selectedPages.filter((p) => !pathsToRemove.has(p)));
  };

  const selectAllAll = () => {
    if (isSystemRole) return;
    setSelectedPages(systemPages.map((p) => p.path));
  };

  const resetToBasic = () => {
    if (isSystemRole) return;
    setSelectedPages([
      "/dashboard/chat",
      "/dashboard/tasks",
      "/dashboard/attendance",
      "/dashboard/requests",
      "/dashboard/regulations",
      "/dashboard/guide",
      "/dashboard/profile",
    ]);
    setDefaultPage("/dashboard/attendance");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập tên vai trò");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload: CreateRoleInput | UpdateRoleInput = {
        name: name.trim(),
        description: description.trim(),
        allowedPages: selectedPages,
        defaultPage,
      };

      if (!isEditing) {
        (payload as CreateRoleInput).id = roleId.trim() || undefined;
      }

      const url = isEditing ? `/api/roles/${role!.id}` : "/api/roles";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Lưu vai trò thất bại");
      }

      onRoleSaved(json.data);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      {/* Modal Container: Max-w-3xl, centered with my-auto, strictly constrained by max-h */}
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col my-auto max-h-[88vh] overflow-hidden">
        {/* 1. Header (Sticky Top) */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-base sm:text-lg shadow-2xs shrink-0">
              🛡️
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {isEditing ? `Sửa Vai Trò: ${role?.name}` : "Tạo Vai Trò & Phân Quyền"}
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate hidden sm:block">
                Thiết lập quyền truy cập chi tiết vào từng trang nghiệp vụ cho nhân sự
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
            title="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        {/* 2. Scrollable Body (Only this area scrolls!) */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 text-xs min-h-0 overscroll-contain">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs">
                <span className="shrink-0">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {isSystemRole && (
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <span className="text-base shrink-0 mt-0.5">ℹ️</span>
                <p className="text-[11px] sm:text-xs leading-relaxed">
                  Đây là vai trò hệ thống cốt lõi. Mặc định có toàn quyền truy cập toàn bộ các trang. Bạn có thể tinh chỉnh tên hiển thị, mô tả và trang hạ cánh mặc định sau khi đăng nhập.
                </p>
              </div>
            )}

            {/* 2.1 Thông tin chung vai trò */}
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Tên vai trò */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                    Tên vai trò <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="VD: Kế Toán Trưởng, Thủ Kho..."
                    required
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Mã Role (Slug) */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                    Mã định danh (Role ID)
                  </label>
                  <input
                    type="text"
                    value={roleId}
                    onChange={(e) => {
                      setRoleId(e.target.value);
                      setIsManualRoleId(true);
                    }}
                    disabled={isEditing}
                    placeholder="VD: ke_toan_truong, thu_kho..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    {isEditing ? "Mã định danh không đổi sau khi tạo." : "Tự động sinh theo tên tiếng Việt."}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Mô tả vai trò */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                    Mô tả chức năng nhiệm vụ
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="VD: Phụ trách quản lý tồn kho và vận đơn Shopee..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Trang hạ cánh mặc định */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                    Trang hạ cánh mặc định (Sau đăng nhập)
                  </label>
                  <select
                    value={defaultPage}
                    onChange={(e) => setDefaultPage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    {systemPages
                      .filter((p) => isSystemRole || selectedPages.includes(p.path))
                      .map((p) => (
                        <option key={p.path} value={p.path}>
                          {p.icon || "📄"} {p.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2.2 Khu vực Ma trận phân quyền các trang */}
            <div className="space-y-3">
              {/* Header phần ma trận */}
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 pt-1">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span>📑 Phân Quyền Truy Cập Các Pages</span>
                    <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                      ({selectedPages.length}/{systemPages.length})
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Tích chọn trang được phép xem trên menu và truy cập URL
                  </p>
                </div>

              </div>

              {/* Ô tìm kiếm trang */}
              <div className="relative">
                <input
                  type="text"
                  value={searchPage}
                  onChange={(e) => setSearchPage(e.target.value)}
                  placeholder="Tìm trang theo tên, đường dẫn, mô tả..."
                  className="w-full px-3.5 py-2 pl-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  🔍
                </span>
                {searchPage && (
                  <button
                    type="button"
                    onClick={() => setSearchPage("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick Filter Tabs (Horizontal Scrollable for Mobile & Desktop) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition cursor-pointer shrink-0 ${activeCategoryFilter === "all"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                    }`}
                >
                  Tất cả ({systemPages.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter("selected")}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition cursor-pointer shrink-0 ${activeCategoryFilter === "selected"
                    ? "bg-blue-600 text-white font-semibold shadow-2xs"
                    : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50"
                    }`}
                >
                  Đã cấp ({selectedPages.length})
                </button>

                {categoriesList.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat.key)}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition cursor-pointer shrink-0 ${activeCategoryFilter === cat.key
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                      }`}
                  >
                    {cat.label} ({cat.selected}/{cat.total})
                  </button>
                ))}
              </div>

              {/* Danh sách các nhóm trang */}
              <div className="space-y-3 pt-1">
                {filteredGroups.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    Không tìm thấy trang nào phù hợp với bộ lọc hiện tại.
                  </div>
                ) : (
                  filteredGroups.map((group) => {
                    const groupPaths = group.pages.map((p) => p.path);
                    const selectedInGroup = groupPaths.filter((p) => selectedPages.includes(p)).length;
                    const isAllSelected = selectedInGroup === groupPaths.length;

                    return (
                      <div
                        key={group.category}
                        className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs"
                      >
                        {/* Header nhóm */}
                        <div className="px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {group.categoryLabel}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shrink-0">
                              {selectedInGroup}/{group.pages.length}
                            </span>
                          </div>

                          {!isSystemRole && (
                            <button
                              type="button"
                              onClick={() =>
                                isAllSelected
                                  ? deselectAllCategory(group.pages)
                                  : selectAllCategory(group.pages)
                              }
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0 py-0.5 px-1"
                            >
                              {isAllSelected ? "Bỏ chọn" : "Chọn hết"}
                            </button>
                          )}
                        </div>

                        {/* Danh sách thẻ trang (1 col mobile, 2 col sm/md+) */}
                        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.pages.map((page) => {
                            const isChecked = isSystemRole || selectedPages.includes(page.path);
                            const isLocked =
                              isSystemRole ||
                              page.path === "/dashboard/profile" ||
                              page.path === "/dashboard/regulations" ||
                              page.path === "/dashboard/guide";

                            return (
                              <label
                                key={page.path}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition select-none active:scale-[0.99] ${isChecked
                                  ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700/80 shadow-2xs"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
                                  } ${isLocked ? "cursor-default opacity-85" : "cursor-pointer"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isLocked}
                                  onChange={() => togglePage(page.path)}
                                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm shrink-0">{page.icon || "📄"}</span>
                                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                                      {page.label}
                                    </span>
                                  </div>
                                  <div className="font-mono text-[10px] text-zinc-400 truncate mt-0.5">
                                    {page.path}
                                  </div>
                                  {page.description && (
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1 leading-snug">
                                      {page.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 3. Sticky Footer (Always Visible at Bottom, Never Cut Off) */}
          <div className="p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs flex items-center justify-between gap-2.5 shrink-0">
            {/* Status indicator on mobile & desktop */}
            <div className="flex items-center gap-1.5 text-xs min-w-0">
              <span className="text-zinc-500 dark:text-zinc-400 hidden xs:inline truncate">
                Đã cấp quyền:
              </span>
              <span className="px-2 py-0.5 rounded-full font-mono font-bold text-xs bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900 shrink-0">
                {selectedPages.length}/{systemPages.length} trang
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3.5 sm:px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>{isEditing ? "Lưu thay đổi" : "Tạo vai trò"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

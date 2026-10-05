"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Asset,
  AssetStats,
  ASSET_CATEGORY_ICONS,
  ASSET_CATEGORY_LABELS,
  ASSET_STATUS_COLORS,
  ASSET_STATUS_LABELS,
} from "@/types";
import { CreateAssetModal } from "@/components/assets/CreateAssetModal";
import { EditAssetModal } from "@/components/assets/EditAssetModal";
import { HandoverAssetModal } from "@/components/assets/HandoverAssetModal";
import { RecallAssetModal } from "@/components/assets/RecallAssetModal";
import { AssetDetailModal } from "@/components/assets/AssetDetailModal";

export default function AssetsPage() {
  const { user } = useAuth();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "available" | "in_use" | "my_assets">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Phân trang: Đúng 10 sản phẩm mỗi trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [handoverAsset, setHandoverAsset] = useState<Asset | null>(null);
  const [recallAsset, setRecallAsset] = useState<Asset | null>(null);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  const canManage =
    user?.role === "admin" || user?.role === "director" || user?.role === "manager";

  // Tải danh sách
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        stats: "true",
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (selectedCategory && selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }

      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/assets?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAssets(data.data.items || []);
        setTotalPages(data.data.totalPages || 1);
        setTotalRecords(data.data.total || 0);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load assets:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, searchQuery, currentPage, pageSize]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Đổi tab: reset về trang 1
  const handleTabChange = (tab: "all" | "available" | "in_use" | "my_assets") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Đổi phân loại: reset về trang 1
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  // Tìm kiếm: reset về trang 1
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

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

  // Cập nhật sau các thao tác
  const handleCreated = (newAsset: Asset) => {
    setAssets((prev) => [newAsset, ...prev]);
    fetchAssets();
  };

  const handleHandedOver = (updated: Asset) => {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (detailAsset?.id === updated.id) setDetailAsset(updated);
    fetchAssets();
  };

  const handleRecalled = (updated: Asset) => {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (detailAsset?.id === updated.id) setDetailAsset(updated);
    fetchAssets();
  };

  const handleUpdated = (updated: Asset) => {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (detailAsset?.id === updated.id) setDetailAsset(updated);
    fetchAssets();
  };

  const handleDeleted = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    fetchAssets();
  };

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3 sm:space-y-4">
      {/* Header - Trên mobile tinh gọn, ẩn phụ đề, nút bấm full-width chia đôi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">💻</span>
            <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white">
              Tải Sản & Bàn Giao
            </h1>
          </div>
          <p className="hidden sm:block text-xs text-zinc-500 mt-0.5">
            Quản lý thiết bị trong kho và cấp phát bàn giao cho nhân sự
          </p>
        </div>

        {canManage && (
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            {/* Nút 1: Thêm sản phẩm */}
            <button
              onClick={() => setCreateModalOpen(true)}
              className="py-2 px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>➕</span>
              <span>Thêm SP</span>
            </button>

            {/* Nút 2: Bàn giao */}
            <button
              onClick={() => {
                setHandoverAsset(null);
                setHandoverModalOpen(true);
              }}
              className="py-2 px-3 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>🤝</span>
              <span>Bàn giao</span>
            </button>
          </div>
        )}
      </div>


      {/* Bộ lọc tabs & Tìm kiếm */}
      <div className="bg-white dark:bg-zinc-900 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2.5 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold scrollbar-none pb-0.5">
            <button
              onClick={() => handleTabChange("all")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl transition-colors whitespace-nowrap text-[11px] sm:text-xs ${activeTab === "all"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
            >
              Tất cả ({stats?.total ?? totalRecords})
            </button>

            <button
              onClick={() => handleTabChange("available")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl transition-colors whitespace-nowrap text-[11px] sm:text-xs ${activeTab === "available"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
            >
              Trong kho ({stats?.available ?? 0})
            </button>

            <button
              onClick={() => handleTabChange("in_use")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl transition-colors whitespace-nowrap text-[11px] sm:text-xs ${activeTab === "in_use"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
            >
              Đã bàn giao ({stats?.inUse ?? 0})
            </button>

            <button
              onClick={() => handleTabChange("my_assets")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl transition-colors whitespace-nowrap text-[11px] sm:text-xs ${activeTab === "my_assets"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
            >
              👤 Của tôi
            </button>
          </div>

          {/* Nhóm Bộ lọc Phân loại & Ô tìm kiếm */}
          <div className="flex items-center gap-2 flex-col sm:flex-row w-full sm:w-auto">
            {/* Bộ lọc phân loại */}
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full sm:w-44 px-2.5 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Tất cả phân loại</option>
              <option value="it_equipment">💻 Thiết bị IT</option>
              <option value="office_equipment">🖨️ Thiết bị văn phòng</option>
              <option value="furniture">🪑 Bàn ghế / Nội thất</option>
              <option value="vehicle">🚗 Phương tiện</option>
              <option value="other">📦 Khác</option>
            </select>

            {/* Ô tìm kiếm */}
            <div className="relative w-full sm:w-56">
              <span className="absolute left-3 top-2 text-zinc-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Tìm tên, mã sản phẩm..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách Sản Phẩm */}
      {loading ? (
        <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          Đang tải dữ liệu...
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="text-3xl">📦</div>
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Không có sản phẩm nào
          </div>
          {canManage && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <span>➕</span>
              <span>Thêm sản phẩm mới</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ================= GIAO DIỆN DESKTOP (GIỮ NGUYÊN BẢNG ĐẦY ĐỦ CHO PC) ================= */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-zinc-500 font-semibold">
                  <th className="py-3 px-4">Tên sản phẩm</th>
                  <th className="py-3 px-4">Mã</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Tình trạng</th>
                  <th className="py-3 px-4">Trạng thái / Đang giữ bởi</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {assets.map((item) => {
                  const statusColor = ASSET_STATUS_COLORS[item.status] || ASSET_STATUS_COLORS.available;
                  const catIcon = ASSET_CATEGORY_ICONS[item.category] || "📦";
                  const catLabel = ASSET_CATEGORY_LABELS[item.category] || item.category;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                      {/* Tên */}
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          {item.imageUrl ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <span className="text-base">{catIcon}</span>
                          )}
                          <span className="truncate max-w-[220px]">{item.name}</span>
                        </div>
                      </td>

                      {/* Mã */}
                      <td className="py-3 px-4 font-mono font-medium text-zinc-600 dark:text-zinc-400">
                        {item.code}
                      </td>

                      {/* Loại */}
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                        {catIcon} {catLabel}
                      </td>

                      {/* Tình trạng */}
                      <td className="py-3 px-4 text-zinc-500">
                        {item.condition || "Tốt"}
                      </td>

                      {/* Trạng thái / Người giữ */}
                      <td className="py-3 px-4">
                        {item.status === "in_use" && item.currentAssigneeName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="font-medium text-blue-700 dark:text-blue-300">
                              {item.currentAssigneeName}
                            </span>
                            {item.currentAssigneeCode && (
                              <span className="text-[10px] text-zinc-400 font-mono">
                                ({item.currentAssigneeCode})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                            {ASSET_STATUS_LABELS[item.status] || item.status}
                          </span>
                        )}
                      </td>

                      {/* Nút hành động */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Nút Bàn giao (nếu chưa ai dùng) */}
                          {canManage && item.status !== "in_use" && (
                            <button
                              onClick={() => {
                                setHandoverAsset(item);
                                setHandoverModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                            >
                              Bàn giao
                            </button>
                          )}

                          {/* Nút Thu hồi (nếu đang dùng) */}
                          {canManage && item.status === "in_use" && (
                            <button
                              onClick={() => setRecallAsset(item)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-300 dark:border-amber-800 font-medium transition-colors"
                            >
                              Thu hồi
                            </button>
                          )}

                          {/* Nút xem chi tiết */}
                          <button
                            onClick={() => setDetailAsset(item)}
                            className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            Chi tiết
                          </button>

                          {/* Nút sửa */}
                          {canManage && (
                            <button
                              onClick={() => setEditAsset(item)}
                              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                              title="Sửa"
                            >
                              ✏️
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

          {/* ================= GIAO DIỆN MOBILE TỐI ƯU (CHỈ HIỆN CÁC MỤC CHÍNH) ================= */}
          {/* Ẩn các chi tiết phụ không quan trọng, tập trung: Tên + Mã + Trạng thái/Người giữ + Nút Bàn giao/Thu hồi */}
          <div className="md:hidden space-y-2">
            {assets.map((item) => {
              const catIcon = ASSET_CATEGORY_ICONS[item.category] || "📦";

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-2.5"
                >
                  {/* Cột trái: Thumbnail + Tên + Mã + Người giữ/Trạng thái */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Ảnh hoặc Icon phân loại */}
                    {item.imageUrl ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">
                        {catIcon}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      {/* Tên sản phẩm */}
                      <div className="font-bold text-zinc-900 dark:text-white text-xs truncate">
                        {item.name}
                      </div>

                      {/* Mã + Trạng thái chính */}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="font-mono text-[10px] font-semibold px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {item.code}
                        </span>

                        {item.status === "in_use" && item.currentAssigneeName ? (
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate max-w-[130px]">
                            👤 {item.currentAssigneeName}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Trong kho
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cột phải: Thao tác chính trực tiếp (Bàn giao / Thu hồi / Xem chi tiết) */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {canManage && item.status !== "in_use" && (
                      <button
                        onClick={() => {
                          setHandoverAsset(item);
                          setHandoverModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
                      >
                        Bàn giao
                      </button>
                    )}

                    {canManage && item.status === "in_use" && (
                      <button
                        onClick={() => setRecallAsset(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-sm"
                      >
                        Thu hồi
                      </button>
                    )}

                    <button
                      onClick={() => setDetailAsset(item)}
                      title="Xem chi tiết"
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs hover:bg-zinc-100"
                    >
                      ℹ️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================= THANH PHÂN TRANG (PAGINATION) ================= */}
          {totalRecords > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 text-xs bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              {/* Thống kê bản ghi (ẩn trên mobile để tránh chật chội) */}
              <div className="hidden sm:block text-zinc-500 text-center sm:text-left">
                Hiển thị{" "}
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)}
                </span>{" "}
                trên tổng số{" "}
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {totalRecords}
                </span>{" "}
                sản phẩm
              </div>

              {/* Các nút bấm trang */}
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs"
                >
                  ← Trước
                </button>

                {/* Các số trang (Desktop & Tablet) */}
                <div className="hidden sm:flex items-center gap-1">
                  {paginationItems.map((item, idx) =>
                    item === "..." ? (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-zinc-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${item}`}
                        onClick={() => setCurrentPage(Number(item))}
                        className={`min-w-[30px] h-7 rounded-lg text-xs font-semibold transition-colors ${currentPage === item
                          ? "bg-blue-600 text-white shadow-sm"
                          : "border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>

                {/* Hiển thị số trang trên Mobile */}
                <span className="sm:hidden text-zinc-600 dark:text-zinc-300 font-semibold text-xs">
                  Trang {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 1. Modal Thêm sản phẩm */}
      <CreateAssetModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreated}
      />

      {/* 2. Modal Bàn giao sản phẩm */}
      <HandoverAssetModal
        isOpen={handoverModalOpen}
        onClose={() => {
          setHandoverModalOpen(false);
          setHandoverAsset(null);
        }}
        asset={handoverAsset}
        onHandedOver={handleHandedOver}
      />

      {/* 3. Modal Thu hồi sản phẩm */}
      <RecallAssetModal
        isOpen={!!recallAsset}
        onClose={() => setRecallAsset(null)}
        asset={recallAsset}
        onRecalled={handleRecalled}
      />

      {/* 4. Modal Sửa sản phẩm */}
      <EditAssetModal
        isOpen={!!editAsset}
        onClose={() => setEditAsset(null)}
        asset={editAsset}
        onUpdated={handleUpdated}
      />

      {/* 5. Modal Chi tiết sản phẩm */}
      <AssetDetailModal
        isOpen={!!detailAsset}
        onClose={() => setDetailAsset(null)}
        asset={detailAsset}
        currentUser={user}
        onOpenHandover={(a) => {
          setHandoverAsset(a);
          setHandoverModalOpen(true);
        }}
        onOpenRecall={(a) => setRecallAsset(a)}
        onOpenEdit={(a) => setEditAsset(a)}
        onDeleteAsset={handleDeleted}
      />
    </div>
  );
}

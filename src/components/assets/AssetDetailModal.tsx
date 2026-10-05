"use client";

import React, { useState } from "react";
import {
  Asset,
  User,
  ASSET_CATEGORY_LABELS,
  ASSET_CATEGORY_ICONS,
  ASSET_STATUS_LABELS,
  ASSET_STATUS_COLORS,
} from "@/types";

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  currentUser: User | null;
  onOpenHandover: (asset: Asset) => void;
  onOpenRecall: (asset: Asset) => void;
  onOpenEdit: (asset: Asset) => void;
  onDeleteAsset: (assetId: string) => void;
}

export function AssetDetailModal({
  isOpen,
  onClose,
  asset,
  currentUser,
  onOpenHandover,
  onOpenRecall,
  onOpenEdit,
  onDeleteAsset,
}: AssetDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !asset) return null;

  const canManage =
    currentUser?.role === "admin" ||
    currentUser?.role === "director" ||
    currentUser?.role === "manager";

  const statusColor = ASSET_STATUS_COLORS[asset.status] || ASSET_STATUS_COLORS.available;
  const statusLabel = ASSET_STATUS_LABELS[asset.status] || asset.status;
  const categoryLabel = ASSET_CATEGORY_LABELS[asset.category] || asset.category;
  const categoryIcon = ASSET_CATEGORY_ICONS[asset.category] || "📦";

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Không thể xóa");
      }
      onDeleteAsset(asset.id);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi khi xóa");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                {asset.code}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                {statusLabel}
              </span>
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white truncate">
              {asset.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Ảnh sản phẩm nếu có */}
          {asset.imageUrl && (
            <div className="w-full h-40 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-zinc-400">Phân loại:</span>{" "}
              <b className="text-zinc-800 dark:text-zinc-200">{categoryIcon} {categoryLabel}</b>
            </div>
            <div>
              <span className="text-zinc-400">Tình trạng:</span>{" "}
              <b className="text-zinc-800 dark:text-zinc-200">{asset.condition || "Tốt"}</b>
            </div>
            {asset.description && (
              <div className="col-span-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-zinc-400">Ghi chú:</span>{" "}
                <span className="text-zinc-700 dark:text-zinc-300">{asset.description}</span>
              </div>
            )}
          </div>

          {/* Đang bàn giao cho ai */}
          {asset.status === "in_use" && asset.currentAssigneeName && (
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
              <div className="font-semibold text-blue-800 dark:text-blue-300">
                👤 Nhân sự đang sử dụng:
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center font-bold text-blue-700 dark:text-blue-200 text-sm flex-shrink-0">
                  {asset.currentAssigneeName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-zinc-900 dark:text-white truncate">
                    {asset.currentAssigneeName}
                    {asset.currentAssigneeCode && (
                      <span className="ml-1.5 font-normal text-zinc-500 font-mono">
                        ({asset.currentAssigneeCode})
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-500 truncate">
                    {asset.currentAssigneeDepartment || "Nhân viên"} • Bàn giao ngày: {asset.assignedDate || "Gần đây"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lịch sử bàn giao & thu hồi */}
          <div className="space-y-2">
            <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <span>📜</span>
              <span>Lịch sử bàn giao ({asset.handoverHistory?.length || 0})</span>
            </div>

            {(!asset.handoverHistory || asset.handoverHistory.length === 0) ? (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-center text-zinc-400 italic">
                Chưa có lịch sử bàn giao nào
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {asset.handoverHistory
                  .slice()
                  .reverse()
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                            log.action === "handover"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                          }`}
                        >
                          {log.action === "handover" ? "🤝 Bàn giao" : "📥 Thu hồi"}
                        </span>
                        <span className="text-zinc-400 text-[10px]">{log.date}</span>
                      </div>
                      <div className="text-zinc-800 dark:text-zinc-200">
                        {log.action === "handover" ? "Giao cho:" : "Nhận lại từ:"}{" "}
                        <b>{log.userName}</b>
                      </div>
                      {log.note && (
                        <div className="text-zinc-500 italic text-[11px]">&ldquo;{log.note}&rdquo;</div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 gap-2">
          {canManage && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || asset.status === "in_use"}
                title={asset.status === "in_use" ? "Cần thu hồi trước khi xóa" : "Xóa"}
                className="px-2.5 py-1.5 font-medium rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-40 transition-colors"
              >
                {confirmDelete ? "Xóa thật?" : "Xóa"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(asset);
                }}
                className="px-2.5 py-1.5 font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Sửa
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {canManage && asset.status === "in_use" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRecall(asset);
                }}
                className="px-3.5 py-1.5 font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1"
              >
                <span>📥</span>
                <span>Thu hồi</span>
              </button>
            )}

            {canManage && asset.status !== "in_use" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHandover(asset);
                }}
                className="px-3.5 py-1.5 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1"
              >
                <span>🤝</span>
                <span>Bàn giao</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

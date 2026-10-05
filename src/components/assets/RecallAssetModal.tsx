"use client";

import React, { useState } from "react";
import { Asset, RecallAssetInput } from "@/types";

interface RecallAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onRecalled: (updatedAsset: Asset) => void;
}

export function RecallAssetModal({
  isOpen,
  onClose,
  asset,
  onRecalled,
}: RecallAssetModalProps) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: RecallAssetInput = {
        date: new Date().toISOString().slice(0, 10),
        condition: asset.condition || "Tốt",
        newStatus: "available",
        note: note.trim() || "Thu hồi sản phẩm về kho",
      };

      const res = await fetch(`/api/assets/${asset.id}/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Không thể thu hồi");
      }

      onRecalled(data.data);
      setNote("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">📥</span>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Thu Hồi Về Kho
              </h2>
              <p className="text-xs text-zinc-500">Thu hồi sản phẩm từ nhân viên</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Thông tin sản phẩm & Người dùng */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 space-y-1">
            <div className="font-semibold text-zinc-900 dark:text-white text-sm">
              {asset.name}
            </div>
            <div className="text-zinc-500">Mã: <span className="font-mono">{asset.code}</span></div>
            <div className="text-zinc-600 dark:text-zinc-300 pt-1 border-t border-zinc-200 dark:border-zinc-700">
              Đang giữ bởi: <b>{asset.currentAssigneeName}</b>
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Ghi chú thu hồi <span className="text-zinc-400 font-normal">(tùy chọn)</span>
            </label>
            <input
              type="text"
              placeholder="VD: Thu hồi khi chuyển dự án, máy còn tốt..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Xác nhận thu hồi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

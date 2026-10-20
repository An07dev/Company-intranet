"use client";

import React, { useState } from "react";
import { Role } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface DeleteRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onRoleDeleted: (roleId: string) => void;
}

export function DeleteRoleModal({
  isOpen,
  onClose,
  role,
  onRoleDeleted,
}: DeleteRoleModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !role) return null;

  const hasUsers = (role.userCount || 0) > 0;
  const isSystemRole = Boolean(role.isSystem);

  const handleDelete = async () => {
    if (isSystemRole || hasUsers) return;

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch(`/api/roles/${role.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Xóa vai trò thất bại");
      }

      onRoleDeleted(role.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-950/50">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm sm:text-base">
            <span className="text-base">⚠️</span>
            <span>Xác nhận xóa vai trò</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-xs sm:text-sm">
            Bạn có chắc chắn muốn xóa vai trò{" "}
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{role.name}</strong> (Mã định danh:{" "}
            <code className="font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
              #{role.id}
            </code>
            )?
          </p>

          {isSystemRole ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 leading-relaxed text-[11px] sm:text-xs">
              🔒 Đây là vai trò cốt lõi của hệ thống, không thể xóa để tránh lỗi vận hành và phân luồng quyền truy cập.
            </div>
          ) : hasUsers ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 leading-relaxed text-[11px] sm:text-xs">
              ⚠️ Hiện đang có <strong>{role.userCount} nhân sự</strong> được gán vai trò này. Bạn phải chuyển đổi vai trò cho những nhân sự này trước khi có thể xóa vai trò.
            </div>
          ) : (
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Hành động này sẽ xóa hoàn toàn cấu hình phân quyền của vai trò này khỏi cơ sở dữ liệu và không thể hoàn tác.
            </p>
          )}

          {/* Nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 sm:py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-center"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSystemRole || hasUsers || submitting}
              className="flex-1 sm:flex-none px-4 py-2 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-center"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <span>Xóa vai trò</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

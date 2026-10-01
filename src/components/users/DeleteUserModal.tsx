"use client";

import React, { useState } from "react";
import { User } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface DeleteUserModalProps {
  user: User | null;
  currentUserId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteUserModal({
  user,
  currentUserId,
  isOpen,
  onClose,
  onSuccess,
}: DeleteUserModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentUserId;

  const handleDelete = async () => {
    if (isSelf) {
      setErrorMsg("Bạn không thể tự xóa tài khoản của chính mình");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Xóa người dùng thất bại");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra khi xóa người dùng");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center font-bold text-sm">
              🗑️
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Xác Nhận Xóa Tài Khoản
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Thao tác này sẽ xóa vĩnh viễn quyền truy cập của nhân sự
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Cảnh báo hành động xóa</span>
            </p>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
              Bạn có chắc chắn muốn xóa tài khoản của nhân sự sau đây? Tài khoản này sẽ không thể đăng nhập vào hệ thống nữa.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Họ và tên:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{user.name}</strong>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-zinc-500 font-sans">Mã nhân viên:</span>
              <span className="text-zinc-700 dark:text-zinc-300">{user.employeeCode}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Email:</span>
              <span className="text-zinc-700 dark:text-zinc-300">{user.email}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Phòng ban:</span>
              <span className="text-zinc-700 dark:text-zinc-300">{user.department || "—"}</span>
            </div>
          </div>

          {isSelf && (
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
              Bạn đang đăng nhập bằng tài khoản này nên không thể tự xóa.
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={submitting || isSelf}
              onClick={handleDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              {submitting && <Spinner size="sm" />}
              <span>Xác Nhận Xóa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

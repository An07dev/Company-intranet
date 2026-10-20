"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoadingSection } from "@/components/ui/Loading";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const { user, isLoading, canAccessPage } = useAuth();

  // Đang tải phiên đăng nhập
  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <LoadingSection text="Đang kiểm tra quyền truy cập..." size="md" />
      </div>
    );
  }

  // Đã đăng nhập nhưng không có quyền vào trang này
  if (user && !canAccessPage(pathname)) {
    const roleTitle = user.roleName || user.role;
    const targetDefault = user.defaultPage || "/dashboard/attendance";

    return (
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-4">
          {/* Icon 403 */}
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-3xl mx-auto shadow-xs">
            🔒
          </div>

          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              Mã lỗi 403 • Giới hạn truy cập
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Quyền Truy Cập Bị Giới Hạn
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Tài khoản của bạn với vai trò{" "}
              <strong className="text-zinc-800 dark:text-zinc-200 font-semibold underline decoration-rose-400 decoration-2">
                {roleTitle}
              </strong>{" "}
              chưa được phân quyền để truy cập trang này (<code>{pathname}</code>).
            </p>
          </div>

          {/* Hộp giải thích */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 text-left space-y-1.5">
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <span>💡</span>
              <span>Cần truy cập trang này?</span>
            </div>
            <p>
              Vui lòng liên hệ <strong>Quản trị viên</strong> hoặc <strong>Ban Giám Đốc</strong> để được điều chỉnh vai trò hoặc cấp thêm quyền hạn cho tài khoản của bạn.
            </p>
          </div>

          {/* Nút hành động */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              href={targetDefault}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition active:scale-95 inline-flex items-center justify-center gap-2"
            >
              <span>🏠</span>
              <span>Về trang làm việc chính</span>
            </Link>

            <Link
              href="/dashboard/chat"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition active:scale-95 inline-flex items-center justify-center gap-1.5"
            >
              <span>💬</span>
              <span>Nhắn tin hỗ trợ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

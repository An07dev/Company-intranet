"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { Spinner } from "@/components/ui/Loading";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export function Header() {
  const { user, logout } = useAuth();
  const { toggleSidebar, toggleCollapse, isCollapsed } = useSidebar();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="h-14 sm:h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
      {/* Khối bên trái: Nút đóng/mở menu + Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Nút bấm trên Mobile: Mở/đóng Drawer */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Mở menu di động"
          className="md:hidden p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Nút bấm trên Desktop: Thu gọn / Mở rộng Sidebar */}
        <button
          type="button"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
          title={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
          className="hidden md:flex p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h10M4 18h16" />
          </svg>
        </button>

        <Link
          href={
            user && (user.role === "manager" || user.role === "employee")
              ? "/dashboard/attendance"
              : "/dashboard"
          }
          className="flex items-center gap-2 select-none"
        >
          <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs tracking-wider shrink-0">
            IN
          </div>
          <span className="font-semibold text-xs sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight truncate max-w-[110px] sm:max-w-none">
            Hệ Thống Nội Bộ
          </span>
        </Link>
      </div>

      {/* Khối bên phải: ThemeToggle, Nút Hướng dẫn, Thông tin User & Nút Đăng xuất */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <ThemeToggle />

        {/* Nút Hướng dẫn sử dụng */}
        <Link
          href="/dashboard/guide"
          title="Hướng dẫn sử dụng hệ thống"
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </Link>

        {user && (
          <div className="flex items-center gap-1.5 sm:gap-4 pl-1.5 sm:pl-3 border-l border-zinc-200 dark:border-zinc-800">
            <Link
              href="/dashboard/profile"
              title="Cài đặt tài khoản & Thông tin cá nhân"
              className="flex items-center gap-2 hover:opacity-85 transition cursor-pointer group"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden ring-1 ring-zinc-300 dark:ring-zinc-700 group-hover:ring-zinc-900 dark:group-hover:ring-zinc-100 transition">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight group-hover:underline">
                  {user.name}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                  {USER_ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
            </Link>

            {user.contractType === "probation" ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Thử việc</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>Chính thức</span>
              </span>
            )}

            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              title="Đăng xuất khỏi hệ thống"
              className="text-xs p-1.5 sm:px-2.5 sm:py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {isLoggingOut ? (
                <Spinner size="xs" color="muted" />
              ) : (
                <svg className="w-4 h-4 text-zinc-500 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              <span className="hidden sm:inline">{isLoggingOut ? "Đang thoát..." : "Đăng xuất"}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

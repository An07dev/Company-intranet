"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  label: string;
  href: string;
  roles?: ("admin" | "director" | "manager" | "employee")[];
  icon: (active: boolean) => React.ReactNode;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isOpen, isCollapsed, closeSidebar, toggleCollapse } = useSidebar();

  const navItems: NavItem[] = [
    {
      label: "Bảng điều khiển",
      href: "/dashboard",
      roles: ["admin", "director"],
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: "Dữ liệu chấm công",
      href: "/dashboard/attendance-management",
      roles: ["admin", "director"],
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      label: "Chấm công trực tuyến",
      href: "/dashboard/attendance",
      roles: ["manager", "employee"],
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Nghỉ phép & Xin OT",
      href: "/dashboard/requests",
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: "Phòng ban",
      href: "/dashboard/departments",
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      label: "Quản lý công việc",
      href: "/dashboard/tasks",
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
    },
    {
      label: "Tài sản & Bàn giao",
      href: "/dashboard/assets",
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      label: "Tin nhắn nội bộ",
      href: "/dashboard/chat",
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
    {
      label: "Quản lý người dùng",
      href: "/dashboard/users",
      roles: ["admin", "director"],
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: "Cài đặt tài khoản",
      href: "/dashboard/profile",
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      label: "Cài đặt hệ thống (IP)",
      href: "/dashboard/settings",
      roles: ["admin", "director"],
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Quy định công ty",
      href: "/dashboard/regulations",
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      label: "Hướng dẫn sử dụng",
      href: "/dashboard/guide",
      icon: (active) => (
        <svg
          className={`w-5 h-5 shrink-0 ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <>
      {/* 1. Backdrop Overlay cho Mobile khi mở menu */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          aria-hidden="true"
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* 2. Khung Sidebar chính */}
      <aside
        className={`fixed md:sticky top-0 md:top-14 sm:md:top-16 inset-y-0 left-0 z-50 md:z-30 h-full md:h-[calc(100vh-3.5rem)] sm:md:h-[calc(100vh-4rem)] border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          /* Responsive widths */
          isCollapsed ? "md:w-16" : "md:w-60"
          } ${
          /* Mobile drawer state */
          isOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0"
          }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header trong Mobile Drawer (chỉ hiện trên Mobile) */}
          <div className="flex md:hidden items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs">
                IN
              </div>
              <span className="font-semibold text-sm">Menu Nội Bộ</span>
            </div>
            <button
              type="button"
              onClick={closeSidebar}
              className="p-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tiêu đề nhóm Menu (ẩn khi desktop thu gọn) */}
          <div
            className={`px-4 pt-4 pb-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider ${isCollapsed ? "md:hidden" : "block"
              }`}
          >
            Chức năng chính
          </div>

          {/* Danh sách navigation links */}
          <nav className="p-2 space-y-1">
            {visibleNavItems.map((item, index) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.label + index}
                  href={item.href}
                  onClick={closeSidebar}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-lg transition-colors group cursor-pointer ${isCollapsed
                    ? "md:justify-center p-2.5"
                    : "gap-3 px-3 py-2 text-xs sm:text-sm font-medium"
                    } ${active
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                >
                  {item.icon(active)}

                  {/* Nhãn chữ (ẩn khi desktop thu gọn) */}
                  <span
                    className={`truncate ${isCollapsed ? "md:hidden" : "block"
                      }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Khối dưới cùng: Nút thu gọn/mở rộng Desktop & Thông tin role */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 hidden md:block">
          <button
            type="button"
            onClick={toggleCollapse}
            className={`w-full flex items-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors p-2 text-xs font-medium cursor-pointer ${isCollapsed ? "justify-center" : "gap-2.5 justify-start"
              }`}
            title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""
                }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            <span className={isCollapsed ? "hidden" : "inline"}>
              Thu gọn thanh menu
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

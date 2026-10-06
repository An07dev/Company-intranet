"use client";

import React, { useState, useEffect } from "react";
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

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isOpen, isCollapsed, closeSidebar, toggleCollapse } = useSidebar();

  // Trạng thái đóng/mở từng nhóm menu (lưu vào localStorage)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed_sections");
      if (saved) {
        setCollapsedSections(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem("sidebar_collapsed_sections", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Cấu trúc Menu được đóng gói theo từng phần (Section Groups)
  const navSections: NavSection[] = [
    {
      id: "overview",
      title: "Tổng quan & Tin nhắn",
      items: [
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
      ],
    },
    {
      id: "sales",
      title: "Nghiệp vụ bán hàng & Kho",
      items: [
        {
          label: "Quản lý đơn hàng",
          href: "/dashboard/orders",
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
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          ),
        },
        {
          label: "Khách hàng & CRM",
          href: "/dashboard/customers",
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          label: "Nhà cung cấp",
          href: "/dashboard/suppliers",
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
          label: "Quản lý Kho vận",
          href: "/dashboard/inventory",
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
                d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
              />
            </svg>
          ),
        },
        {
          label: "Sản phẩm & Tồn kho",
          href: "/dashboard/shopee-products",
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
          label: "Cấu hình Webhook",
          href: "/dashboard/webhooks",
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          ),
        },
        {
          label: "Nhật ký đồng bộ",
          href: "/dashboard/shopee-logs",
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          ),
        },
      ],
    },
    {
      id: "operations",
      title: "Vận hành & Công việc",
      items: [
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
      ],
    },
    {
      id: "hr",
      title: "Nhân sự & Chấm công",
      items: [
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
      ],
    },
    {
      id: "system",
      title: "Hệ thống & Cài đặt",
      items: [
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
      ],
    },
  ];

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

          {/* Danh sách các Phần (Sections) đã được đóng gói */}
          <nav className="p-2 space-y-2.5">
            {navSections.map((section, sIndex) => {
              const visibleItems = section.items.filter(
                (item) => !item.roles || (user && item.roles.includes(user.role))
              );

              // Ẩn nhóm nếu không có mục nào được phép truy cập
              if (visibleItems.length === 0) return null;

              const isSectionCollapsed = Boolean(collapsedSections[section.id]);
              const hasActiveItem = visibleItems.some((item) => isItemActive(item.href));

              return (
                <div key={section.id} className="space-y-1">
                  {/* Tiêu đề phần (Section Header) khi mở rộng Desktop hoặc trên Mobile */}
                  {!isCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors select-none group cursor-pointer"
                      title={isSectionCollapsed ? "Mở rộng phần này" : "Thu gọn phần này"}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{section.title}</span>
                        {/* Chấm tròn báo hiệu khi phần này đang bị thu gọn nhưng có trang đang mở */}
                        {isSectionCollapsed && hasActiveItem && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 animate-pulse" />
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isSectionCollapsed && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            {visibleItems.length}
                          </span>
                        )}
                        <svg
                          className={`w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform duration-200 ${
                            isSectionCollapsed ? "-rotate-90" : "rotate-0"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                  ) : (
                    /* Divider khi thu gọn thành mini sidebar */
                    sIndex > 0 && (
                      <div className="my-2 mx-1 border-t border-zinc-200 dark:border-zinc-800" />
                    )
                  )}

                  {/* Danh sách các liên kết trong phần */}
                  {(!isSectionCollapsed || isCollapsed) && (
                    <div className="space-y-0.5">
                      {visibleItems.map((item) => {
                        const active = isItemActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeSidebar}
                            title={isCollapsed ? `${section.title}: ${item.label}` : undefined}
                            className={`flex items-center rounded-lg transition-colors group cursor-pointer ${
                              isCollapsed
                                ? "md:justify-center p-2.5"
                                : "gap-3 px-3 py-2 text-xs sm:text-sm font-medium"
                            } ${
                              active
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs"
                                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                            }`}
                          >
                            {item.icon(active)}

                            {/* Nhãn chữ (ẩn khi desktop thu gọn) */}
                            <span className={`truncate ${isCollapsed ? "md:hidden" : "block"}`}>
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Khối dưới cùng: Nút thu gọn/mở rộng Desktop & Thông tin role */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 hidden md:block">
          <button
            type="button"
            onClick={toggleCollapse}
            className={`w-full flex items-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors p-2 text-xs font-medium cursor-pointer ${
              isCollapsed ? "justify-center" : "gap-2.5 justify-start"
            }`}
            title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                isCollapsed ? "rotate-180" : ""
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

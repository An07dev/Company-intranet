"use client";

import React from "react";

export type DebtTableType = "customers" | "suppliers" | "orders";

interface DebtTableLoadingProps {
  type?: DebtTableType;
  title?: string;
  subtitle?: string;
  rows?: number;
  mode?: "full" | "rows" | "mobile" | "banner";
  colSpan?: number;
}

/**
 * Component Loading chuyên dụng cho bảng Quản lý Công Nợ Sapo (Hỗ trợ cả 2 tab: Khách hàng & Nhà cung cấp)
 */
export function DebtTableLoading({
  type = "customers",
  title,
  subtitle,
  rows = 5,
  mode = "full",
  colSpan = 7,
}: DebtTableLoadingProps) {
  // Config giao diện theo từng phân hệ
  const isSupplier = type === "suppliers";
  const isOrder = type === "orders";

  const theme = isSupplier
    ? {
        accent: "indigo",
        icon: "🏭",
        defaultTitle: "Đang tải danh sách công nợ Nhà cung cấp...",
        defaultSubtitle: "Đang kết nối API Sapo để tính toán nợ nhập kho (REI), trả hàng và công nợ kỳ này",
        spinnerBorder: "border-indigo-600 dark:border-indigo-400",
        badgeBg: "bg-indigo-50 dark:bg-indigo-950/60",
        badgeBorder: "border-indigo-200 dark:border-indigo-800/60",
        badgeText: "text-indigo-700 dark:text-indigo-300",
        bannerBg: "bg-indigo-50/70 dark:bg-indigo-950/30",
        bannerBorder: "border-indigo-100 dark:border-indigo-900/40",
        bannerText: "text-indigo-700 dark:text-indigo-300",
      }
    : isOrder
    ? {
        accent: "amber",
        icon: "📋",
        defaultTitle: "Đang tải danh sách đơn hàng nợ...",
        defaultSubtitle: "Đang đối soát đơn hàng chưa thanh toán và tuổi nợ từ hệ thống Sapo",
        spinnerBorder: "border-amber-600 dark:border-amber-400",
        badgeBg: "bg-amber-50 dark:bg-amber-950/60",
        badgeBorder: "border-amber-200 dark:border-amber-800/60",
        badgeText: "text-amber-700 dark:text-amber-300",
        bannerBg: "bg-amber-50/70 dark:bg-amber-950/30",
        bannerBorder: "border-amber-100 dark:border-amber-900/40",
        bannerText: "text-amber-700 dark:text-amber-300",
      }
    : {
        accent: "rose",
        icon: "👥",
        defaultTitle: "Đang tải danh sách công nợ Khách hàng...",
        defaultSubtitle: "Đang kết nối API Sapo để đối soát số dư đầu kỳ, phát sinh và nợ cuối kỳ",
        spinnerBorder: "border-rose-600 dark:border-rose-400",
        badgeBg: "bg-rose-50 dark:bg-rose-950/60",
        badgeBorder: "border-rose-200 dark:border-rose-800/60",
        badgeText: "text-rose-700 dark:text-rose-300",
        bannerBg: "bg-rose-50/70 dark:bg-rose-950/30",
        bannerBorder: "border-rose-100 dark:border-rose-900/40",
        bannerText: "text-rose-700 dark:text-rose-300",
      };

  const finalTitle = title || theme.defaultTitle;
  const finalSubtitle = subtitle || theme.defaultSubtitle;

  // 1. Chế độ chỉ hiển thị Banner trạng thái đồng bộ
  if (mode === "banner") {
    return (
      <div
        className={`py-2.5 px-3.5 sm:px-4 ${theme.bannerBg} border-b ${theme.bannerBorder} flex items-center justify-between text-xs ${theme.bannerText} animate-in fade-in duration-200`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-3.5 h-3.5 border-2 ${theme.spinnerBorder} border-t-transparent rounded-full animate-spin shrink-0`}
          />
          <span className="font-semibold truncate">{finalTitle}</span>
        </div>
        <span className="text-[11px] opacity-80 font-mono hidden sm:inline shrink-0">
          Đang đồng bộ Sapo...
        </span>
      </div>
    );
  }

  // 2. Chế độ hiển thị Skeleton các dòng trong tbody (Table Rows)
  if (mode === "rows") {
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="animate-pulse">
            {isSupplier ? (
              <>
                <td className="py-3.5 px-3.5 text-center">
                  <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto" />
                </td>
                <td className="py-3.5 px-3.5">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
                </td>
                <td className="py-3.5 px-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32" />
                  </div>
                </td>
                <td className="py-3.5 px-3.5">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24" />
                </td>
                <td className="py-3.5 px-3.5 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto" />
                </td>
                <td className="py-3.5 px-3.5 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto" />
                </td>
                <td className="py-3.5 px-3.5 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto" />
                </td>
                <td className="py-3.5 px-3.5 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24 ml-auto" />
                </td>
                <td className="py-3.5 px-3.5 text-center">
                  <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-14 mx-auto" />
                </td>
              </>
            ) : isOrder ? (
              <>
                <td className="py-3.5 px-3">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-28 mb-1" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded w-16" />
                </td>
                <td className="py-3.5 px-3">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-1" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded w-24" />
                </td>
                <td className="py-3.5 px-3 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto" />
                </td>
                <td className="py-3.5 px-3 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16 ml-auto" />
                </td>
                <td className="py-3.5 px-3 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto" />
                </td>
                <td className="py-3.5 px-3 text-center">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-14 mx-auto" />
                </td>
                <td className="py-3.5 px-3">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
                </td>
                <td className="py-3.5 px-3 text-center">
                  <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-16 mx-auto" />
                </td>
              </>
            ) : (
              <>
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                    <div className="space-y-1">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32" />
                      <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800/60 rounded w-20" />
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24" />
                </td>
                <td className="py-3.5 px-3 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto" />
                </td>
                <td className="py-3.5 px-3 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto" />
                </td>
                <td className="py-3.5 px-3 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto" />
                </td>
                <td className="py-3.5 px-3 text-right">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24 ml-auto" />
                </td>
                <td className="py-3.5 px-3 text-center">
                  <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-14 mx-auto" />
                </td>
              </>
            )}
          </tr>
        ))}
      </>
    );
  }

  // 3. Chế độ hiển thị danh sách thẻ trên Mobile (Card List)
  if (mode === "mobile") {
    return (
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {Array.from({ length: Math.min(rows, 4) }).map((_, i) => (
          <div key={i} className="p-3.5 space-y-2.5 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="space-y-1">
                  <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-32" />
                  <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
                </div>
              </div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 4. Chế độ hiển thị Full Card hoàn chỉnh (Dùng khi chuyển tab hoặc tải toàn bộ khối table)
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xs overflow-hidden">
      {/* Top Banner Thông Báo Tải */}
      <div
        className={`py-3 px-4 sm:px-6 ${theme.bannerBg} border-b ${theme.bannerBorder} flex items-center justify-between gap-3 text-xs`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/80 dark:bg-zinc-800/80 shadow-2xs border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-sm shrink-0">
            {theme.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm truncate">
                {finalTitle}
              </span>
              <span
                className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText} shrink-0`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping shrink-0" />
                <span>Sapo Omnichannel</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {finalSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`w-4 h-4 border-2 ${theme.spinnerBorder} border-t-transparent rounded-full animate-spin`}
          />
        </div>
      </div>

      {/* Placeholder Header lọc & tìm kiếm */}
      <div className="p-3 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-36 animate-pulse" />
          <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-24 animate-pulse" />
        </div>
        <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full sm:w-64 animate-pulse" />
      </div>

      {/* Hiển thị Mobile Skeleton */}
      <div className="block md:hidden">
        <DebtTableLoading type={type} mode="mobile" rows={4} />
      </div>

      {/* Hiển thị Desktop Table Skeleton */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full table-fixed text-left text-xs border-collapse min-w-[960px]">
          <thead>
            <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              {isSupplier ? (
                <>
                  <th className="py-3 px-3 w-[4%] text-center">#</th>
                  <th className="py-3 px-3 w-[11%]">Mã NCC</th>
                  <th className="py-3 px-3 w-[21%]">Tên nhà cung cấp</th>
                  <th className="py-3 px-3 w-[11%]">Số điện thoại</th>
                  <th className="py-3 px-3 w-[11%] text-right">Nợ đầu kỳ</th>
                  <th className="py-3 px-3 w-[11%] text-right">Nợ tăng</th>
                  <th className="py-3 px-3 w-[11%] text-right">Nợ giảm</th>
                  <th className="py-3 px-3 w-[13%] text-right">Cuối kỳ</th>
                  <th className="py-3 px-3 w-[7%] text-center">Thao tác</th>
                </>
              ) : isOrder ? (
                <>
                  <th className="py-3 px-3 w-[14%]">Mã đơn & Kênh</th>
                  <th className="py-3 px-3 w-[20%]">Khách hàng</th>
                  <th className="py-3 px-3 w-[12%] text-right">Tổng tiền</th>
                  <th className="py-3 px-3 w-[12%] text-right">Đã thanh toán</th>
                  <th className="py-3 px-3 w-[13%] text-right">Còn nợ</th>
                  <th className="py-3 px-3 w-[9%] text-center">Tuổi nợ</th>
                  <th className="py-3 px-3 w-[10%]">Ngày tạo</th>
                  <th className="py-3 px-3 w-[10%] text-center">Thao tác</th>
                </>
              ) : (
                <>
                  <th className="py-3 px-3 w-[22%]">Tên đối tượng</th>
                  <th className="py-3 px-3 w-[13%]">Số điện thoại</th>
                  <th className="py-3 px-3 w-[13%] text-right">Nợ đầu kỳ</th>
                  <th className="py-3 px-3 w-[13%] text-right">Nợ tăng</th>
                  <th className="py-3 px-3 w-[13%] text-right">Nợ giảm</th>
                  <th className="py-3 px-3 w-[14%] text-right">Cuối kỳ</th>
                  <th className="py-3 px-3 w-[12%] text-center">Thao tác</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            <DebtTableLoading type={type} mode="rows" rows={rows} colSpan={colSpan} />
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Placeholder */}
      <div className="p-3 sm:p-4 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-28 animate-pulse" />
        <div className="flex items-center gap-1.5">
          <div className="h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-16 animate-pulse" />
          <div className="h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-16 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

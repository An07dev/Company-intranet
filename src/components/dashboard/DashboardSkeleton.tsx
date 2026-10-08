"use client";

import React from "react";

// Skeleton thẻ KPI đa năng
export function KpiCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-2 sm:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2.5 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          </div>
          <div className="h-6 sm:h-8 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-2.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// Skeleton Header Phân khu
export function SectionHeaderSkeleton({ title = "Đang tải dữ liệu..." }: { title?: string }) {
  return (
    <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-zinc-200 dark:border-zinc-800 animate-pulse">
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-1">
          <div className="h-4 w-36 sm:w-48 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          <div className="hidden sm:block h-2.5 w-72 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
        </div>
      </div>
      <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
    </div>
  );
}

// Skeleton Phân khu Đơn hàng & Thương mại điện tử
export function ShopeeSectionSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-5 animate-pulse">
      <SectionHeaderSkeleton title="Đơn Hàng Đa Kênh" />
      <KpiCardsSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 sm:h-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl p-4 flex flex-col justify-between">
          <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          <div className="w-36 h-36 mx-auto rounded-full border-8 border-zinc-200 dark:border-zinc-800" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          </div>
        </div>
        <div className="h-64 sm:h-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl p-4 flex flex-col justify-between">
          <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          <div className="space-y-3 my-auto">
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton Phân khu Kho & Tồn Kho
export function InventorySectionSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-5 animate-pulse">
      <SectionHeaderSkeleton title="Quản Lý Kho Hàng" />
      <KpiCardsSkeleton count={4} />
      <div className="h-56 sm:h-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl p-4 flex items-center justify-center">
        <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
      </div>
    </div>
  );
}

// Skeleton Phân khu Khách Hàng & CRM
export function CrmSectionSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-5 animate-pulse">
      <SectionHeaderSkeleton title="Khách Hàng CRM" />
      <KpiCardsSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl" />
        <div className="h-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl" />
      </div>
    </div>
  );
}

// Skeleton Phân khu Công nợ Sapo
export function DebtSectionSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-5 animate-pulse">
      <SectionHeaderSkeleton title="Quản Lý Công Nợ Sapo" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="h-28 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl" />
        <div className="h-28 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl" />
        <div className="h-28 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl" />
      </div>
    </div>
  );
}

// Skeleton Phân khu Nhân sự & Chuyên cần
export function AttendanceSectionSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-5 animate-pulse pt-2">
      <SectionHeaderSkeleton title="Chuyên Cần & Nhân Sự" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 h-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl" />
        <div className="lg:col-span-5 h-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl" />
      </div>
    </div>
  );
}

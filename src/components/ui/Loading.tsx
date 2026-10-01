"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type SpinnerColor = "default" | "primary" | "white" | "muted";

interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: SpinnerSize;
  color?: SpinnerColor;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const colorClasses: Record<SpinnerColor, string> = {
  default: "text-zinc-900 dark:text-zinc-100",
  primary: "text-blue-600 dark:text-blue-400",
  white: "text-white",
  muted: "text-zinc-400 dark:text-zinc-500",
};

/**
 * 1. Spinner Component: Icon xoay tròn mượt mà
 */
export function Spinner({
  size = "md",
  color = "default",
  className,
  ...props
}: SpinnerProps) {
  return (
    <svg
      className={cn("animate-spin", sizeClasses[size], colorClasses[color], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

interface LoadingSectionProps {
  text?: string;
  size?: SpinnerSize;
  className?: string;
}

/**
 * 2. LoadingSection: Dùng trong từng Card, Box hoặc Table khi đang fetch API
 */
export function LoadingSection({
  text = "Đang tải dữ liệu...",
  size = "md",
  className,
}: LoadingSectionProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center w-full",
        className
      )}
    >
      <Spinner size={size} color="default" className="mb-3" />
      {text && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">
          {text}
        </p>
      )}
    </div>
  );
}

interface LoadingOverlayProps {
  text?: string;
  size?: SpinnerSize;
  fullScreen?: boolean;
}

/**
 * 3. LoadingOverlay: Phủ mờ toàn màn hình hoặc block khi submit form / call API quan trọng
 */
export function LoadingOverlay({
  text = "Đang xử lý yêu cầu...",
  size = "lg",
  fullScreen = true,
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "z-50 flex flex-col items-center justify-center bg-white/70 dark:bg-zinc-950/75 backdrop-blur-xs transition-all animate-in fade-in duration-200",
        fullScreen ? "fixed inset-0" : "absolute inset-0 rounded-inherit"
      )}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 max-w-xs text-center mx-4">
        <Spinner size={size} color="default" />
        {text && (
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * 4. Skeleton: Khối placeholder nhấp nháy tạo hiệu ứng tải dữ liệu hiện đại
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-800",
        className
      )}
      {...props}
    />
  );
}

/**
 * 5. TableSkeleton: Skeleton mẫu cho danh sách bảng (Table Rows)
 */
export function TableSkeleton({ rows = 4, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full divide-y divide-zinc-100 dark:divide-zinc-800 animate-pulse">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="p-4 flex items-center justify-between gap-4">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div
              key={cIdx}
              className={cn(
                "h-4 rounded bg-zinc-200/70 dark:bg-zinc-800",
                cIdx === 0 ? "w-1/3" : "w-1/6"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

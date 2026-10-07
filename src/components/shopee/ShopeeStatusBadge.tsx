import React from "react";

export interface StatusStyle {
  label: string;
  badgeClass: string;
  dotClass: string;
  icon?: string;
}

export function getShopeeOrderStatus(status?: string): StatusStyle {
  const s = (status || "").toLowerCase().trim();

  // Đã hủy / Hủy đơn
  if (s.includes("hủy") || s.includes("cancel")) {
    return {
      label: "Đã hủy",
      badgeClass:
        "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
      dotClass: "bg-rose-500",
      icon: "✕",
    };
  }

  // Đã giao cho ĐVVC / Đang giao / Vận chuyển / Shipped
  if (
    s.includes("giao cho đvvc") ||
    s.includes("giao cho dvvc") ||
    s.includes("đang giao") ||
    s.includes("vận chuyển") ||
    s.includes("shipped") ||
    s.includes("in_transit") ||
    s.includes("processed")
  ) {
    return {
      label: "Đã giao cho ĐVVC",
      badgeClass:
        "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
      dotClass: "bg-indigo-500",
      icon: "🚚",
    };
  }

  // Đã giao / Hoàn thành / Completed / Delivered
  if (
    s.includes("đã giao") ||
    s.includes("hoàn thành") ||
    s.includes("completed") ||
    s.includes("delivered")
  ) {
    return {
      label: "Đã giao",
      badgeClass:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      icon: "✓",
    };
  }

  // Đã thanh toán / Paid
  if (s.includes("đã thanh toán") || s.includes("paid")) {
    return {
      label: "Đã thanh toán",
      badgeClass:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      icon: "💵",
    };
  }

  // Chờ lấy hàng / Ready to ship / Đang chuẩn bị hàng
  if (
    s.includes("chờ lấy hàng") ||
    s.includes("cho lay hang") ||
    s.includes("ready_to_ship") ||
    s.includes("chuẩn bị")
  ) {
    return {
      label: "Chờ lấy hàng",
      badgeClass:
        "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
      dotClass: "bg-blue-500",
      icon: "📦",
    };
  }

  // Trả hàng / Hoàn tiền / Return
  if (s.includes("trả hàng") || s.includes("hoàn tiền") || s.includes("return")) {
    return {
      label: "Trả hàng / Hoàn tiền",
      badgeClass:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
      dotClass: "bg-amber-500",
      icon: "↩",
    };
  }

  // Chờ xác nhận / Chờ xử lý / Unpaid
  if (
    s.includes("chờ xác nhận") ||
    s.includes("chờ thanh toán") ||
    s.includes("unpaid") ||
    s.includes("chờ xử lý")
  ) {
    return {
      label: "Chờ xử lý",
      badgeClass:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
      dotClass: "bg-amber-500",
      icon: "⏱",
    };
  }

  // Fallback
  return {
    label: status || "Chờ xử lý",
    badgeClass:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",
    dotClass: "bg-zinc-400",
    icon: "•",
  };
}

interface ShopeeStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function ShopeeStatusBadge({ status, size = "sm" }: ShopeeStatusBadgeProps) {
  const style = getShopeeOrderStatus(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
        style.badgeClass
      } ${size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dotClass}`} />
      <span>{style.label}</span>
    </span>
  );
}

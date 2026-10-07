"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { ShopeeLog, ShopeeLogStats } from "@/types";
import { useToast } from "@/context/ToastContext";

export default function ShopeeLogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [logs, setLogs] = useState<ShopeeLog[]>([]);
  const [stats, setStats] = useState<ShopeeLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedShop, setSelectedShop] = useState<string>("all");

  // Auto Refresh (0 = Off, 5 = 5s, 10 = 10s, 30 = 30s)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Pagination page buttons with ellipsis
  const paginationItems = useMemo(() => {
    const items: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      if (currentPage <= 4) {
        items.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        items.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        items.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return items;
  }, [totalPages, currentPage]);

  // Expanded row ID for JSON details & copy tracker
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch logs from API
  const fetchLogs = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
        });

        if (debouncedSearch) params.set("search", debouncedSearch);
        if (selectedLevel !== "all") params.set("level", selectedLevel);
        if (selectedType !== "all") params.set("type", selectedType);
        if (selectedShop !== "all") params.set("shop_username", selectedShop);

        const res = await fetch(`/api/shopee/logs?${params.toString()}`);
        const json = await res.json();

        if (json.success && json.data) {
          setLogs(json.data.logs || []);
          setTotalRecords(json.data.total || 0);
          setTotalPages(json.data.totalPages || 1);
          setStats(json.data.stats || null);
        } else {
          toast.error("Không thể tải danh sách nhật ký: " + (json.error || "Lỗi máy chủ"));
        }
      } catch (err: any) {
        toast.error("Lỗi kết nối khi tải nhật ký: " + err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, debouncedSearch, selectedLevel, selectedType, selectedShop, toast]
  );

  // Initial and reactive fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle auto-refresh interval
  useEffect(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    if (autoRefreshInterval > 0) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchLogs(true);
      }, autoRefreshInterval * 1000);
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefreshInterval, fetchLogs]);

  // Copy JSON details to clipboard
  const handleCopyJson = (log: ShopeeLog) => {
    const payload = JSON.stringify(log.details || log, null, 2);
    navigator.clipboard.writeText(payload);
    setCopiedId(log.id || "copied");
    toast.success("Đã sao chép chi tiết JSON vào Clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Delete single log
  const handleDeleteLog = async (id: string) => {
    try {
      const res = await fetch(`/api/shopee/logs?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Đã xóa dòng nhật ký!");
        setLogs((prev) => prev.filter((item) => item.id !== id));
        if (expandedLogId === id) setExpandedLogId(null);
      } else {
        toast.error("Lỗi khi xóa nhật ký: " + json.error);
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa");
    }
  };

  // Clear all logs
  const handleClearAll = async () => {
    if (!confirm("⚠️ Bạn có chắc chắn muốn XÓA TOÀN BỘ nhật ký log không?\n\nThao tác này không thể hoàn tác.")) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch("/api/shopee/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_username: selectedShop !== "all" ? selectedShop : undefined,
          level: selectedLevel !== "all" ? selectedLevel : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Đã dọn dẹp ${json.deletedCount || 0} bản ghi nhật ký!`);
        fetchLogs();
      } else {
        toast.error("Lỗi khi xóa nhật ký: " + json.message);
      }
    } catch {
      toast.error("Lỗi kết nối khi dọn dẹp nhật ký");
    } finally {
      setClearing(false);
    }
  };

  // Format relative timestamp
  const formatTime = (isoString?: string): { exact: string; dateStr: string; relative: string } => {
    if (!isoString) return { exact: "--:--:--", dateStr: "--/--", relative: "" };
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { exact: String(isoString), dateStr: "", relative: "" };

    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    let relative = "";
    if (diffSec < 10) relative = "vừa xong";
    else if (diffSec < 60) relative = `${diffSec}s trước`;
    else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)}m trước`;
    else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)}h trước`;
    else relative = `${Math.floor(diffSec / 86400)} ngày trước`;

    return {
      exact: date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      dateStr: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      relative,
    };
  };

  // Level Badge Renderer
  const renderLevelBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            SUCCESS
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase font-mono bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            ERROR
          </span>
        );
      case "warn":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase font-mono bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            WARN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase font-mono bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            INFO
          </span>
        );
    }
  };

  // Type Badge Renderer
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case "order_sync":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 shrink-0">
            <span>📑</span> Kéo Đơn
          </span>
        );
      case "product_sync":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40 shrink-0">
            <span>📦</span> Kéo SP
          </span>
        );
      case "alarm_cron":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 shrink-0">
            <span>⏰</span> Alarms
          </span>
        );
      case "crawler_dom":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40 shrink-0">
            <span>🌐</span> DOM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
            <span>⚙️</span> Hệ thống
          </span>
        );
    }
  };

  // Source Badge Renderer
  const renderSourceBadge = (source: string) => {
    if (source.includes("background")) {
      return (
        <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          [Background SW]
        </span>
      );
    }
    if (source.includes("content")) {
      return (
        <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          [Content Script]
        </span>
      );
    }
    if (source.includes("popup")) {
      return (
        <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          [Popup UI]
        </span>
      );
    }
    return (
      <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
        [API Server]
      </span>
    );
  };

  // Chỉ cho phép Ban Giám đốc và Quản trị viên (ADMIN) truy cập
  if (!authLoading && user && user.role !== "admin" && user.role !== "director") {
    return (
      <div className="p-6 max-w-xl mx-auto my-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center text-2xl mx-auto">
          🔒
        </div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">
          Không có quyền truy cập
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Chức năng <strong>Nhật ký Đồng bộ</strong> chỉ dành riêng cho <strong>Ban Giám đốc</strong> và <strong>Quản trị viên (ADMIN)</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* 1. Header Section */}
      <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg sm:text-xl shrink-0">
              📋
            </div>
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 mb-0.5">
                <span>Hệ thống</span>
                <span>/</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">Giám sát & Logs</span>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                  Nhật Ký Đồng Bộ Bán Hàng & Webhook
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Live Monitor
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Theo dõi tiến trình nhận đơn từ Webhook Sapo và các tác vụ đồng bộ
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/80">
            {/* Auto Refresh Toggle */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold shadow-2xs">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  autoRefreshInterval > 0 ? "bg-emerald-500 animate-ping" : "bg-zinc-300 dark:bg-zinc-600"
                }`}
              ></span>
              <span className="text-zinc-500 dark:text-zinc-400 text-[11px] hidden sm:inline">Tự động:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(parseInt(e.target.value, 10))}
                className="bg-transparent text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-hidden cursor-pointer text-xs"
              >
                <option value={0}>Tắt</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchLogs(true)}
              disabled={refreshing || loading}
              className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition shadow-2xs disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <span className={`inline-block ${refreshing ? "animate-spin text-blue-500" : ""}`}>🔄</span>
              <span className="hidden sm:inline">{refreshing ? "Đang tải..." : "Làm mới"}</span>
            </button>

            {/* Clear Logs Button */}
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing}
                className="py-1.5 px-2.5 sm:px-3 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 transition shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                title="Dọn dẹp toàn bộ nhật ký"
              >
                <span>🗑️</span>
                <span className="hidden sm:inline">{clearing ? "Đang xóa..." : "Dọn log"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Stat Cards Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Tổng Nhật Ký</span>
            <span>📋</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 mt-1 sm:mt-2">
            {(stats?.total || 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">Toàn bộ sự kiện đã lưu</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 shadow-2xs sm:shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <span>Thành Công</span>
            <span>🟢</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-emerald-800 dark:text-emerald-300 mt-1 sm:mt-2">
            {(stats?.successCount || 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600/70 dark:text-emerald-500 mt-0.5 truncate">Đã đồng bộ xong</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40 shadow-2xs sm:shadow-sm">
          <div className="flex items-center justify-between text-sky-700 dark:text-sky-400 text-xs font-semibold">
            <span>Thông Tin</span>
            <span>🔵</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-sky-800 dark:text-sky-300 mt-1 sm:mt-2">
            {(stats?.infoCount || 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[10px] sm:text-[11px] text-sky-600/70 dark:text-sky-500 mt-0.5 truncate">Tiến trình quét & mở tab</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 shadow-2xs sm:shadow-sm">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <span>Cảnh Báo</span>
            <span>🟡</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-amber-800 dark:text-amber-300 mt-1 sm:mt-2">
            {(stats?.warnCount || 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[10px] sm:text-[11px] text-amber-600/70 dark:text-amber-500 mt-0.5 truncate">Lật lại trang / thử lại</div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 shadow-2xs sm:shadow-sm">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-semibold">
            <span>Lỗi Phát Sinh</span>
            <span>🔴</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-rose-800 dark:text-rose-300 mt-1 sm:mt-2">
            {(stats?.errorCount || 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[10px] sm:text-[11px] text-rose-600/70 dark:text-rose-500 mt-0.5 truncate">Lỗi kết nối hoặc DOM</div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm space-y-2 sm:space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo nội dung, mã đơn, item ID, lỗi..."
              className="w-full pl-8 pr-7 py-1.5 sm:py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
            />
            <span className="text-zinc-400 text-xs absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 sm:py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer"
            >
              <option value="all">Mọi cấp độ (Tất cả)</option>
              <option value="error">🔴 Chỉ Lỗi (ERROR)</option>
              <option value="warn">🟡 Cảnh báo (WARN)</option>
              <option value="success">🟢 Thành công (SUCCESS)</option>
              <option value="info">🔵 Thông tin (INFO)</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 sm:py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer"
            >
              <option value="all">Mọi tác vụ (Tất cả)</option>
              <option value="order_sync">📑 Kéo đơn hàng</option>
              <option value="product_sync">📦 Kéo danh mục SP</option>
              <option value="alarm_cron">⏰ Lịch Chrome Alarms</option>
              <option value="crawler_dom">🌐 Thao tác lật trang</option>
              <option value="system">⚙️ Hệ thống chung</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Logs List & Detail Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl shadow-2xs sm:shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Đang tải nhật ký hoạt động...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-4xl">📭</div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chưa có bản ghi nhật ký nào</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto px-4">
              Khi bạn kích hoạt tiện ích Shopee Sync trên trình duyệt hoặc bắn đơn Webhook Sapo, các sự kiện sẽ tự động hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div>
            {/* =========================================================================
                GIAO DIỆN MOBILE: DANH SÁCH THẺ DỄ ĐỌC (CARD VIEW - md:hidden)
               ========================================================================= */}
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const time = formatTime(log.createdAt);

                return (
                  <div
                    key={log.id}
                    className={`p-3 space-y-2 transition-colors ${
                      log.level === "error"
                        ? "bg-rose-50/20 dark:bg-rose-950/10"
                        : log.level === "warn"
                        ? "bg-amber-50/20 dark:bg-amber-950/10"
                        : ""
                    }`}
                  >
                    {/* Dòng 1: Thời gian, Cấp độ, Loại tác vụ */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{time.exact}</span>
                        <span>•</span>
                        <span>{time.relative}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {renderLevelBadge(log.level)}
                        {renderTypeBadge(log.type)}
                      </div>
                    </div>

                    {/* Dòng 2: Nội dung tin nhắn */}
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                      {log.message}
                    </div>

                    {/* Dòng 3: Nguồn + Chi tiết toggle */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                      <div className="flex items-center gap-2 text-zinc-400 font-mono">
                        {renderSourceBadge(log.source)}
                        {log.shop_username && (
                          <span className="text-zinc-600 dark:text-zinc-300">
                            @{log.shop_username}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id || null)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>{isExpanded ? "Thu gọn ▲" : "Chi tiết ▼"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => log.id && handleDeleteLog(log.id)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                          title="Xóa dòng log"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Expandable JSON Details on Mobile */}
                    {isExpanded && (
                      <div className="p-2.5 rounded-xl bg-zinc-900 text-zinc-200 text-xs font-mono space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-1.5">
                          <span className="text-zinc-400">ID: #{log.id?.slice(-8)}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyJson(log)}
                            className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700"
                          >
                            {copiedId === log.id ? "✓ Đã chép" : "📋 Sao chép"}
                          </button>
                        </div>
                        <pre className="text-[10px] text-zinc-300 overflow-x-auto max-h-48 leading-relaxed whitespace-pre-wrap break-all">
                          {JSON.stringify(
                            {
                              id: log.id,
                              level: log.level,
                              type: log.type,
                              source: log.source,
                              shop_username: log.shop_username,
                              message: log.message,
                              createdAt: log.createdAt,
                              details: log.details || {},
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* =========================================================================
                GIAO DIỆN DESKTOP: BẢNG TABLE (hidden md:block)
               ========================================================================= */}
            <div className="hidden md:block">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50/80 dark:bg-zinc-800/80 border-b border-zinc-200/80 dark:border-zinc-700/60 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-24 shrink-0">Thời gian</span>
                  <span className="w-20 shrink-0">Cấp độ</span>
                  <span className="w-28 shrink-0">Loại tác vụ</span>
                  <span className="w-28 shrink-0 hidden lg:inline">Nguồn</span>
                  <span className="flex-1 truncate">Nội dung thông điệp & Dữ liệu</span>
                </div>
                <div className="shrink-0 text-right w-36">
                  <span>Gian hàng / Chi tiết</span>
                </div>
              </div>

              <div className="divide-y divide-zinc-200/70 dark:divide-zinc-700/60">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const time = formatTime(log.createdAt);

                  return (
                    <div
                      key={log.id}
                      className={`transition-colors ${
                        log.level === "error"
                          ? "bg-rose-50/20 hover:bg-rose-50/40 dark:bg-rose-950/10 dark:hover:bg-rose-950/20"
                          : log.level === "warn"
                          ? "bg-amber-50/20 hover:bg-amber-50/40 dark:bg-amber-950/10 dark:hover:bg-amber-950/20"
                          : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <div
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id || null)}
                        className="p-4 cursor-pointer flex items-center justify-between gap-3 text-xs"
                      >
                        {/* Left: Time + Badges + Message */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Timestamp */}
                          <div className="shrink-0 text-left w-24">
                            <div className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{time.exact}</div>
                            <div className="text-[10px] text-zinc-400">{time.relative}</div>
                          </div>

                          {/* Level Badge */}
                          <div className="shrink-0">{renderLevelBadge(log.level)}</div>

                          {/* Type Badge */}
                          <div className="shrink-0">{renderTypeBadge(log.type)}</div>

                          {/* Source */}
                          <div className="shrink-0 hidden lg:block">{renderSourceBadge(log.source)}</div>

                          {/* Message Content */}
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate pr-2 flex-1">
                            {log.message}
                          </div>
                        </div>

                        {/* Right: Shop + Expand Indicator */}
                        <div className="flex items-center gap-3 shrink-0">
                          {log.shop_username && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              @{log.shop_username}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedLogId(isExpanded ? null : log.id || null);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            <span>{isExpanded ? "Đóng" : "Chi tiết"}</span>
                            <svg
                              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Expandable JSON Details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 bg-zinc-900 text-zinc-200 rounded-b-xl border-t border-zinc-800 text-xs font-mono">
                          <div className="flex items-center justify-between py-2 border-b border-zinc-800 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-400 text-[11px]">Mã Log:</span>
                              <span className="text-blue-400 font-semibold">{log.id}</span>
                              {log.duration_ms && (
                                <span className="text-zinc-400 text-[11px]">
                                  • Thực thi: <strong className="text-amber-300">{log.duration_ms}ms</strong>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyJson(log)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors cursor-pointer"
                              >
                                <span>{copiedId === log.id ? "✓ Đã chép" : "📋 Sao chép JSON"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => log.id && handleDeleteLog(log.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[11px] transition-colors cursor-pointer"
                              >
                                <span>🗑️ Xóa</span>
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto max-h-96 py-2 px-3 bg-zinc-950/70 rounded-lg border border-zinc-800/80 leading-relaxed">
                            <pre className="text-[11.5px] text-zinc-300 whitespace-pre-wrap break-all">
                              {JSON.stringify(
                                {
                                  id: log.id,
                                  level: log.level,
                                  type: log.type,
                                  source: log.source,
                                  shop_username: log.shop_username,
                                  message: log.message,
                                  createdAt: log.createdAt,
                                  details: log.details || {},
                                },
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 5. Pagination Bar */}
        {!loading && totalRecords > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs">
            <div className="text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
              <span>
                Trang <strong className="text-zinc-800 dark:text-zinc-200">{currentPage}</strong> / {totalPages}
              </span>
              <span className="hidden sm:inline ml-1">
                ({totalRecords.toLocaleString("vi-VN")} bản ghi)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              {/* Page size dropdown */}
              <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-200 dark:border-zinc-700">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setCurrentPage(1);
                  }}
                  className="py-1 px-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
                >
                  <option value={15}>15 / trang</option>
                  <option value={25}>25 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  ‹ Trước
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {paginationItems.map((item, idx) => {
                    if (item === "...") {
                      return (
                        <span
                          key={`dots-${idx}`}
                          className="w-7 h-7 flex items-center justify-center text-xs text-zinc-400 font-bold"
                        >
                          ...
                        </span>
                      );
                    }

                    const pageNum = Number(item);
                    const isActive = currentPage === pageNum;

                    return (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white shadow-2xs font-bold"
                            : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Sau ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

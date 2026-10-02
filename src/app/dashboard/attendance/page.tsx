"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { AttendanceRecord, ApiResponse, PaginatedData } from "@/types";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { LoadingSection, TableSkeleton } from "@/components/ui/Loading";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";

export default function AttendancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // Dữ liệu trạng thái hôm nay
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [clientIp, setClientIp] = useState<string>("");
  const [isIpAllowed, setIsIpAllowed] = useState<boolean>(true);
  const [ipCheckEnabled, setIpCheckEnabled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [workStartTime, setWorkStartTime] = useState<string>("08:00");
  const [workEndTime, setWorkEndTime] = useState<string>("17:30");

  // Trạng thái nhận diện mạng & Vị trí độc lập (siêu tốc, không chờ DB)
  const [loadingNetwork, setLoadingNetwork] = useState<boolean>(true);
  const [locationInfo, setLocationInfo] = useState<{ city?: string; country?: string; region?: string } | null>(null);

  // Dữ liệu lịch sử cá nhân & Bộ lọc
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");

  // Trạng thái đóng / mở bảng lịch sử chấm công
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  // Trạng thái hiển thị chi tiết mạng IP trên mobile (mặc định thu gọn để ưu tiên chấm công)
  const [showMobileNetworkDetails, setShowMobileNetworkDetails] = useState<boolean>(false);
  // Trạng thái mở rộng bộ lọc nâng cao trên mobile
  const [showMobileHistoryFilters, setShowMobileHistoryFilters] = useState<boolean>(false);

  // Phân trang: hiển thị 10 bản ghi mỗi trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const pageSize = 10;

  // Các giá trị bộ lọc (Lịch sử cá nhân)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Đồng hồ thời gian thực
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Lấy trạng thái mạng & IP siêu tốc từ micro-endpoint (không qua seed hay DB nặng)
  const fetchNetworkStatus = useCallback(async () => {
    setLoadingNetwork(true);
    try {
      const res = await fetch("/api/attendance/network-status");
      const json: ApiResponse<{
        clientIp: string;
        isIpAllowed: boolean;
        ipCheckEnabled: boolean;
        location?: { city?: string; country?: string; region?: string };
      }> = await res.json();

      if (json.success && json.data) {
        setClientIp(json.data.clientIp);
        setIsIpAllowed(json.data.isIpAllowed);
        setIpCheckEnabled(json.data.ipCheckEnabled);
        if (json.data.location) {
          setLocationInfo(json.data.location);
        }
      }
    } catch {
      // Ignored
    } finally {
      setLoadingNetwork(false);
    }
  }, []);

  // Lấy trạng thái điểm danh hôm nay
  const fetchTodayStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/attendance/today");
      const json: ApiResponse<{
        todayRecord: AttendanceRecord | null;
        clientIp: string;
        isIpAllowed: boolean;
        ipCheckEnabled: boolean;
        serverTime: string;
        workStartTime: string;
        workEndTime: string;
      }> = await res.json();

      if (json.success && json.data) {
        setTodayRecord(json.data.todayRecord);
        // Đồng bộ thêm nếu chưa có
        if (json.data.clientIp) setClientIp(json.data.clientIp);
        if (json.data.isIpAllowed !== undefined) setIsIpAllowed(json.data.isIpAllowed);
        if (json.data.ipCheckEnabled !== undefined) setIpCheckEnabled(json.data.ipCheckEnabled);
        if (json.data.workStartTime) setWorkStartTime(json.data.workStartTime);
        if (json.data.workEndTime) setWorkEndTime(json.data.workEndTime);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Lấy lịch sử chấm công cá nhân có áp dụng bộ lọc và phân trang từ Server (10 bản ghi/trang)
  const fetchHistory = useCallback(
    async (targetPage?: number) => {
      setLoadingHistory(true);
      try {
        const pageToFetch = targetPage !== undefined ? targetPage : currentPage;
        const params = new URLSearchParams();
        params.set("page", String(pageToFetch));
        params.set("limit", String(pageSize));
        params.set("scope", "my"); // Luôn chỉ lấy lịch sử cá nhân trên trang này

        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }
        if (selectedDate) {
          params.set("date", selectedDate);
        }
        if (selectedStatus && selectedStatus !== "all") {
          params.set("status", selectedStatus);
        }

        const res = await fetch(`/api/attendance/history?${params.toString()}`);
        const json: ApiResponse<PaginatedData<AttendanceRecord> | AttendanceRecord[]> = await res.json();
        if (json.success && json.data) {
          if ("items" in json.data && Array.isArray(json.data.items)) {
            setHistory(json.data.items);
            setTotalRecords(json.data.total ?? json.data.items.length);
            setTotalPages(Math.max(1, json.data.totalPages ?? 1));
          } else if (Array.isArray(json.data)) {
            setHistory(json.data);
            setTotalRecords(json.data.length);
            setTotalPages(Math.max(1, Math.ceil(json.data.length / pageSize)));
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Lỗi khi tải lịch sử chấm công cá nhân", {
          title: "Lỗi Hệ Thống",
        });
      } finally {
        setLoadingHistory(false);
      }
    },
    [currentPage, searchQuery, selectedDate, selectedStatus, toast]
  );

  useEffect(() => {
    fetchNetworkStatus();
  }, [fetchNetworkStatus]);

  useEffect(() => {
    if (user) {
      fetchTodayStatus();
    }
  }, [user, fetchTodayStatus]);

  useEffect(() => {
    if (user) {
      fetchHistory(currentPage);
    }
  }, [user, currentPage, searchQuery, selectedDate, selectedStatus, fetchHistory]);

  // Khi bộ lọc thay đổi, tự động reset về trang 1
  const prevFiltersRef = useRef({ searchQuery, selectedDate, selectedStatus });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.searchQuery !== searchQuery ||
      prev.selectedDate !== selectedDate ||
      prev.selectedStatus !== selectedStatus
    ) {
      prevFiltersRef.current = { searchQuery, selectedDate, selectedStatus };
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [searchQuery, selectedDate, selectedStatus, currentPage]);

  // Chuyển trang trong phân trang
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || loadingHistory) {
      return;
    }
    setCurrentPage(newPage);
  };

  // Danh sách các số trang hiển thị (hỗ trợ dấu … khi có nhiều trang)
  const paginationItems = useMemo(() => {
    const items: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
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

  // Hành động Chấm công vào (Check-in)
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const json: ApiResponse<AttendanceRecord> = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message || "Chấm công vào thành công!", {
          title: "Chấm Công Thành Công",
        });
        setNote("");
        await fetchTodayStatus();
        setCurrentPage(1);
        await fetchHistory(1);
      } else {
        toast.error(json.message || json.error || "Không thể chấm công vào", {
          title: "Chấm Công Thất Bại",
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi kết nối máy chủ", {
        title: "Lỗi Hệ Thống",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Hành động Chấm công về (Check-out)
  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const json: ApiResponse<AttendanceRecord> = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message || "Chấm công ra thành công!", {
          title: "Chấm Công Thành Công",
        });
        setNote("");
        await fetchTodayStatus();
        setCurrentPage(1);
        await fetchHistory(1);
      } else {
        toast.error(json.message || json.error || "Không thể chấm công ra", {
          title: "Chấm Công Thất Bại",
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi kết nối máy chủ", {
        title: "Lỗi Hệ Thống",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Nhanh: Đặt lại bộ lọc
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDate("");
    setSelectedStatus("all");
    setCurrentPage(1);
  };

  // Xuất file Excel cá nhân theo điều kiện lọc hiện tại
  const handleExportHistoryExcel = () => {
    const params = new URLSearchParams();
    params.set("scope", "my");
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    }
    if (selectedDate) {
      params.set("date", selectedDate);
    }
    if (selectedStatus && selectedStatus !== "all") {
      params.set("status", selectedStatus);
    }

    // Mở URL API để tải trực tiếp file .xlsx
    window.open(`/api/attendance/export?${params.toString()}`, "_blank");
  };

  // Định dạng hiển thị giờ an toàn theo giờ Việt Nam (tránh Invalid Date nếu chuỗi thời gian không chuẩn)
  const formatDisplayTime = useCallback((isoString?: string | null) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }
    // Fallback nếu chuỗi có định dạng giờ phút giây
    const match = isoString.match(/T(\d{2})[:.](\d{2})[:.](\d{2})/);
    if (match) return `${match[1]}:${match[2]}:${match[3]}`;
    return "—";
  }, []);

  // Định dạng ngày hôm nay theo YYYY-MM-DD
  const todayDateString = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  }, []);

  // Định dạng ngày hôm qua
  const yesterdayDateString = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d);
  }, []);

  const hasCheckedIn = Boolean(todayRecord?.checkInTime);
  const hasCheckedOut = Boolean(todayRecord?.checkOutTime);
  const canCheckIn = !hasCheckedIn && (isIpAllowed || !ipCheckEnabled);
  const canCheckOut = hasCheckedIn && !hasCheckedOut && (isIpAllowed || !ipCheckEnabled);

  const isAdminOrDirector = user?.role === "admin" || user?.role === "director";
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedDate ||
    selectedStatus !== "all"
  );

  // Nếu là Admin hoặc Giám Đốc, tự động chuyển hướng sang trang Dữ Liệu Chấm Công Toàn Đơn Vị
  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "director")) {
      router.replace("/dashboard/attendance-management");
    }
  }, [user, router]);

  if (user && (user.role === "admin" || user.role === "director")) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-2 border-zinc-900 border-t-transparent dark:border-zinc-100 dark:border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Chuyển Hướng Quản Trị
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
          Tài khoản Admin và Giám Đốc sử dụng trang chuyên biệt để theo dõi chấm công toàn đơn vị. Đang chuyển hướng...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-2.5 sm:py-4 space-y-2.5 sm:space-y-3.5">
      {/* 1. Header Trang: Tối ưu Mobile-first gọn gàng, hiển thị đầy đủ trên Desktop */}
      <div className="pb-2.5 sm:pb-3 border-b border-zinc-200 dark:border-zinc-800">
        {/* Header trên Mobile (< sm) */}
        <div className="sm:hidden flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Chấm Công Trực Tuyến
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {user?.employeeCode && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40">
                  {user.employeeCode}
                </span>
              )}
              <span className="text-[11px] text-zinc-500 capitalize">
                {currentDate.split(",")[0] || "Hôm nay"}
              </span>
            </div>
          </div>

          {/* Đồng hồ số mini cho Mobile */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {currentTime || "--:--:--"}
            </span>
          </div>
        </div>

        {/* Header trên Tablet & Desktop (>= sm) */}
        <div className="hidden sm:flex sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Hệ Thống Chấm Công Trực Tuyến
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {user?.employeeCode && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-800">
                  Mã NV: {user.employeeCode}
                </span>
              )}
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Vai trò: <strong className="text-zinc-800 dark:text-zinc-200">{user ? USER_ROLE_LABELS[user.role] : "—"}</strong>
              </span>
            </div>
          </div>

          {/* Đồng hồ số thời gian thực chuẩn VN */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 sm:p-3 rounded-xl shadow-2xs flex items-center justify-end gap-3">
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Giờ chuẩn VN (GMT+7)
              </div>
              <div className="font-mono text-lg sm:text-xl lg:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-wider">
                {currentTime || "--:--:--"}
              </div>
              <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                {currentDate || "Đang tải ngày..."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Khối Vận Hành Chấm Công: Thứ tự ưu tiên trên Mobile: Nút Thao Tác (1) -> Thẻ Hôm Nay (2) -> Trạng Thái Mạng (3) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2.5 sm:gap-4">
        {/* THẺ 2 TRÊN DESKTOP -> ƯU TIÊN SỐ 1 TRÊN MOBILE: Thao Tác Chấm Công Vào / Ra (4 cols) */}
        <div className="order-1 xl:order-none xl:col-span-4 bg-white dark:bg-zinc-900 border-2 border-zinc-200/90 dark:border-zinc-800 rounded-xl p-3 sm:p-3.5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative background gradient accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-emerald-500/5 via-indigo-500/5 to-transparent rounded-bl-full pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-linear-to-br from-emerald-500 to-indigo-600 text-white flex items-center justify-center text-[10px] shadow-2xs">
                  ⚡
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Thao Tác Chấm Công
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Chỉ báo trạng thái mạng nhanh trên Mobile */}


                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                  {workStartTime} - {workEndTime}
                </span>
              </div>
            </div>

            {/* Hai nút Chấm Công Thon Gọn & Tối Ưu Chạm Cảm Ứng (Touch-friendly) */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* NÚT 1: CHẤM VÀO */}
              <button
                type="button"
                disabled={!canCheckIn || actionLoading}
                onClick={handleCheckIn}
                className={`group relative overflow-hidden rounded-lg py-1.5 px-2 text-left transition-all duration-200 select-none min-h-[48px] ${hasCheckedIn
                  ? "bg-linear-to-br from-emerald-50 via-teal-50 to-emerald-100/60 dark:from-emerald-950/50 dark:via-teal-950/40 dark:to-emerald-900/40 border border-emerald-500/80 text-emerald-900 dark:text-emerald-200 shadow-xs cursor-default"
                  : canCheckIn
                    ? "bg-linear-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-xs hover:shadow-md ring-1 ring-emerald-400/60 hover:ring-emerald-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    : "bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-75"
                  }`}
              >
                {canCheckIn && !hasCheckedIn && (
                  <span className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                )}

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all ${hasCheckedIn
                      ? "bg-emerald-500 text-white"
                      : canCheckIn
                        ? "bg-white/20 text-white"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500"
                      }`}
                  >
                    {actionLoading && !hasCheckedIn ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : hasCheckedIn ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex items-center gap-1 font-bold text-xs truncate">
                      <span>{actionLoading && !hasCheckedIn ? "Đang vào..." : hasCheckedIn ? "Đã Vào Ca" : "CHẤM VÀO"}</span>
                      {canCheckIn && !hasCheckedIn && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] mt-0.5 truncate opacity-90 font-medium">
                      {hasCheckedIn ? `✓ ${formatDisplayTime(todayRecord?.checkInTime)}` : "Ca sáng (08:00)"}
                    </div>
                  </div>
                </div>
              </button>

              {/* NÚT 2: CHẤM VỀ */}
              <button
                type="button"
                disabled={!canCheckOut || actionLoading}
                onClick={handleCheckOut}
                className={`group relative overflow-hidden rounded-lg py-1.5 px-2 text-left transition-all duration-200 select-none min-h-[48px] ${hasCheckedOut
                  ? "bg-linear-to-br from-indigo-50 via-blue-50 to-indigo-100/60 dark:from-indigo-950/50 dark:via-blue-950/40 dark:to-indigo-900/40 border border-indigo-500/80 text-indigo-900 dark:text-indigo-200 shadow-xs cursor-default"
                  : canCheckOut
                    ? "bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xs hover:shadow-md ring-1 ring-indigo-400/60 hover:ring-indigo-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    : "bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-75"
                  }`}
              >
                {canCheckOut && !hasCheckedOut && (
                  <span className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                )}

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all ${hasCheckedOut
                      ? "bg-indigo-600 text-white"
                      : canCheckOut
                        ? "bg-white/20 text-white"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500"
                      }`}
                  >
                    {actionLoading && hasCheckedIn ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : hasCheckedOut ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex items-center gap-1 font-bold text-xs truncate">
                      <span>{actionLoading && hasCheckedIn ? "Đang về..." : hasCheckedOut ? "Đã Ra Về" : "CHẤM VỀ"}</span>
                      {canCheckOut && !hasCheckedOut && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] mt-0.5 truncate opacity-90 font-medium">
                      {hasCheckedOut
                        ? `✓ ${formatDisplayTime(todayRecord?.checkOutTime)}`
                        : hasCheckedIn
                          ? "Tan ca (17:30)"
                          : "Chờ vào ca"}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Input ghi chú thu gọn (tinh gọn một dòng, có icon) */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none text-xs">
                📝
              </span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú chấm công (tùy chọn)..."
                className="w-full pl-7 pr-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          {/* Dòng trạng thái hướng dẫn ngắn gọn */}
          <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
            {!isIpAllowed && ipCheckEnabled ? (
              <div className="text-rose-600 dark:text-rose-400 font-medium truncate">
                ⚠️ Khóa do IP ngoài văn phòng.
              </div>
            ) : !hasCheckedIn ? (
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>Nhấn <strong>Chấm Vào</strong> để tính giờ.</span>
                </span>
                <span className="font-mono text-[10px] text-zinc-400 shrink-0">{workStartTime}</span>
              </div>
            ) : !hasCheckedOut ? (
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                  <span>Đang trong ca. Nhấn <strong>Chấm Về</strong> khi tan ca.</span>
                </span>
                <span className="font-mono text-[10px] text-zinc-400 shrink-0">{workEndTime}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span>🎉 Đã hoàn tất chấm công hôm nay.</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 font-bold">
                  Xong
                </span>
              </div>
            )}
          </div>
        </div>

        {/* THẺ 3 TRÊN DESKTOP -> ƯU TIÊN SỐ 2 TRÊN MOBILE: Thẻ Điểm Danh Hôm Nay (4 cols) */}
        <div className="order-2 xl:order-none xl:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Hôm Nay ({todayDateString})
              </span>
              {todayRecord ? (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.2 rounded ${todayRecord.status === "on_time"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : todayRecord.status === "late"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : todayRecord.status === "early_leave"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    }`}
                >
                  {todayRecord.status === "on_time"
                    ? "Đúng Giờ"
                    : todayRecord.status === "late"
                      ? "Đi Muộn"
                      : todayRecord.status === "early_leave"
                        ? "Về Sớm"
                        : "Hoàn Thành"}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400">Chưa điểm danh</span>
              )}
            </div>

            {/* 2 ô thông số: Giờ vào & Giờ về (Tối giản trên Mobile, ẩn IP rườm rà) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block mb-0.5">Giờ vào:</span>
                <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 block">
                  {formatDisplayTime(todayRecord?.checkInTime)}
                </span>
                <span className="hidden sm:block text-[10px] text-zinc-400 mt-0.5 truncate">
                  IP: {todayRecord?.checkInIp || "—"}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block mb-0.5">Giờ về:</span>
                <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 block">
                  {formatDisplayTime(todayRecord?.checkOutTime)}
                </span>
                <span className="hidden sm:block text-[10px] text-zinc-400 mt-0.5 truncate">
                  IP: {todayRecord?.checkOutIp || "—"}
                </span>
              </div>
            </div>

            {/* Khối tóm tắt thời gian làm việc */}
            <div className="mt-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <span>⏱️</span>
                <span className="text-[11px]">Thời gian làm:</span>
              </div>
              <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                {todayRecord?.workDurationMinutes !== undefined
                  ? `${Math.floor(todayRecord.workDurationMinutes / 60)}h ${todayRecord.workDurationMinutes % 60}p`
                  : hasCheckedIn
                    ? "Đang tính giờ ca..."
                    : "0h 0p"}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Trạng thái ca:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {hasCheckedIn && hasCheckedOut
                ? "✓ Hoàn tất cả ngày"
                : hasCheckedIn
                  ? "⚡ Đang trong ca làm"
                  : "Chưa bắt đầu ca"}
            </span>
          </div>
        </div>

        {/* THẺ 1 TRÊN DESKTOP -> THẺ PHỤ SỐ 3 TRÊN MOBILE (Thu gọn kỹ thuật để không che mất nút): Trạng Thái Mạng & IP (4 cols) */}
        <div className="order-3 xl:order-none xl:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Trạng Thái Mạng & IP
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await fetchNetworkStatus();
                    toast.info("Đã kiểm tra lại kết nối IP", { duration: 2000 });
                  }}
                  title="Kiểm tra lại kết nối IP"
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  <svg className={`w-3 h-3 ${loadingNetwork ? "animate-spin text-emerald-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Kiểm tra lại</span>
                </button>

                {/* Nút bật/tắt chi tiết IP trên Mobile để tránh choán chỗ */}
                <button
                  type="button"
                  onClick={() => setShowMobileNetworkDetails((prev) => !prev)}
                  className="sm:hidden text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                >
                  {showMobileNetworkDetails ? "Thu gọn ▲" : "Chi tiết ▼"}
                </button>
              </div>
            </div>

            {loadingNetwork ? (
              <div className="py-6">
                <LoadingSection text="Đang nhận diện mạng IP..." size="sm" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Banner trạng thái mạng */}
                <div
                  className={`p-2 rounded-lg border ${!ipCheckEnabled
                    ? "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200"
                    : isIpAllowed
                      ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200"
                      : "bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${!ipCheckEnabled
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                          : isIpAllowed
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300"
                          }`}
                      >
                        {!ipCheckEnabled ? "ℹ️" : isIpAllowed ? "✓" : "✕"}
                      </div>
                      <div className="font-bold text-xs">
                        {!ipCheckEnabled
                          ? "Tạm tắt kiểm tra IP"
                          : isIpAllowed
                            ? "Mạng Wi-Fi Hợp Lệ"
                            : "IP Ngoài Văn Phòng"}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 dark:bg-zinc-900/80 font-bold border border-current/20">
                      {isIpAllowed ? "Đạt Chuẩn" : "Không Khớp"}
                    </span>
                  </div>
                </div>

                {/* 2 ô thông số: IP & Chính sách (Ẩn mặc định trên Mobile, hiển thị khi bấm Chi tiết) */}
                <div className={`${showMobileNetworkDetails ? "grid" : "hidden sm:grid"} grid-cols-2 gap-2 text-xs`}>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Địa chỉ IP:</span>
                    <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate block mt-0.5">
                      {clientIp || "::1"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Chính sách:</span>
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate block mt-0.5">
                      {ipCheckEnabled ? "Bắt buộc IP" : "Không giới hạn"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dòng vị trí & SSL (Ẩn mặc định trên mobile để tránh dài trang) */}
          <div className={`${showMobileNetworkDetails ? "flex" : "hidden sm:flex"} mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 items-center justify-between`}>
            <span className="truncate">
              {locationInfo?.city ? `Khu vực: ${locationInfo.city}` : "Vị trí: Văn phòng nội bộ"}
            </span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 font-mono text-[10px] shrink-0 ml-1">
              Bảo mật SSL ✓
            </span>
          </div>
        </div>
      </div>

      {/* 3. LỊCH CHẤM CÔNG THEO THÁNG (CALENDAR VIEW) */}
      <AttendanceCalendar
        onSelectDate={(dateStr) => {
          setSelectedDate(dateStr);
          setCurrentPage(1);
          setIsHistoryOpen(true);
        }}
      />

      {/* 4. BẢNG DỮ LIỆU & LỊCH SỬ CHẤM CÔNG CÁ NHÂN */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden transition-all duration-200">
        {/* Banner thông báo dành cho Admin và Giám Đốc */}
        {isAdminOrDirector && (
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">👑</span>
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Dữ Liệu Chấm Công Toàn Đơn Vị Đã Chuyển Sang Trang Riêng</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/40">
                    Mới
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Trang này hiển thị dữ liệu chấm công cá nhân của bạn. Để xem, lọc và xuất Excel toàn bộ nhân sự công ty, hãy truy cập trang Quản Lý.
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/attendance-management"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 shadow-2xs transition-colors shrink-0"
            >
              <span>Xem Dữ Liệu Toàn Nhân Viên</span>
              <span>➔</span>
            </Link>
          </div>
        )}

        {/* Header của bảng: hỗ trợ nhấp để đóng/mở - Đảm bảo trên Mobile luôn nằm trên 1 DÒNG DUY NHẤT */}
        <div
          onClick={() => setIsHistoryOpen((prev) => !prev)}
          className={`p-2.5 sm:p-4 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 ${isHistoryOpen ? "border-b border-zinc-200 dark:border-zinc-800" : ""
            }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <span className="text-base sm:text-lg shrink-0">👤</span>
            <h2 className="text-xs sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Lịch Sử Chấm Công
            </h2>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
              {totalRecords} <span className="hidden sm:inline">bản ghi</span>
            </span>
            {isHistoryOpen && totalPages > 1 && (
              <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
                (T{currentPage}/{totalPages})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsHistoryOpen((prev) => !prev);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs"
              title={isHistoryOpen ? "Thu gọn bảng" : "Mở rộng bảng"}
              aria-expanded={isHistoryOpen}
            >
              <span>{isHistoryOpen ? "Thu gọn" : "Mở rộng"}</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isHistoryOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Thân bảng: hiển thị khi isHistoryOpen === true */}
        {isHistoryOpen && (
          <div>
            {/* 1. GIAO DIỆN MOBILE (< sm): BỘ LỌC CỰC KỲ TINH GỌN (1 DÒNG CHÍNH + KHỐI LỌC MỞ RỘNG KHI CẦN) */}
            <div className="sm:hidden border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 p-2 text-xs space-y-2">
              {/* Dòng chính: Chọn ngày nhanh + Nút Lọc + Làm mới + Xuất Excel */}
              <div className="flex items-center justify-between gap-1.5">
                {/* 3 nút ngày nhanh: Tất cả / Hôm nay / Hôm qua */}
                <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate("");
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${!selectedDate
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs"
                        : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(todayDateString);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${selectedDate === todayDateString
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs"
                        : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(yesterdayDateString);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${selectedDate === yesterdayDateString
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs"
                        : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                  >
                    Hôm qua
                  </button>
                </div>

                {/* Các nút hành động bên phải: [ Lọc ] [ ⟳ ] [ 📥 ] */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMobileHistoryFilters((p) => !p)}
                    className={`relative px-2 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1 cursor-pointer ${showMobileHistoryFilters || hasActiveFilters
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold shadow-2xs"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>Lọc</span>
                    {hasActiveFilters && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 ring-2 ring-white dark:ring-zinc-900" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchHistory(currentPage)}
                    title="Làm mới dữ liệu"
                    className="p-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shadow-2xs"
                  >
                    <svg className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin text-emerald-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportHistoryExcel}
                    title="Xuất file Excel"
                    className="px-2 py-1 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Dải Chips hiển thị bộ lọc đang hoạt động khi bộ lọc chi tiết đang đóng */}
              {hasActiveFilters && !showMobileHistoryFilters && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px]">
                  <span className="text-zinc-400 font-medium">Đang lọc:</span>
                  {selectedDate && selectedDate !== todayDateString && selectedDate !== yesterdayDateString && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono text-[10px]">
                      {selectedDate}
                      <button type="button" onClick={() => setSelectedDate("")} className="hover:text-red-500 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  {selectedStatus !== "all" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px]">
                      {selectedStatus === "on_time" ? "Đúng giờ" : selectedStatus === "late" ? "Đi muộn" : selectedStatus === "early_leave" ? "Về sớm" : "Hoàn thành"}
                      <button type="button" onClick={() => setSelectedStatus("all")} className="hover:text-red-500 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  {searchQuery.trim() && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px]">
                      &quot;{searchQuery.trim()}&quot;
                      <button type="button" onClick={() => setSearchQuery("")} className="hover:text-red-500 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-red-600 dark:text-red-400 text-[10px] underline ml-auto cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                </div>
              )}

              {/* Khối Bộ Lọc Mở Rộng trên Mobile: hiển thị khi bấm nút [ Lọc ] */}
              {showMobileHistoryFilters && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-2xs">
                  {/* Ô tìm kiếm */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-zinc-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Tìm ghi chú, mã..."
                      className="w-full pl-7 pr-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>

                  {/* 2 cột: Ngày & Trạng thái */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Chọn ngày:</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Trạng thái:</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => {
                          setSelectedStatus(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-xs"
                      >
                        <option value="all">Tất cả</option>
                        <option value="on_time">Đúng giờ</option>
                        <option value="late">Đi muộn</option>
                        <option value="early_leave">Về sớm</option>
                        <option value="completed">Hoàn thành</option>
                      </select>
                    </div>
                  </div>

                  {/* Nút Xóa lọc & Đóng bộ lọc */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        ✕ Xóa bộ lọc
                      </button>
                    ) : (
                      <span className="text-zinc-400">Chưa áp dụng bộ lọc</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowMobileHistoryFilters(false)}
                      className="text-zinc-600 dark:text-zinc-300 font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 cursor-pointer"
                    >
                      Đóng ▲
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. GIAO DIỆN DESKTOP / TABLET (>= sm): THANH BỘ LỌC ĐẦY ĐỦ RỘNG RÃI */}
            <div className="hidden sm:flex p-3.5 sm:p-4 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full xl:w-auto">
                {/* 1. Ô tìm kiếm Ghi chú hoặc ngày */}
                <div className="relative w-full sm:w-60">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm kiếm bản ghi của bạn..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm sm:text-xs"
                  />
                </div>

                {/* 3. Lọc theo Ngày & Nút chọn nhanh */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                    <span className="text-zinc-500 dark:text-zinc-400 text-xs shrink-0 font-medium flex items-center gap-1">
                      <span>📅</span>
                      <span>Ngày:</span>
                    </span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm sm:text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
                    />
                  </div>

                  {/* Nút chọn nhanh ngày */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(todayDateString);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${selectedDate === todayDateString
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                        : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                    >
                      Hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(yesterdayDateString);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${selectedDate === yesterdayDateString
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                        : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                    >
                      Hôm qua
                    </button>
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate("");
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors"
                        title="Xem toàn bộ các ngày"
                      >
                        Tất cả ngày
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Lọc theo trạng thái */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs shrink-0 font-medium">Trạng thái:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Lọc theo trạng thái chấm công"
                    className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm sm:text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="on_time">Đúng giờ</option>
                    <option value="late">Đi muộn</option>
                    <option value="early_leave">Về sớm</option>
                    <option value="completed">Hoàn thành</option>
                  </select>
                </div>
              </div>

              {/* Các nút hành động phụ: Xóa lọc, Làm mới, Xuất Excel */}
              <div className="flex items-center justify-between xl:justify-end gap-2 pt-2 xl:pt-0 border-t xl:border-t-0 border-zinc-200/60 dark:border-zinc-800">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Xóa lọc</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto xl:ml-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchHistory(currentPage)}
                    className="text-xs flex items-center gap-1.5 px-2.5 py-1.5"
                  >
                    <svg className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Làm mới</span>
                  </Button>

                  {/* Nút Xuất Excel */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportHistoryExcel}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 shadow-2xs"
                    title="Xuất danh sách điểm danh toàn nhân viên theo bộ lọc ra file Excel (.xlsx)"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Xuất Excel</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Bảng Dữ Liệu Lịch Sử (Card List trên Mobile, Full Table trên Desktop) */}
            <div>
              {loadingHistory ? (
                <div className="p-4">
                  <TableSkeleton rows={5} columns={8} />
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3 text-lg">
                    📋
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Không tìm thấy dữ liệu chấm công
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    Không có bản ghi nào khớp với điều kiện lọc hiện tại. Thử đổi ngày hoặc mã nhân viên khác.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Xóa tất cả bộ lọc
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* 1. GIAO DIỆN MOBILE: DẠNG DANH SÁCH THẺ (CARD LIST) */}
                  <div className="sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                    {history.map((record) => {
                      const isLate = record.status === "late";
                      const isEarly = record.status === "early_leave";

                      return (
                        <div
                          key={record.id}
                          className="p-3.5 space-y-2.5 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          {/* Hàng 1: Mã NV + Ngày + Badge trạng thái */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                                {record.employeeCode || "—"}
                              </span>
                              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 font-semibold">
                                {record.date}
                              </span>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${record.status === "on_time"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                : isLate
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                                  : isEarly
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300"
                                }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${record.status === "on_time"
                                  ? "bg-emerald-500"
                                  : isLate
                                    ? "bg-amber-500"
                                    : isEarly
                                      ? "bg-blue-500"
                                      : "bg-purple-500"
                                  }`}
                              />
                              {record.status === "on_time"
                                ? "Đúng Giờ"
                                : isLate
                                  ? "Đi Muộn"
                                  : isEarly
                                    ? "Về Sớm"
                                    : "Hoàn Thành"}
                            </span>
                          </div>

                          {/* Hàng 2: 2 ô giờ Vào & giờ Ra */}
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
                              <span className="text-[10px] text-zinc-400 block mb-0.5">Giờ vào:</span>
                              <span className={`font-bold text-sm ${isLate ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                                {formatDisplayTime(record.checkInTime)}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
                              <span className="text-[10px] text-zinc-400 block mb-0.5">Giờ về:</span>
                              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                {formatDisplayTime(record.checkOutTime)}
                              </span>
                            </div>
                          </div>

                          {/* Hàng 4: Thời lượng làm việc & Ghi chú */}
                          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                            <span>
                              Thời lượng:{" "}
                              <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                                {record.workDurationMinutes !== undefined
                                  ? `${Math.floor(record.workDurationMinutes / 60)}h ${record.workDurationMinutes % 60}m`
                                  : "—"}
                              </strong>
                            </span>
                            {record.note && (
                              <span className="italic truncate max-w-[150px]" title={record.note}>
                                📝 {record.note}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2. GIAO DIỆN TABLET / DESKTOP: BẢNG DỮ LIỆU ĐẦY ĐỦ */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="px-4 py-3">Mã NV</th>
                          <th className="px-4 py-3">Ngày</th>
                          <th className="px-4 py-3">Giờ Vào (Check-in)</th>
                          <th className="px-4 py-3">Giờ Về (Check-out)</th>
                          <th className="px-4 py-3">Thời Lượng</th>
                          <th className="px-4 py-3">Trạng Thái</th>
                          <th className="px-4 py-3">Ghi Chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-sans">
                        {history.map((record) => {
                          return (
                            <tr
                              key={record.id}
                              className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                              {/* Cột 1: Mã Nhân Viên (Font-mono nổi bật) */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                                  {record.employeeCode || "—"}
                                </span>
                              </td>

                              {/* Cột 2: Ngày chấm công */}
                              <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300 font-mono">
                                {record.date}
                              </td>

                              {/* Cột 4: Giờ vào & IP */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                {record.checkInTime ? (
                                  <div className="flex flex-col">
                                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                      {formatDisplayTime(record.checkInTime)}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-mono">
                                      IP: {record.checkInIp || "—"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-zinc-400">—</span>
                                )}
                              </td>

                              {/* Cột 5: Giờ về & IP */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                {record.checkOutTime ? (
                                  <div className="flex flex-col">
                                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                      {formatDisplayTime(record.checkOutTime)}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-mono">
                                      IP: {record.checkOutIp || "—"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-zinc-400">—</span>
                                )}
                              </td>

                              {/* Cột 6: Thời lượng làm việc */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                {record.workDurationMinutes !== undefined ? (
                                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                    {Math.floor(record.workDurationMinutes / 60)}h {record.workDurationMinutes % 60}m
                                  </span>
                                ) : (
                                  <span className="text-zinc-400">—</span>
                                )}
                              </td>

                              {/* Cột 7: Trạng thái (Huy hiệu màu) */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${record.status === "on_time"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                    : record.status === "late"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                                      : record.status === "early_leave"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                                        : "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300"
                                    }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${record.status === "on_time"
                                      ? "bg-emerald-500"
                                      : record.status === "late"
                                        ? "bg-amber-500"
                                        : record.status === "early_leave"
                                          ? "bg-blue-500"
                                          : "bg-purple-500"
                                      }`}
                                  />
                                  {record.status === "on_time"
                                    ? "Đúng Giờ"
                                    : record.status === "late"
                                      ? "Đi Muộn"
                                      : record.status === "early_leave"
                                        ? "Về Sớm"
                                        : "Hoàn Thành"}
                                </span>
                              </td>

                              {/* Cột 8: Ghi chú */}
                              <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
                                {record.note || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* 4. Thanh Phân Trang (Hiển thị 10 bản ghi / trang) */}
            {!loadingHistory && history.length > 0 && (
              <div className="px-3.5 py-3 sm:px-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Trái: Thông tin dải bản ghi hiển thị */}
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>
                    Hiển thị{" "}
                    <strong className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                      {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)}
                    </strong>{" "}
                    /{" "}
                    <strong className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                      {totalRecords}
                    </strong>{" "}
                    bản ghi
                  </span>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    10 bản ghi / trang
                  </span>
                </div>

                {/* Phải: Các nút điều hướng phân trang */}
                {totalPages > 1 && (
                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
                    {/* Nút Về Trang Đầu (khi totalPages > 5) */}
                    {totalPages > 5 && (
                      <button
                        type="button"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage <= 1 || loadingHistory}
                        className={`hidden sm:inline-flex p-1.5 rounded-lg text-xs transition-colors ${currentPage <= 1 || loadingHistory
                          ? "opacity-30 cursor-not-allowed text-zinc-400 dark:text-zinc-600"
                          : "cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                          }`}
                        title="Về trang đầu"
                        aria-label="Về trang đầu"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                      </button>
                    )}

                    {/* Nút Trang Trước */}
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loadingHistory}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${currentPage <= 1 || loadingHistory
                        ? "opacity-40 cursor-not-allowed text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800/50"
                        : "cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                      aria-label="Trang trước"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Trước</span>
                    </button>

                    {/* Hiển thị số trang trên Mobile */}
                    <span className="sm:hidden font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-2">
                      Trang {currentPage} / {totalPages}
                    </span>

                    {/* Danh sách các số trang trên Tablet / Desktop */}
                    <div className="hidden sm:flex items-center gap-1">
                      {paginationItems.map((item, index) => {
                        if (typeof item === "string") {
                          return (
                            <span
                              key={`ellipsis-${index}`}
                              className="px-1.5 py-1 text-xs text-zinc-400 dark:text-zinc-500 font-mono select-none"
                            >
                              …
                            </span>
                          );
                        }
                        const isCurrent = item === currentPage;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handlePageChange(item)}
                            aria-current={isCurrent ? "page" : undefined}
                            className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-mono font-medium transition-all ${isCurrent
                              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shadow-xs scale-105"
                              : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                              }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>

                    {/* Nút Trang Sau */}
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || loadingHistory}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${currentPage >= totalPages || loadingHistory
                        ? "opacity-40 cursor-not-allowed text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800/50"
                        : "cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                      aria-label="Trang sau"
                    >
                      <span>Sau</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Nút Tới Trang Cuối (khi totalPages > 5) */}
                    {totalPages > 5 && (
                      <button
                        type="button"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage >= totalPages || loadingHistory}
                        className={`hidden sm:inline-flex p-1.5 rounded-lg text-xs transition-colors ${currentPage >= totalPages || loadingHistory
                          ? "opacity-30 cursor-not-allowed text-zinc-400 dark:text-zinc-600"
                          : "cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                          }`}
                        title="Tới trang cuối"
                        aria-label="Tới trang cuối"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AttendanceRecord, ApiResponse, PaginatedData, LeaveOtRequest } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui/Loading";
import { exportAttendanceToExcel } from "@/lib/exportExcel";

interface AttendanceCalendarProps {
  initialDate?: Date;
  onSelectDate?: (dateStr: string) => void;
  className?: string;
}

// Cấu hình nhãn & biểu tượng cho các loại nghỉ phép
const leaveLabels: Record<
  string,
  { label: string; shortLabel: string; icon: string; bg: string; text: string; border: string }
> = {
  annual: {
    label: "Nghỉ phép năm",
    shortLabel: "Phép năm",
    icon: "🏖️",
    bg: "bg-emerald-50 dark:bg-emerald-950/70",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  sick: {
    label: "Nghỉ ốm đau",
    shortLabel: "Nghỉ ốm",
    icon: "🩺",
    bg: "bg-rose-50 dark:bg-rose-950/70",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
  unpaid: {
    label: "Nghỉ không lương",
    shortLabel: "K.lương",
    icon: "💼",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
    border: "border-zinc-300 dark:border-zinc-700",
  },
  remote_wfh: {
    label: "Làm từ xa (WFH)",
    shortLabel: "WFH",
    icon: "🏠",
    bg: "bg-indigo-50 dark:bg-indigo-950/70",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  bereavement_marriage: {
    label: "Việc riêng (Hiếu/Hỷ)",
    shortLabel: "Việc riêng",
    icon: "💍",
    bg: "bg-purple-50 dark:bg-purple-950/70",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  maternity_paternity: {
    label: "Nghỉ thai sản",
    shortLabel: "Thai sản",
    icon: "👶",
    bg: "bg-pink-50 dark:bg-pink-950/70",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-800",
  },
};

// Cấu hình chế độ OT
const otTypeBadges: Record<
  string,
  { label: string; rate: string; bg: string; text: string; border: string }
> = {
  weekday: {
    label: "Ngày thường",
    rate: "150%",
    bg: "bg-blue-50 dark:bg-blue-950/70",
    text: "text-blue-800 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  weekend: {
    label: "Cuối tuần",
    rate: "200%",
    bg: "bg-amber-50 dark:bg-amber-950/70",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  holiday: {
    label: "Lễ / Tết",
    rate: "300%",
    bg: "bg-rose-50 dark:bg-rose-950/70",
    text: "text-rose-800 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
};

// Hàm sinh danh sách các ngày liên tục giữa 2 ngày YYYY-MM-DD
function getDatesInRange(startStr?: string, endStr?: string): string[] {
  if (!startStr) return [];
  if (!endStr || endStr === startStr) return [startStr];
  const dates: string[] = [];
  const [sY, sM, sD] = startStr.split("-").map(Number);
  const [eY, eM, eD] = endStr.split("-").map(Number);
  if (!sY || !sM || !sD || !eY || !eM || !eD) return [startStr];

  const curr = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, "0");
    const d = String(curr.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export function AttendanceCalendar({
  initialDate = new Date(),
  onSelectDate,
  className = "",
}: AttendanceCalendarProps) {
  const { user } = useAuth();

  // Tháng và năm đang xem
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  // Dữ liệu chấm công trong tháng
  const [recordsMap, setRecordsMap] = useState<Record<string, AttendanceRecord>>({});
  
  // Dữ liệu đơn xin nghỉ phép & đơn OT đã được duyệt
  const [leaveMap, setLeaveMap] = useState<Record<string, LeaveOtRequest[]>>({});
  const [otMap, setOtMap] = useState<Record<string, LeaveOtRequest[]>>({});

  const [loading, setLoading] = useState<boolean>(true);

  // Chế độ xem: "grid" (Lưới tháng) hoặc "list" (Danh sách ngày)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Ngày được chọn để xem chi tiết
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedLeaves, setSelectedLeaves] = useState<LeaveOtRequest[]>([]);
  const [selectedOts, setSelectedOts] = useState<LeaveOtRequest[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");

  // Định dạng ngày hôm nay theo YYYY-MM-DD
  const todayStr = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  }, []);

  // Tải đồng thời dữ liệu chấm công và các đơn nghỉ phép, OT đã được phê duyệt trong tháng
  const fetchMonthRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Tính ngày bắt đầu và kết thúc tháng (YYYY-MM-DD)
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      // Gọi đồng thời API chấm công và API đơn nghỉ & OT đã duyệt (status=approved, scope=my)
      const attPromise = fetch(
        `/api/attendance/history?scope=my&startDate=${startDate}&endDate=${endDate}&limit=100`
      );
      const reqPromise = fetch(
        `/api/requests?scope=my&status=approved&limit=100`
      );

      const [attRes, reqRes] = await Promise.all([attPromise, reqPromise]);

      const attJson: ApiResponse<PaginatedData<AttendanceRecord> | AttendanceRecord[]> = await attRes.json();
      if (attJson.success && attJson.data) {
        const items = "items" in attJson.data && Array.isArray(attJson.data.items)
          ? attJson.data.items
          : Array.isArray(attJson.data)
            ? attJson.data
            : [];

        // Ánh xạ thành Map theo ngày YYYY-MM-DD
        const map: Record<string, AttendanceRecord> = {};
        items.forEach((item) => {
          map[item.date] = item;
        });
        setRecordsMap(map);
      }

      const reqJson = await reqRes.json();
      if (reqJson.success && reqJson.data) {
        const reqItems: LeaveOtRequest[] = reqJson.data.items || [];
        const lMap: Record<string, LeaveOtRequest[]> = {};
        const oMap: Record<string, LeaveOtRequest[]> = {};

        reqItems.forEach((req) => {
          if (req.type === "leave" && req.startDate && req.endDate) {
            const dateRange = getDatesInRange(req.startDate, req.endDate);
            dateRange.forEach((dStr) => {
              if (!lMap[dStr]) lMap[dStr] = [];
              lMap[dStr].push(req);
            });
          } else if (req.type === "overtime" && req.otDate) {
            if (!oMap[req.otDate]) oMap[req.otDate] = [];
            oMap[req.otDate].push(req);
          }
        });

        setLeaveMap(lMap);
        setOtMap(oMap);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch chấm công & đơn tháng:", err);
    } finally {
      setLoading(false);
    }
  }, [user, currentYear, currentMonth]);

  useEffect(() => {
    fetchMonthRecords();
  }, [fetchMonthRecords]);

  // Điều hướng tháng
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Xuất dữ liệu chấm công, nghỉ phép và OT tháng hiện tại ra file Excel (.xlsx)
  const handleExportMonthExcel = () => {
    const records = Object.values(recordsMap);
    const hasAnyData =
      records.length > 0 ||
      Object.keys(leaveMap).length > 0 ||
      Object.keys(otMap).length > 0;

    if (!hasAnyData) {
      alert("Không có dữ liệu chấm công, nghỉ phép hoặc làm thêm giờ (OT) trong tháng này để xuất file.");
      return;
    }
    const code = user?.employeeCode || "NV";
    const filename = `Bang_Tong_Hop_Cong_Nghi_OT_${code}_Thang_${currentMonth + 1}_${currentYear}.xlsx`;
    exportAttendanceToExcel(
      records,
      filename,
      `BẢNG TỔNG HỢP CHẤM CÔNG, NGHỈ PHÉP & LÀM THÊM GIỜ (OT) THÁNG ${currentMonth + 1}/${currentYear}`,
      {
        leaveMap,
        otMap,
        month: currentMonth + 1,
        year: currentYear,
        user: {
          name: user?.name,
          employeeCode: user?.employeeCode,
          email: user?.email,
          department: user?.department,
        },
      }
    );
  };

  // Định dạng giờ hiển thị an toàn theo múi giờ Việt Nam
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    const match = isoString.match(/T(\d{2})[:.](\d{2})/);
    if (match) return `${match[1]}:${match[2]}`;
    return "—";
  };

  // Danh sách các ngày trong tháng có dữ liệu (Chấm công / Nghỉ phép / OT) sắp xếp giảm dần (cho List view)
  const sortedMonthItems = useMemo(() => {
    const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    const allDates = new Set<string>();

    Object.keys(recordsMap).forEach((d) => {
      if (d.startsWith(currentMonthPrefix)) allDates.add(d);
    });
    Object.keys(leaveMap).forEach((d) => {
      if (d.startsWith(currentMonthPrefix)) allDates.add(d);
    });
    Object.keys(otMap).forEach((d) => {
      if (d.startsWith(currentMonthPrefix)) allDates.add(d);
    });

    const datesArray = Array.from(allDates).sort((a, b) => b.localeCompare(a));

    return datesArray.map((date) => ({
      date,
      record: recordsMap[date],
      leaves: leaveMap[date] || [],
      ots: otMap[date] || [],
    }));
  }, [recordsMap, leaveMap, otMap, currentYear, currentMonth]);

  // Tính toán số liệu thống kê tháng
  const stats = useMemo(() => {
    const records = Object.values(recordsMap);
    const totalWorkingDays = records.length;
    let onTimeCount = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;
    let totalMinutes = 0;

    records.forEach((r) => {
      if (r.status === "on_time" || r.status === "completed") {
        onTimeCount++;
      } else if (r.status === "late") {
        lateCount++;
      } else if (r.status === "early_leave") {
        earlyLeaveCount++;
      }
      if (r.workDurationMinutes) {
        totalMinutes += r.workDurationMinutes;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Tính tổng ngày nghỉ phép được duyệt trong tháng hiện tại
    const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    const monthLeaveDates = new Set<string>();
    Object.entries(leaveMap).forEach(([dateStr, leaves]) => {
      if (dateStr.startsWith(currentMonthPrefix) && leaves.length > 0) {
        monthLeaveDates.add(dateStr);
      }
    });
    const approvedLeaveDays = monthLeaveDates.size;

    // Tính tổng giờ OT được duyệt trong tháng hiện tại
    let approvedOtHours = 0;
    Object.entries(otMap).forEach(([dateStr, ots]) => {
      if (dateStr.startsWith(currentMonthPrefix)) {
        ots.forEach((ot) => {
          approvedOtHours += ot.durationHours || 0;
        });
      }
    });

    return {
      totalWorkingDays,
      onTimeCount,
      lateCount,
      earlyLeaveCount,
      totalHoursString: `${hours}h ${minutes}m`,
      approvedLeaveDays,
      approvedOtHours: Math.round(approvedOtHours * 10) / 10,
    };
  }, [recordsMap, leaveMap, otMap, currentYear, currentMonth]);

  // Tạo lưới ngày của tháng (Thứ 2 đến Chủ nhật)
  const calendarGrid = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Thứ 2 = 0, CN = 6
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    interface CalendarDay {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWeekend: boolean;
      record?: AttendanceRecord;
      leaves: LeaveOtRequest[];
      ots: LeaveOtRequest[];
    }

    const grid: CalendarDay[] = [];

    // Các ngày cuối của tháng trước
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dayOfWeek = (new Date(prevYear, prevMonth, dayNum).getDay() + 6) % 7;

      grid.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek >= 5, // T7 hoặc CN
        record: recordsMap[dateStr],
        leaves: leaveMap[dateStr] || [],
        ots: otMap[dateStr] || [],
      });
    }

    // Các ngày của tháng hiện tại
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dayOfWeek = (new Date(currentYear, currentMonth, dayNum).getDay() + 6) % 7;

      grid.push({
        dateStr,
        dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek >= 5,
        record: recordsMap[dateStr],
        leaves: leaveMap[dateStr] || [],
        ots: otMap[dateStr] || [],
      });
    }

    // Các ngày đầu của tháng sau để làm đầy tuần (bội số của 7)
    const remaining = (7 - (grid.length % 7)) % 7;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dayOfWeek = (new Date(nextYear, nextMonth, dayNum).getDay() + 6) % 7;

      grid.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek >= 5,
        record: recordsMap[dateStr],
        leaves: leaveMap[dateStr] || [],
        ots: otMap[dateStr] || [],
      });
    }

    return grid;
  }, [currentYear, currentMonth, todayStr, recordsMap, leaveMap, otMap]);

  const monthNames = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  const weekDayLabelsShort = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const weekDayLabelsFull = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

  const handleDayClick = (
    dayStr: string,
    record?: AttendanceRecord,
    leaves: LeaveOtRequest[] = [],
    ots: LeaveOtRequest[] = []
  ) => {
    setSelectedDateStr(dayStr);
    setSelectedRecord(record || null);
    setSelectedLeaves(leaves);
    setSelectedOts(ots);
    if (onSelectDate) {
      onSelectDate(dayStr);
    }
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden ${className}`}>
      {/* 1. Header Lịch: Hiển thị trên 1 hàng duy nhất trên PC */}
      <div className="px-3 py-2.5 sm:px-5 sm:py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-3 bg-zinc-50/50 dark:bg-zinc-950/20">
        {/* Khối bên trái: Tiêu đề + Mã NV + Điều hướng Tháng + Hôm nay */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 shrink-0">
              <span>📅</span>
              <span>Lịch Chấm Công</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
              {user?.employeeCode ? user.employeeCode : user?.name}
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-zinc-300 dark:bg-zinc-700 shrink-0" />

          {/* Điều hướng tháng */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={loading}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors shadow-2xs shrink-0"
              title="Tháng trước"
              aria-label="Tháng trước"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 min-w-[110px] sm:min-w-[125px] text-center font-mono shrink-0">
              {monthNames[currentMonth]}, {currentYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={loading}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors shadow-2xs shrink-0"
              title="Tháng sau"
              aria-label="Tháng sau"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors shadow-2xs shrink-0"
            >
              Hôm nay
            </button>
          </div>
        </div>

        {/* Khối bên phải: Switcher Chế độ Lưới / Danh sách + Nút Xuất Excel */}
        <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
          {/* Toggle Chế độ xem: Lưới (Grid) vs Danh sách (List) */}
          <div className="flex items-center p-0.5 bg-zinc-200/80 dark:bg-zinc-800 rounded-lg text-xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title="Chế độ xem lưới lịch"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Lưới</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title="Chế độ xem danh sách ngày"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Danh sách</span>
            </button>
          </div>

          {/* Nút Xuất Excel Tháng (Đầy đủ Chấm công, Nghỉ phép và OT) */}
          <button
            type="button"
            onClick={handleExportMonthExcel}
            disabled={
              loading ||
              (Object.keys(recordsMap).length === 0 &&
                Object.keys(leaveMap).length === 0 &&
                Object.keys(otMap).length === 0)
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
              loading ||
              (Object.keys(recordsMap).length === 0 &&
                Object.keys(leaveMap).length === 0 &&
                Object.keys(otMap).length === 0)
                ? "opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800 text-zinc-400"
                : "border-emerald-600/40 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer shadow-2xs"
            }`}
            title="Xuất bảng tổng hợp chấm công, nghỉ phép và làm thêm giờ (OT) tháng này ra file Excel (.xlsx)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ thống kê tóm tắt tháng: Mở rộng thành 6 chỉ số gồm Nghỉ phép & OT đã duyệt */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-zinc-200 dark:divide-zinc-800 border-b border-zinc-200 dark:border-zinc-800 text-[11px] sm:text-xs">
        <div className="p-2.5 sm:p-3 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Số ngày làm:</span>
          <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {stats.totalWorkingDays} ngày
          </span>
        </div>
        <div className="p-2.5 sm:p-3 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Đúng giờ:</span>
          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {stats.onTimeCount} ngày
          </span>
        </div>
        <div className="p-2.5 sm:p-3 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <span className="text-amber-600 dark:text-amber-400 font-medium">Đi muộn:</span>
          <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
            {stats.lateCount} ngày
          </span>
        </div>
        <div className="p-2.5 sm:p-3 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Tổng giờ:</span>
          <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {stats.totalHoursString}
          </span>
        </div>
        <div className="p-2.5 sm:p-3 bg-teal-50/50 dark:bg-teal-950/20 flex items-center justify-between">
          <span className="text-teal-700 dark:text-teal-300 font-medium flex items-center gap-1">
            <span>🏖️</span>
            <span>Nghỉ phép (duyệt):</span>
          </span>
          <span className="font-bold font-mono text-teal-700 dark:text-teal-300">
            {stats.approvedLeaveDays} ngày
          </span>
        </div>
        <div className="p-2.5 sm:p-3 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
          <span className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
            <span>⚡</span>
            <span>Giờ OT (duyệt):</span>
          </span>
          <span className="font-bold font-mono text-amber-700 dark:text-amber-300">
            {stats.approvedOtHours}h
          </span>
        </div>
      </div>

      {/* 3. NỘI DUNG CHÍNH: LƯỚI THÁNG HOẶC DANH SÁCH NGÀY */}
      {viewMode === "grid" ? (
        /* 3A. LƯỚI LỊCH 7 CỘT (RESPONSIVE CHO CẢ MOBILE & DESKTOP) */
        <div className="p-2.5 sm:p-5 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xs z-10 flex items-center justify-center">
              <Spinner size="md" />
            </div>
          )}

          {/* Tiêu đề các thứ trong tuần (viết tắt trên mobile, đầy đủ trên desktop) */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 sm:mb-2 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {weekDayLabelsFull.map((lbl, idx) => (
              <div
                key={lbl}
                className={`py-1 rounded-md ${idx >= 5 ? "text-amber-600 dark:text-amber-400" : ""}`}
              >
                <span className="sm:hidden text-[11px] font-bold">{weekDayLabelsShort[idx]}</span>
                <span className="hidden sm:inline">{lbl}</span>
              </div>
            ))}
          </div>

          {/* Các ô ngày trong tháng */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarGrid.map((day) => {
              const hasRecord = Boolean(day.record);
              const hasLeave = day.leaves.length > 0;
              const hasOt = day.ots.length > 0;
              const isLate = day.record?.status === "late";
              const isEarly = day.record?.status === "early_leave";
              const isSelected = selectedDateStr === day.dateStr;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => handleDayClick(day.dateStr, day.record, day.leaves, day.ots)}
                  className={`min-h-[64px] sm:min-h-[102px] p-1 sm:p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                    !day.isCurrentMonth
                      ? "opacity-35 bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-200/50 dark:border-zinc-800/50"
                      : isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/60 shadow-xs"
                        : day.isToday
                          ? "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                          : hasLeave && !hasRecord
                            ? "bg-teal-50/40 dark:bg-teal-950/30 border-teal-300/80 dark:border-teal-800/60 hover:border-teal-400"
                            : hasRecord
                              ? isLate
                                ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 hover:border-amber-400"
                                : "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-400"
                              : hasOt
                                ? "bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 hover:border-amber-300"
                                : day.isWeekend
                                  ? "bg-zinc-50/30 dark:bg-zinc-950/10 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/50"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  {/* Dòng ngày: Số ngày + Huy hiệu hôm nay + Icons trạng thái góc phải */}
                  <div className="flex items-center justify-between gap-1">
                    {/* Hiển thị số ngày */}
                    <div className="flex items-center gap-1 shrink-0">
                      {day.isToday ? (
                        <>
                          <span className="sm:hidden w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {day.dayNum}
                          </span>
                          <span className="hidden sm:inline-block text-xs font-mono font-bold text-zinc-950 dark:text-zinc-50">
                            {day.dayNum}
                          </span>
                          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                            Hôm nay
                          </span>
                        </>
                      ) : (
                        <span
                          className={`text-[11px] sm:text-xs font-mono font-bold ${
                            day.isCurrentMonth
                              ? day.isWeekend
                                ? "text-zinc-400 dark:text-zinc-500"
                                : "text-zinc-800 dark:text-zinc-200"
                              : "text-zinc-400 dark:text-zinc-600"
                          }`}
                        >
                          {day.dayNum}
                        </span>
                      )}
                    </div>

                    {/* Icons chỉ báo nhỏ góc phải */}
                    <div className="flex items-center gap-1 shrink-0">
                      {hasLeave && (
                        <span className="text-[10px] sm:text-[11px]" title="Có đơn nghỉ phép được duyệt">
                          {leaveLabels[day.leaves[0]?.leaveType || "annual"]?.icon || "🏖️"}
                        </span>
                      )}
                      {hasOt && (
                        <span className="text-[10px] sm:text-[11px]" title="Có đơn OT được duyệt">
                          ⚡
                        </span>
                      )}
                      {hasRecord && (
                        <span
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                            isLate
                              ? "bg-amber-500 ring-2 ring-amber-300/40"
                              : isEarly
                                ? "bg-blue-500 ring-2 ring-blue-300/40"
                                : "bg-emerald-500 ring-2 ring-emerald-300/40"
                          }`}
                          title={isLate ? "Đi muộn" : isEarly ? "Về sớm" : "Đúng giờ"}
                        />
                      )}
                    </div>
                  </div>

                  {/* Nội dung điểm danh, nghỉ phép và OT trong ô ngày */}
                  <div className="mt-1 space-y-1">
                    {/* 1. Điểm danh nếu có */}
                    {hasRecord && (
                      <>
                        {/* Mobile: Giờ check-in */}
                        <div className="sm:hidden text-center">
                          <span
                            className={`font-mono text-[9px] font-bold block truncate leading-tight ${
                              isLate ? "text-amber-700 dark:text-amber-300" : "text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            {formatTime(day.record?.checkInTime)}
                          </span>
                        </div>

                        {/* Tablet / Desktop: Đầy đủ giờ vào, giờ ra */}
                        <div className="hidden sm:block space-y-0.5">
                          <div className="text-[10px] sm:text-[11px] font-mono leading-tight">
                            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                              <span className="text-[9px] text-zinc-400">V:</span>
                              <span className={`font-semibold ${isLate ? "text-amber-700 dark:text-amber-300" : ""}`}>
                                {formatTime(day.record?.checkInTime)}
                              </span>
                            </div>
                            {day.record?.checkOutTime && (
                              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                                <span className="text-[9px] text-zinc-400">R:</span>
                                <span className="font-semibold">{formatTime(day.record?.checkOutTime)}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-0.5">
                            <span
                              className={`inline-block px-1 py-0.2 rounded text-[8px] font-mono font-medium truncate max-w-full ${
                                isLate
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                            >
                              {day.record?.workDurationMinutes
                                ? `${Math.floor(day.record.workDurationMinutes / 60)}h${day.record.workDurationMinutes % 60}m`
                                : isLate
                                  ? "Muộn"
                                  : "Đúng giờ"}
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* 2. Huy hiệu Đơn Nghỉ Phép Đã Duyệt */}
                    {hasLeave && (
                      <div className="space-y-0.5">
                        {day.leaves.map((l) => {
                          const cfg = leaveLabels[l.leaveType || "annual"] || leaveLabels.annual;
                          const shiftText = l.durationShift === "morning" ? "Sáng" : l.durationShift === "afternoon" ? "Chiều" : "";
                          return (
                            <div
                              key={l.id}
                              className={`px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-medium border truncate leading-tight flex items-center gap-0.5 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                              title={`${cfg.label} - Phê duyệt bởi ${l.approverName || "Giám đốc"}`}
                            >
                              <span className="shrink-0">{cfg.icon}</span>
                              <span className="truncate">{cfg.shortLabel} {shiftText && `(${shiftText})`}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. Huy hiệu Đơn Làm Thêm Giờ (OT) Đã Duyệt */}
                    {hasOt && (
                      <div className="space-y-0.5">
                        {day.ots.map((ot) => (
                          <div
                            key={ot.id}
                            className="px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-medium border truncate leading-tight bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 flex items-center gap-0.5"
                            title={`Làm thêm OT: ${ot.startTime || ""} - ${ot.endTime || ""} (+${ot.durationHours}h) - Phê duyệt bởi ${ot.approverName || "Giám đốc"}`}
                          >
                            <span className="shrink-0">⚡</span>
                            <span className="truncate">OT +{ot.durationHours}h</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dấu gạch mờ nếu không có dữ liệu gì trong ngày làm việc đã qua */}
                    {!hasRecord && !hasLeave && !hasOt && day.isCurrentMonth && !day.isWeekend && day.dateStr < todayStr && (
                      <div className="text-[10px] text-zinc-300 dark:text-zinc-600 italic text-center sm:text-left">
                        —
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 3B. CHẾ ĐỘ DANH SÁCH (AGENDA VIEW - CỰC KỲ DỄ DÙNG TRÊN MOBILE) */
        <div className="p-3 sm:p-5">
          {loading ? (
            <div className="py-12 text-center">
              <Spinner size="md" />
              <p className="text-xs text-zinc-400 mt-2">Đang tải danh sách dữ liệu...</p>
            </div>
          ) : sortedMonthItems.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-2 text-base">
                📋
              </div>
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Chưa có dữ liệu chấm công, nghỉ phép hay OT nào trong {monthNames[currentMonth].toLowerCase()}, {currentYear}.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {sortedMonthItems.map((item) => {
                const isSelected = selectedDateStr === item.date;
                const isLate = item.record?.status === "late";
                const isEarly = item.record?.status === "early_leave";

                return (
                  <div
                    key={item.date}
                    onClick={() => handleDayClick(item.date, item.record, item.leaves, item.ots)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/50"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                          {item.date}
                        </span>
                        {item.date === todayStr && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                            Hôm nay
                          </span>
                        )}
                      </div>

                      {/* Huy hiệu trạng thái chấm công / nghỉ / OT */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.record && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isLate
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : isEarly
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLate ? "bg-amber-500" : isEarly ? "bg-blue-500" : "bg-emerald-500"
                              }`}
                            />
                            {isLate ? "Đi Muộn" : isEarly ? "Về Sớm" : "Đúng Giờ"}
                          </span>
                        )}
                        {item.leaves.map((l) => {
                          const cfg = leaveLabels[l.leaveType || "annual"] || leaveLabels.annual;
                          return (
                            <span
                              key={l.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                            >
                              <span>{cfg.icon}</span>
                              <span>{cfg.label}</span>
                            </span>
                          );
                        })}
                        {item.ots.map((ot) => (
                          <span
                            key={ot.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          >
                            <span>⚡</span>
                            <span>OT +{ot.durationHours}h ({ot.startTime}-{ot.endTime})</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Khối thông tin Giờ vào, Giờ ra, Thời lượng (nếu có chấm công) */}
                    {item.record && (
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2">
                        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
                          <span className="text-[10px] text-zinc-400 block">Giờ vào:</span>
                          <span className={`font-bold ${isLate ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                            {formatTime(item.record.checkInTime)}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
                          <span className="text-[10px] text-zinc-400 block">Giờ ra:</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {formatTime(item.record.checkOutTime)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Chi tiết đơn nghỉ phép nếu có */}
                    {item.leaves.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {item.leaves.map((l) => (
                          <div key={l.id} className="p-2 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 text-xs">
                            <div className="flex items-center justify-between text-teal-800 dark:text-teal-300 font-semibold mb-0.5">
                              <span>🏖️ Đơn Nghỉ Phép: {leaveLabels[l.leaveType || "annual"]?.label}</span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ Đã duyệt bởi {l.approverName || "Giám đốc"}</span>
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 italic">
                              Lý do: {l.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chi tiết đơn OT nếu có */}
                    {item.ots.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {item.ots.map((ot) => (
                          <div key={ot.id} className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-semibold mb-0.5">
                              <span>⚡ Làm Thêm Giờ: {ot.startTime} - {ot.endTime} (+{ot.durationHours}h)</span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ Đã duyệt bởi {ot.approverName || "Giám đốc"}</span>
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              Dự án/Công việc: <strong>{ot.projectOrTask}</strong>
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                              Lý do: {ot.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dòng tóm tắt */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                      {item.record ? (
                        <span>
                          Thời lượng làm việc:{" "}
                          <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                            {item.record.workDurationMinutes
                              ? `${Math.floor(item.record.workDurationMinutes / 60)}h ${item.record.workDurationMinutes % 60}m`
                              : "—"}
                          </strong>
                        </span>
                      ) : (
                        <span>Không có lượt chấm công</span>
                      )}
                      {item.record?.note && (
                        <span className="italic truncate max-w-[140px]" title={item.record.note}>
                          📝 {item.record.note}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Thẻ Chi Tiết Ngày Được Chọn (Bấm vào ngày bất kỳ để xem rõ ràng) */}
      {selectedDateStr && (
        <div className="p-3.5 sm:p-5 bg-zinc-50/95 dark:bg-zinc-950/90 border-t border-zinc-200 dark:border-zinc-800 space-y-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base flex items-center gap-1.5">
                <span>📌</span>
                <span>Chi tiết ngày:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{selectedDateStr}</span>
              </span>
              {selectedDateStr === todayStr && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  Hôm nay
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedDateStr("");
                setSelectedRecord(null);
                setSelectedLeaves([]);
                setSelectedOts([]);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-center shrink-0"
            >
              ✕ Đóng chi tiết
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* THẺ 1: THÔNG TIN CHẤM CÔNG THỰC TẾ */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <span>⏱️</span>
                  <span>Chấm công thực tế</span>
                </span>
                {selectedRecord && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      selectedRecord.status === "late"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : selectedRecord.status === "early_leave"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {selectedRecord.status === "late"
                      ? "Đi Muộn"
                      : selectedRecord.status === "early_leave"
                        ? "Về Sớm"
                        : "Đúng Giờ"}
                  </span>
                )}
              </div>

              {selectedRecord ? (
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Giờ vào:</span>
                    <strong className="text-zinc-900 dark:text-zinc-100">
                      {formatTime(selectedRecord.checkInTime)}{" "}
                      <span className="font-normal text-[10px] text-zinc-400">({selectedRecord.checkInIp || "—"})</span>
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Giờ về:</span>
                    <strong className="text-zinc-900 dark:text-zinc-100">
                      {formatTime(selectedRecord.checkOutTime)}{" "}
                      <span className="font-normal text-[10px] text-zinc-400">({selectedRecord.checkOutIp || "—"})</span>
                    </strong>
                  </div>
                  {selectedRecord.workDurationMinutes !== undefined && (
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                      <span className="text-zinc-500">Thời lượng:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {Math.floor(selectedRecord.workDurationMinutes / 60)}h {selectedRecord.workDurationMinutes % 60}m
                      </strong>
                    </div>
                  )}
                  {selectedRecord.note && (
                    <p className="text-[11px] font-sans text-zinc-500 italic pt-1">
                      📝 {selectedRecord.note}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-zinc-400 text-xs italic">
                  Không có dữ liệu chấm công trong ngày này.
                </div>
              )}
            </div>

            {/* THẺ 2: ĐƠN NGHỈ PHÉP ĐÃ DUYỆT */}
            <div className="p-3 rounded-xl border border-teal-200/80 dark:border-teal-900/50 bg-teal-50/20 dark:bg-teal-950/20 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-teal-200/60 dark:border-teal-900/40">
                <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1">
                  <span>🏖️</span>
                  <span>Đơn Nghỉ Phép</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                  {selectedLeaves.length} đơn
                </span>
              </div>

              {selectedLeaves.length > 0 ? (
                <div className="space-y-2">
                  {selectedLeaves.map((leave) => {
                    const cfg = leaveLabels[leave.leaveType || "annual"] || leaveLabels.annual;
                    const shiftLabel = leave.durationShift === "all_day" ? "Cả ngày" : leave.durationShift === "morning" ? "Buổi sáng" : "Buổi chiều";
                    return (
                      <div key={leave.id} className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-teal-200 dark:border-teal-900/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            ✓ Đã Duyệt
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-300 space-y-0.5">
                          <div>Ca nghỉ: <strong className="text-zinc-900 dark:text-zinc-100">{shiftLabel}</strong> ({leave.durationDays} ngày)</div>
                          <div>Thời gian: <span className="font-mono text-zinc-800 dark:text-zinc-200">{leave.startDate} {leave.endDate !== leave.startDate ? `đến ${leave.endDate}` : ""}</span></div>
                          <div className="italic text-zinc-500">Lý do: &ldquo;{leave.reason}&rdquo;</div>
                        </div>
                        <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 flex items-center justify-between">
                          <span>Người duyệt: <strong className="text-emerald-600 dark:text-emerald-400">👑 {leave.approverName || "Giám Đốc"}</strong></span>
                        </div>
                        {leave.approvalNote && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40 p-1.5 rounded">
                            💬 Ý kiến: {leave.approvalNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-zinc-400 text-xs italic">
                  Không có đơn nghỉ phép nào được duyệt vào ngày này.
                </div>
              )}
            </div>

            {/* THẺ 3: ĐƠN LÀM THÊM GIỜ (OT) ĐÃ DUYỆT */}
            <div className="p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/20 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-900/40">
                <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <span>⚡</span>
                  <span>Đơn Làm Thêm Giờ (OT)</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  {selectedOts.length} đơn
                </span>
              </div>

              {selectedOts.length > 0 ? (
                <div className="space-y-2">
                  {selectedOts.map((ot) => {
                    const otCfg = otTypeBadges[ot.otType || "weekday"] || otTypeBadges.weekday;
                    return (
                      <div key={ot.id} className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${otCfg.bg} ${otCfg.text} ${otCfg.border}`}>
                            ⚡ {otCfg.label} ({otCfg.rate})
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            ✓ Đã Duyệt
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-300 space-y-0.5 font-mono">
                          <div>Khung giờ: <strong className="text-amber-700 dark:text-amber-300">{ot.startTime} - {ot.endTime}</strong> (<span className="text-emerald-600 font-bold">+{ot.durationHours} giờ</span>)</div>
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-300 space-y-0.5">
                          <div>Dự án/Công việc: <strong className="text-zinc-900 dark:text-zinc-100">{ot.projectOrTask}</strong></div>
                          <div className="italic text-zinc-500">Lý do: &ldquo;{ot.reason}&rdquo;</div>
                        </div>
                        <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 flex items-center justify-between">
                          <span>Người duyệt: <strong className="text-emerald-600 dark:text-emerald-400">👑 {ot.approverName || "Giám Đốc"}</strong></span>
                        </div>
                        {ot.approvalNote && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40 p-1.5 rounded">
                            💬 Ý kiến: {ot.approvalNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-zinc-400 text-xs italic">
                  Không có đơn làm thêm giờ (OT) nào được duyệt vào ngày này.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Task, TaskPriority, TaskStatus } from "@/types";
import { LoadingSection } from "@/components/ui/Loading";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";

const priorityConfig: Record<TaskPriority, { label: string; class: string }> = {
  urgent: {
    label: "Khẩn cấp",
    class: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
  },
  high: {
    label: "Cao",
    class: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  },
  medium: {
    label: "Trung bình",
    class: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  },
  low: {
    label: "Thấp",
    class: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",
  },
};

const statusConfig: Record<TaskStatus, { label: string; badgeClass: string; dotClass: string }> = {
  todo: {
    label: "Cần làm",
    badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    dotClass: "bg-zinc-400",
  },
  in_progress: {
    label: "Đang làm",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    dotClass: "bg-blue-500",
  },
  review: {
    label: "Chờ duyệt",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    dotClass: "bg-amber-500",
  },
  completed: {
    label: "Hoàn thành",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
  },
  cancelled: {
    label: "Đã hủy",
    badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
    dotClass: "bg-rose-500",
  },
};

export default function TasksPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    completed: number;
    overdue: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Bộ lọc
  const [currentTab, setCurrentTab] = useState<"all" | "assigned_to_me" | "created_by_me" | "department">("all");
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | "all">("all");
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | "all">("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  // Mobile Board View: Cột trạng thái đang xem trên mobile ("all" hoặc từng cột)
  const [mobileBoardCol, setMobileBoardCol] = useState<TaskStatus | "all">("all");
  const [mobileExpandedCols, setMobileExpandedCols] = useState<Record<string, boolean>>({
    todo: true,
    in_progress: true,
    review: true,
    completed: false, // Mặc định thu gọn đã hoàn thành để tiết kiệm diện tích cuộn màn hình
  });

  const toggleMobileCol = (statusKey: string) => {
    setMobileExpandedCols((prev) => ({
      ...prev,
      [statusKey]: !prev[statusKey],
    }));
  };

  // Phân trang cho Table View: Chuẩn 10 bản ghi mới nhất mỗi trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Danh sách phòng ban cho bộ lọc (Admin/Director)
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string; code?: string }[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);

  const isDirectorOrAdmin = user?.role === "admin" || user?.role === "director";
  const isManager = user?.role === "manager";

  // Tải danh sách phòng ban từ cơ sở dữ liệu
  useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setDepartmentsList(
            json.data.map((d: { id: string; name: string; code?: string }) => ({
              id: d.id,
              name: d.name,
              code: d.code,
            }))
          );
        }
      })
      .catch(() => { });
  }, []);

  // Tải dữ liệu công việc
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const params = new URLSearchParams();
      params.set("tab", currentTab);
      params.set("stats", "true");
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (selectedPriority !== "all") params.set("priority", selectedPriority);
      if (selectedDepartment !== "all") params.set("department", selectedDepartment);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Không thể tải danh sách công việc");
      }

      setTasks(json.data.items || []);
      if (json.data.stats) {
        setStats(json.data.stats);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, [currentTab, selectedStatus, selectedPriority, selectedDepartment, searchQuery]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, fetchTasks]);

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
    fetchTasks();
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTaskDetail(updatedTask);
    fetchTasks();
  };

  const handleTaskDeleted = (deletedTaskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
    if (selectedTaskDetail?.id === deletedTaskId) {
      setSelectedTaskDetail(null);
    }
    fetchTasks();
  };

  const hasActiveFilters =
    selectedStatus !== "all" ||
    selectedPriority !== "all" ||
    selectedDepartment !== "all" ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedStatus("all");
    setSelectedPriority("all");
    setSelectedDepartment("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Phân trang dữ liệu dạng bảng: đúng 10 bản ghi mới nhất mỗi trang
  const totalRecords = tasks.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedTasks: Task[] = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return tasks.slice(start, start + pageSize);
  }, [tasks, safePage, pageSize]);

  // Danh sách các số trang hiển thị
  const paginationItems: (number | "...")[] = useMemo(() => {
    const delta = 2;
    const range: (number | "...")[] = [];
    for (
      let i = Math.max(2, safePage - delta);
      i <= Math.min(totalPages - 1, safePage + delta);
      i++
    ) {
      range.push(i);
    }

    if (safePage - delta > 2) {
      range.unshift("...");
    }
    if (safePage + delta < totalPages - 1) {
      range.push("...");
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  }, [safePage, totalPages]);

  return (
    <div className="w-full px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6">
      {/* ========================================================
          1. HEADER TRANG & NÚT TẠO CÔNG VIỆC MỚI
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            {/* Cụm Icon + Tiêu đề + Badge trên cùng 1 hàng ngang */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 sm:flex-initial">
              <span className="text-lg sm:text-2xl shrink-0">📋</span>
              <h1 className="text-[15px] sm:text-2xl font-bold leading-snug sm:leading-normal py-0.5 text-zinc-900 dark:text-zinc-100 truncate">
                Quản Lý Công Việc &amp; Nhiệm Vụ
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900 shrink-0">
                {isDirectorOrAdmin
                  ? "Doanh Nghiệp"
                  : isManager
                    ? `Phòng: ${user?.department || ""}`
                    : "Cá Nhân"}
              </span>
            </div>

            {/* Nút Reload chỉ trên mobile (< sm), nằm cạnh bên phải tiêu đề */}
            <button
              type="button"
              onClick={fetchTasks}
              disabled={loading}
              title="Làm mới dữ liệu"
              className="sm:hidden p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 active:scale-95 shadow-2xs"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 hidden sm:block">
            {isDirectorOrAdmin
              ? "Giám đốc & Quản trị viên: Phân bổ, giao việc và theo dõi tiến độ toàn bộ nhân viên công ty"
              : isManager
                ? `Trưởng phòng: Phân công nhiệm vụ và giám sát công việc của các nhân sự thuộc phòng ${user?.department || ""}`
                : "Theo dõi các công việc được cấp trên giao và quản lý các đầu việc cá nhân cần hoàn thành"}
          </p>
        </div>

        {/* Nút thao tác bên phải */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Nút reload desktop */}
          <button
            type="button"
            onClick={fetchTasks}
            disabled={loading}
            className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm font-medium transition cursor-pointer shrink-0"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Làm mới</span>
          </button>

          {/* Nút Tạo Công Việc Mới */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs sm:text-sm font-semibold shadow-xs transition active:scale-98 cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Tạo công việc mới</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. THỐNG KÊ KPI TỔNG QUAN
         ======================================================== */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* Tổng số */}
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              <span className="sm:hidden">Tổng số</span>
              <span className="hidden sm:inline">Tổng công việc</span>
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 sm:mt-1">
              {stats.total}
            </div>
          </div>

          {/* Cần làm */}
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              <span className="sm:hidden">Cần làm</span>
              <span className="hidden sm:inline">Cần làm (Todo)</span>
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-zinc-700 dark:text-zinc-300 mt-0.5 sm:mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span>{stats.todo}</span>
            </div>
          </div>

          {/* Đang làm */}
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-medium text-blue-700 dark:text-blue-400">
              <span className="sm:hidden">Đang làm</span>
              <span className="hidden sm:inline">Đang thực hiện</span>
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>{stats.inProgress}</span>
            </div>
          </div>

          {/* Chờ duyệt */}
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-medium text-amber-700 dark:text-amber-400">
              <span className="sm:hidden">Chờ duyệt</span>
              <span className="hidden sm:inline">Chờ phê duyệt</span>
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{stats.review}</span>
            </div>
          </div>

          {/* Hoàn thành */}
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <span className="sm:hidden">Hoàn thành</span>
              <span className="hidden sm:inline">Đã hoàn thành</span>
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{stats.completed}</span>
            </div>
          </div>

          {/* Quá hạn */}
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-medium text-rose-700 dark:text-rose-400">
              <span className="sm:hidden">Quá hạn</span>
              <span className="hidden sm:inline">Quá hạn chót</span>
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 sm:mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{stats.overdue}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. THANH ĐIỀU HƯỚNG TAB & BỘ LỌC
         ======================================================== */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2.5 sm:p-4 shadow-xs space-y-2 sm:space-y-3">
        {/* Hàng 1: Tabs phân loại trên bên trái + View mode toggle bên phải (Chung 1 hàng ngang) */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 overflow-x-auto flex-1 min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => {
                setCurrentTab("all");
                setCurrentPage(1);
              }}
              className={`px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${currentTab === "all"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
            >
              <span className="sm:hidden">
                {isDirectorOrAdmin ? "Toàn công ty" : isManager ? "Phòng ban" : "Tất cả"}
              </span>
              <span className="hidden sm:inline">
                {isDirectorOrAdmin ? "Toàn bộ công ty" : isManager ? "Toàn phòng ban" : "Tất cả của tôi"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentTab("assigned_to_me");
                setCurrentPage(1);
              }}
              className={`px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${currentTab === "assigned_to_me"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
            >
              <span className="sm:hidden">Được giao</span>
              <span className="hidden sm:inline">Được giao cho tôi</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentTab("created_by_me");
                setCurrentPage(1);
              }}
              className={`px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${currentTab === "created_by_me"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
            >
              <span className="sm:hidden">Tôi tạo</span>
              <span className="hidden sm:inline">
                {isDirectorOrAdmin || isManager ? "Việc tôi đã giao" : "Tôi đã tạo"}
              </span>
            </button>
            {(isDirectorOrAdmin || isManager) && (
              <button
                type="button"
                onClick={() => {
                  setCurrentTab("department");
                  setCurrentPage(1);
                }}
                className={`px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${currentTab === "department"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
              >
                <span className="sm:hidden">Phòng</span>
                <span className="hidden sm:inline">
                  {isManager ? `Phòng ${user?.department || ""}` : "Theo phòng ban"}
                </span>
              </button>
            )}
          </div>

          {/* View mode toggle (Table / Board) - Nằm cùng hàng với tabs */}
          <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Dạng Bảng (Table View)"
              className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 sm:gap-1.5 ${viewMode === "table"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
            >
              <span>📋</span>
              <span className="hidden min-[380px]:inline sm:hidden">Bảng</span>
              <span className="hidden sm:inline">Dạng Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              title="Dạng Thẻ Kanban (Board View)"
              className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 sm:gap-1.5 ${viewMode === "board"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
            >
              <span>📊</span>
              <span className="hidden min-[380px]:inline sm:hidden">Thẻ</span>
              <span className="hidden sm:inline">Bảng Thẻ</span>
            </button>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc chi tiết & Ô tìm kiếm */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-1 text-xs">
          {/* Ô tìm kiếm */}
          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tiêu đề, nhân sự, phòng ban..."
              className="w-full h-9 pl-8 pr-7 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
              🔍
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Nhóm dropdown lọc: 2 cột trên mobile, dàn đều trên desktop */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            {/* Lọc trạng thái */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as TaskStatus | "all");
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 sm:px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none text-xs truncate cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="todo">Cần làm</option>
              <option value="in_progress">Đang thực hiện</option>
              <option value="review">Chờ phê duyệt</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            {/* Lọc mức độ ưu tiên */}
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value as TaskPriority | "all");
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 sm:px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none text-xs truncate cursor-pointer"
            >
              <option value="all">Tất cả mức ưu tiên</option>
              <option value="urgent">Khẩn cấp</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
            </select>

            {/* Lọc phòng ban (cho Admin / Director) */}
            {isDirectorOrAdmin && departmentsList.length > 0 && (
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setCurrentPage(1);
                }}
                className="col-span-2 sm:col-span-1 h-9 px-2.5 sm:px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none text-xs truncate cursor-pointer"
              >
                <option value="all">Tất cả phòng ban</option>
                {departmentsList.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Nút reset bộ lọc */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full sm:w-auto h-9 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition cursor-pointer shrink-0"
            >
              <span>✕</span>
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          4. DANH SÁCH CÔNG VIỆC CHÍNH (TABLE HOẶC BOARD)
         ======================================================== */}
      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
          <LoadingSection text="Đang tải dữ liệu công việc & nhiệm vụ..." size="md" />
        </div>
      ) : errorMsg ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-xs text-rose-600">
          <p className="font-semibold">{errorMsg}</p>
          <button
            type="button"
            onClick={fetchTasks}
            className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
          >
            Thử tải lại
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-xs text-zinc-400 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto text-xl">
            📋
          </div>
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">Không tìm thấy công việc nào phù hợp</p>
          <p className="text-zinc-400 max-w-sm mx-auto">
            {hasActiveFilters
              ? "Hãy thử xóa hoặc điều chỉnh bộ lọc để xem các công việc khác."
              : "Hiện chưa có nhiệm vụ nào trong danh sách. Bạn có thể bấm nút Tạo công việc mới để bắt đầu."}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold transition cursor-pointer"
            >
              <span>+ Tạo công việc đầu tiên</span>
            </button>
          )}
        </div>
      ) : viewMode === "board" ? (
        /* ========================================================
           A. DẠNG THẺ KANBAN BOARD VIEW
           - Mobile (< md): Tabs chọn cột + Danh sách thẻ 100% full-width mượt mà (không bẫy cuộn, không tràn)
           - Desktop (>= md): Giữ nguyên 100% giao diện 4 cột Kanban Grid gốc
           ======================================================== */
        <div className="space-y-3 sm:space-y-4">
          {/* ========================================================
              A1. MOBILE KANBAN VIEW (< md)
             ======================================================== */}
          <div className="md:hidden space-y-3">
            {/* Thanh Tab / Segmented Bar chọn cột trên Mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* Tab Tất cả */}
              <button
                type="button"
                onClick={() => setMobileBoardCol("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                  mobileBoardCol === "all"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 shadow-2xs"
                }`}
              >
                <span>📋</span>
                <span>Tất cả</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    mobileBoardCol === "all"
                      ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {tasks.length}
                </span>
              </button>

              {/* 4 Cột trạng thái */}
              {(["todo", "in_progress", "review", "completed"] as TaskStatus[]).map((colStatus) => {
                const colTasks = tasks.filter((t) => t.status === colStatus);
                const conf = statusConfig[colStatus];
                const isActive = mobileBoardCol === colStatus;

                let activeClass = "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-xs";
                if (colStatus === "in_progress") activeClass = "bg-blue-600 text-white shadow-xs";
                else if (colStatus === "review") activeClass = "bg-amber-600 text-white shadow-xs";
                else if (colStatus === "completed") activeClass = "bg-emerald-600 text-white shadow-xs";

                return (
                  <button
                    key={colStatus}
                    type="button"
                    onClick={() => setMobileBoardCol(colStatus)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                      isActive
                        ? activeClass
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 shadow-2xs"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : conf.dotClass}`} />
                    <span>{conf.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-zinc-100 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {colTasks.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Chi tiết nội dung cột trên Mobile */}
            {mobileBoardCol !== "all" ? (
              (() => {
                const colStatus = mobileBoardCol;
                const colTasks = tasks.filter((t) => t.status === colStatus);
                const conf = statusConfig[colStatus];
                const kanbanStatuses: TaskStatus[] = ["todo", "in_progress", "review", "completed"];
                const currIdx = kanbanStatuses.indexOf(colStatus);
                const prevCol = currIdx > 0 ? kanbanStatuses[currIdx - 1] : null;
                const nextCol = currIdx >= 0 && currIdx < kanbanStatuses.length - 1 ? kanbanStatuses[currIdx + 1] : null;

                return (
                  <div className="space-y-3">
                    {/* Header thông tin cột đang chọn */}
                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${conf.dotClass}`} />
                        <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                          {conf.label}
                        </span>
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          {colTasks.length} công việc
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ Thêm việc</span>
                      </button>
                    </div>

                    {/* Danh sách thẻ việc của cột */}
                    {colTasks.length === 0 ? (
                      <div className="py-10 px-4 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2.5">
                        <div className="text-2xl">📭</div>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Chưa có công việc nào trong mục &ldquo;{conf.label}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsCreateModalOpen(true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
                        >
                          + Tạo việc mới
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {colTasks.map((t) => {
                          const pBadge = priorityConfig[t.priority] || priorityConfig.medium;
                          const isOverdue =
                            Boolean(t.dueDate) &&
                            t.status !== "completed" &&
                            new Date(t.dueDate!).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

                          return (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTaskDetail(t)}
                              className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs active:scale-[0.99] transition cursor-pointer space-y-2.5"
                            >
                              {/* Hàng 1: Priority + Phòng ban + Quá hạn */}
                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pBadge.class}`}>
                                    {pBadge.label}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 truncate max-w-[130px]">
                                    🏢 {t.department}
                                  </span>
                                </div>
                                {isOverdue && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900 animate-pulse">
                                    ⚠️ Quá hạn
                                  </span>
                                )}
                              </div>

                              {/* Hàng 2: Tiêu đề */}
                              <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                                {t.title}
                              </h4>

                              {/* Hàng 3: Tiến độ */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                                  <span>Tiến độ</span>
                                  <span className="font-bold text-zinc-700 dark:text-zinc-300">{t.progress}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      t.progress === 100
                                        ? "bg-emerald-500"
                                        : t.progress > 50
                                          ? "bg-blue-600"
                                          : "bg-amber-500"
                                    }`}
                                    style={{ width: `${t.progress}%` }}
                                  />
                                </div>
                              </div>

                              {/* Hàng 4: Hạn chót & Người thực hiện */}
                              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className={`text-[11px] font-mono flex items-center gap-1 ${
                                      isOverdue
                                        ? "text-rose-600 dark:text-rose-400 font-semibold"
                                        : "text-zinc-500 dark:text-zinc-400"
                                    }`}
                                  >
                                    <span>📅</span>
                                    <span>{t.dueDate || "Không hạn"}</span>
                                  </span>
                                  {t.checklist && t.checklist.length > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                                      ✓ {t.checklist.filter((c) => c.completed).length}/{t.checklist.length}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                                  {t.assigneeAvatar ? (
                                    <img
                                      src={t.assigneeAvatar}
                                      alt={t.assigneeName}
                                      className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                      {t.assigneeName.slice(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[90px]">
                                    {t.assigneeName}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Nút lùi/tiến giữa các cột */}
                    <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                      {prevCol ? (
                        <button
                          type="button"
                          onClick={() => setMobileBoardCol(prevCol)}
                          className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                        >
                          <span>←</span>
                          <span>{statusConfig[prevCol].label}</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      {nextCol ? (
                        <button
                          type="button"
                          onClick={() => setMobileBoardCol(nextCol)}
                          className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer ml-auto"
                        >
                          <span>{statusConfig[nextCol].label}</span>
                          <span>→</span>
                        </button>
                      ) : (
                        <div />
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Khi chọn "Tất cả": Hiển thị cả 4 cột dạng Accordion nhóm gọn gàng */
              <div className="space-y-2.5">
                {(["todo", "in_progress", "review", "completed"] as TaskStatus[]).map((colStatus) => {
                  const colTasks = tasks.filter((t) => t.status === colStatus);
                  const conf = statusConfig[colStatus];
                  const isExpanded = mobileExpandedCols[colStatus] ?? true;

                  return (
                    <div
                      key={colStatus}
                      className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 overflow-hidden shadow-2xs"
                    >
                      {/* Tiêu đề nhóm Accordion */}
                      <button
                        type="button"
                        onClick={() => toggleMobileCol(colStatus)}
                        className="w-full p-3 flex items-center justify-between bg-white dark:bg-zinc-900 text-left cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${conf.dotClass}`} />
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {conf.label}
                          </span>
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {colTasks.length}
                          </span>
                        </div>
                        <span className="text-zinc-400 text-xs font-mono">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </button>

                      {/* Nội dung danh sách thẻ khi mở */}
                      {isExpanded && (
                        <div className="p-2.5 space-y-2.5 border-t border-zinc-100 dark:border-zinc-800">
                          {colTasks.length === 0 ? (
                            <div className="py-3 text-center text-xs text-zinc-400 font-medium">
                              Chưa có công việc ở mục này
                            </div>
                          ) : (
                            colTasks.map((t) => {
                              const pBadge = priorityConfig[t.priority] || priorityConfig.medium;
                              const isOverdue =
                                Boolean(t.dueDate) &&
                                t.status !== "completed" &&
                                new Date(t.dueDate!).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

                              return (
                                <div
                                  key={t.id}
                                  onClick={() => setSelectedTaskDetail(t)}
                                  className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs active:scale-[0.99] transition cursor-pointer space-y-2.5"
                                >
                                  {/* Hàng 1 */}
                                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pBadge.class}`}>
                                        {pBadge.label}
                                      </span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 truncate max-w-[130px]">
                                        🏢 {t.department}
                                      </span>
                                    </div>
                                    {isOverdue && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900 animate-pulse">
                                        ⚠️ Quá hạn
                                      </span>
                                    )}
                                  </div>

                                  {/* Hàng 2: Tiêu đề */}
                                  <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                                    {t.title}
                                  </h4>

                                  {/* Hàng 3: Tiến độ */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                                      <span>Tiến độ</span>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t.progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          t.progress === 100
                                            ? "bg-emerald-500"
                                            : t.progress > 50
                                              ? "bg-blue-600"
                                              : "bg-amber-500"
                                        }`}
                                        style={{ width: `${t.progress}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Hàng 4: Hạn chót & Người thực hiện */}
                                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className={`text-[11px] font-mono flex items-center gap-1 ${
                                          isOverdue
                                            ? "text-rose-600 dark:text-rose-400 font-semibold"
                                            : "text-zinc-500 dark:text-zinc-400"
                                        }`}
                                      >
                                        <span>📅</span>
                                        <span>{t.dueDate || "Không hạn"}</span>
                                      </span>
                                      {t.checklist && t.checklist.length > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                                          ✓ {t.checklist.filter((c) => c.completed).length}/{t.checklist.length}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                                      {t.assigneeAvatar ? (
                                        <img
                                          src={t.assigneeAvatar}
                                          alt={t.assigneeName}
                                          className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700"
                                        />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                          {t.assigneeName.slice(0, 1).toUpperCase()}
                                        </div>
                                      )}
                                      <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[90px]">
                                        {t.assigneeName}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================
              A2. DESKTOP KANBAN VIEW (>= md): Giữ nguyên 100% 4 cột Grid gốc
             ======================================================== */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {(["todo", "in_progress", "review", "completed"] as TaskStatus[]).map((colStatus) => {
              const colTasks = tasks.filter((t) => t.status === colStatus);
              const conf = statusConfig[colStatus];

              return (
                <div
                  key={colStatus}
                  id={`kanban-col-${colStatus}`}
                  className="bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3 sm:p-3.5 flex flex-col min-h-[500px]"
                >
                  {/* Cột Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${conf.dotClass}`} />
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {conf.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shadow-2xs">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Thẻ Card List */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.length === 0 ? (
                      <div className="h-32 flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-[11px] text-zinc-400">
                        Chưa có việc ở mục này
                      </div>
                    ) : (
                      colTasks.map((t) => {
                        const pBadge = priorityConfig[t.priority] || priorityConfig.medium;

                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTaskDetail(t)}
                            className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition shadow-2xs cursor-pointer space-y-2.5 group"
                          >
                            {/* Badges */}
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${pBadge.class}`}>
                                {pBadge.label}
                              </span>
                              <span className="text-[10px] font-medium text-zinc-400 truncate max-w-[120px]">
                                {t.department}
                              </span>
                            </div>

                            {/* Tiêu đề */}
                            <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                              {t.title}
                            </h4>

                            {/* Tiến độ bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                                <span>Tiến độ:</span>
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t.progress}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${t.progress === 100
                                    ? "bg-emerald-500"
                                    : t.progress > 50
                                      ? "bg-blue-600"
                                      : "bg-amber-500"
                                    }`}
                                  style={{ width: `${t.progress}%` }}
                                />
                              </div>
                            </div>

                            {/* Hàng dưới: Hạn chót & Avatar người nhận/người giao */}
                            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                              {/* Hạn chót */}
                              <span className="text-[10px] text-zinc-400 font-mono truncate">
                                {t.dueDate ? `📅 ${t.dueDate}` : "Không có hạn"}
                              </span>

                              {/* Avatars */}
                              <div className="flex items-center -space-x-1.5">
                                {/* Người giao việc */}
                                {t.creatorAvatar ? (
                                  <img
                                    src={t.creatorAvatar}
                                    alt={t.creatorName}
                                    title={`Giao bởi: ${t.creatorName}`}
                                    className="w-5 h-5 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900 shrink-0"
                                  />
                                ) : (
                                  <div
                                    title={`Giao bởi: ${t.creatorName}`}
                                    className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-zinc-900 shrink-0"
                                  >
                                    {t.creatorName.slice(0, 1).toUpperCase()}
                                  </div>
                                )}

                                {/* Người nhận việc */}
                                {t.assigneeAvatar ? (
                                  <img
                                    src={t.assigneeAvatar}
                                    alt={t.assigneeName}
                                    title={`Người làm: ${t.assigneeName}`}
                                    className="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900 shrink-0 shadow-2xs"
                                  />
                                ) : (
                                  <div
                                    title={`Người làm: ${t.assigneeName}`}
                                    className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-zinc-900 shrink-0 shadow-2xs"
                                  >
                                    {t.assigneeName.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================
           B. DẠNG BẢNG TABLE VIEW
           ======================================================== */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          {/* 1. MOBILE VIEW (< md): Danh sách dạng thẻ gọn gàng vừa khít 100% màn hình */}
          <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {paginatedTasks.map((task) => {
              const sBadge = statusConfig[task.status] || statusConfig.todo;
              const pBadge = priorityConfig[task.priority] || priorityConfig.medium;

              return (
                <div
                  key={task.id}
                  className="p-3.5 space-y-2.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Hàng 1: Tiêu đề & Trạng thái */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => setSelectedTaskDetail(task)}
                      className="font-bold text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer min-w-0 flex-1"
                      title={task.title}
                    >
                      <div className="line-clamp-2 leading-snug">{task.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-zinc-500 dark:text-zinc-400">
                          🏢 {task.department}
                        </span>
                        {task.checklist && task.checklist.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                            ✓ {task.checklist.filter((c) => c.completed).length}/{task.checklist.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${sBadge.badgeClass}`}>
                      {sBadge.label}
                    </span>
                  </div>

                  {/* Hàng 2: Người thực hiện & Mức ưu tiên */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {task.assigneeAvatar ? (
                        <img
                          src={task.assigneeAvatar}
                          alt={task.assigneeName}
                          className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                          {task.assigneeName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 truncate">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate block">
                          {task.assigneeName}
                        </span>
                      </div>
                    </div>

                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${pBadge.class}`}>
                      {pBadge.label}
                    </span>
                  </div>

                  {/* Hàng 3: Tiến độ & Hạn chót & Nút chi tiết */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-16 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                        <div
                          className={`h-full rounded-full ${
                            task.progress === 100
                              ? "bg-emerald-500"
                              : task.progress > 50
                              ? "bg-blue-600"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-semibold text-zinc-500 shrink-0">
                        {task.progress}%
                      </span>
                      {task.dueDate && (
                        <span className="text-[10px] font-mono text-zinc-400 truncate">
                          • Hạn: {task.dueDate}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTaskDetail(task)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition active:scale-95 cursor-pointer shrink-0"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. DESKTOP VIEW (>= md): Bảng 8 cột đầy đủ chuẩn desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 font-semibold">
                <tr>
                  <th className="px-4 py-3.5">Tiêu đề công việc</th>
                  <th className="px-4 py-3.5">Người thực hiện</th>
                  <th className="px-4 py-3.5">Người giao việc</th>
                  <th className="px-4 py-3.5">Mức ưu tiên</th>
                  <th className="px-4 py-3.5">Hạn chót</th>
                  <th className="px-4 py-3.5">Tiến độ</th>
                  <th className="px-4 py-3.5 text-center">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {paginatedTasks.map((task) => {
                  const sBadge = statusConfig[task.status] || statusConfig.todo;
                  const pBadge = priorityConfig[task.priority] || priorityConfig.medium;

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Tiêu đề & Phòng ban */}
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <div
                          onClick={() => setSelectedTaskDetail(task)}
                          className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
                          title={task.title}
                        >
                          {task.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate mt-0.5 flex items-center gap-1.5">
                          <span className="font-medium text-zinc-500 dark:text-zinc-400">
                            🏢 {task.department}
                          </span>
                          {task.checklist && task.checklist.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              ✓ {task.checklist.filter((c) => c.completed).length}/{task.checklist.length}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Người thực hiện (HIỂN THỊ AVATAR ĐẦY ĐỦ) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {task.assigneeAvatar ? (
                            <img
                              src={task.assigneeAvatar}
                              alt={task.assigneeName}
                              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                              {task.assigneeName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1 truncate">
                              <span>{task.assigneeName}</span>
                              {task.assigneeCode && (
                                <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  {task.assigneeCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">
                              {task.assigneeEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Người giao việc (HIỂN THỊ AVATAR ĐẦY ĐỦ) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {task.creatorAvatar ? (
                            <img
                              src={task.creatorAvatar}
                              alt={task.creatorName}
                              className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-amber-400/50"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-amber-200">
                              {task.creatorName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                              {task.creatorName}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">
                              {task.creatorRole === "admin"
                                ? "Admin"
                                : task.creatorRole === "director"
                                  ? "Giám đốc"
                                  : task.creatorRole === "manager"
                                    ? "Trưởng phòng"
                                    : "Nhân viên"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mức ưu tiên */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${pBadge.class}`}>
                          {pBadge.label}
                        </span>
                      </td>

                      {/* Hạn chót */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono">
                        {task.dueDate ? (
                          <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                            {task.dueDate}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Tiến độ */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <div className="w-16 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${task.progress === 100
                                ? "bg-emerald-500"
                                : task.progress > 50
                                  ? "bg-blue-600"
                                  : "bg-amber-500"
                                }`}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                            {task.progress}%
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${sBadge.badgeClass}`}>
                          {sBadge.label}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTaskDetail(task)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ========================================================
              KHỐI PHÂN TRANG (PAGINATION) - Đúng 10 bản ghi mới nhất mỗi trang
             ======================================================== */}
          <div className="p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Thông tin số lượng hiển thị */}
            <div className="text-zinc-500 dark:text-zinc-400 font-mono text-center sm:text-left">
              {totalRecords > 0 ? (
                <>
                  Hiển thị{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {(safePage - 1) * pageSize + 1}
                  </strong>{" "}
                  -{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {Math.min(safePage * pageSize, totalRecords)}
                  </strong>{" "}
                  trong tổng số{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">{totalRecords}</strong> công việc
                  {totalPages > 1 && ` (Trang ${safePage}/${totalPages})`}
                </>
              ) : (
                <span>0 công việc</span>
              )}
            </div>

            {/* Nút điều hướng trang */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* Về trang đầu (Desktop only) */}
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="hidden sm:inline-flex p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Về trang đầu"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>

                {/* Trang trước */}
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
                  title="Trang trước"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Mobile: Hiển thị gọn Trang X / Y */}
                <span className="sm:hidden px-2.5 py-1 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                  {safePage} / {totalPages}
                </span>

                {/* Desktop: Danh sách các số trang đầy đủ */}
                <div className="hidden sm:flex items-center gap-1">
                  {paginationItems.map((item, idx) => {
                    if (item === "...") {
                      return (
                        <span key={`dots-${idx}`} className="px-2 py-1 text-zinc-400 font-mono select-none">
                          …
                        </span>
                      );
                    }

                    const isCurrent = item === safePage;
                    return (
                      <button
                        key={`page-${item}`}
                        type="button"
                        onClick={() => setCurrentPage(item as number)}
                        className={`min-w-7 h-7 px-2 rounded-md font-mono text-xs font-semibold transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                            : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                {/* Trang sau */}
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
                  title="Trang sau"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Đến trang cuối (Desktop only) */}
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="hidden sm:inline-flex p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Đến trang cuối"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          5. MODALS (TẠO MỚI & CHI TIẾT)
         ======================================================== */}
      {isCreateModalOpen && (
        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          currentUser={user}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {selectedTaskDetail && (
        <TaskDetailModal
          isOpen={Boolean(selectedTaskDetail)}
          onClose={() => setSelectedTaskDetail(null)}
          task={selectedTaskDetail}
          currentUser={user}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      )}
    </div>
  );
}

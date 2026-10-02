"use client";

import React, { useState, useMemo, useEffect } from "react";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { UserRole } from "@/types";

export interface EmployeeAttendanceItem {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarUrl?: string;
  phone?: string;
  status: "on_time" | "late" | "absent";
  checkInTime?: string;
  checkOutTime?: string;
  workDurationMinutes?: number;
  checkInIp?: string;
  note?: string;
}

interface EmployeeAttendanceTableProps {
  employees: EmployeeAttendanceItem[];
}

export function EmployeeAttendanceTable({ employees }: EmployeeAttendanceTableProps) {
  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("code_asc");

  // Phân trang: Mặc định đúng 10 bản ghi mỗi trang theo yêu cầu
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Danh sách các phòng ban duy nhất
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Danh sách các vai trò duy nhất có trong dữ liệu
  const roles = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.role) set.add(e.role);
    });
    return Array.from(set);
  }, [employees]);

  // Bộ lọc tìm kiếm, vai trò, phòng ban, trạng thái và sắp xếp
  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter((emp) => {
      // 1. Lọc theo trạng thái
      if (selectedStatus === "present" && emp.status === "absent") return false;
      if (selectedStatus === "on_time" && emp.status !== "on_time") return false;
      if (selectedStatus === "late" && emp.status !== "late") return false;
      if (selectedStatus === "absent" && emp.status !== "absent") return false;

      // 2. Lọc theo phòng ban
      if (selectedDept !== "all" && emp.department !== selectedDept) return false;

      // 3. Lọc theo vai trò (Chức vụ)
      if (selectedRole !== "all" && emp.role !== selectedRole) return false;

      // 4. Lọc theo từ khóa tìm kiếm (Tên, Mã NV, Email, SĐT, Phòng ban)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = emp.name?.toLowerCase().includes(q);
        const matchCode = emp.employeeCode?.toLowerCase().includes(q);
        const matchEmail = emp.email?.toLowerCase().includes(q);
        const matchDept = emp.department?.toLowerCase().includes(q);
        const matchPhone = emp.phone?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchEmail && !matchDept && !matchPhone) {
          return false;
        }
      }

      return true;
    });

    // Sắp xếp
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name, "vi");
        case "name_desc":
          return b.name.localeCompare(a.name, "vi");
        case "time_asc": {
          if (!a.checkInTime) return 1;
          if (!b.checkInTime) return -1;
          return a.checkInTime.localeCompare(b.checkInTime);
        }
        case "duration_desc": {
          const durA = a.workDurationMinutes || 0;
          const durB = b.workDurationMinutes || 0;
          return durB - durA;
        }
        case "code_asc":
        default:
          return (a.employeeCode || "").localeCompare(b.employeeCode || "");
      }
    });

    return filtered;
  }, [employees, selectedStatus, selectedDept, selectedRole, searchQuery, sortBy]);

  // Tự động reset về trang 1 khi thay đổi bất kỳ tiêu chí lọc nào
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedDept, selectedRole, sortBy]);

  // Tính toán phân trang: Chỉ hiển thị 10 bản ghi ở trang hiện tại
  const totalRecords = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(startIndex, startIndex + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

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

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // Đặt lại tất cả các bộ lọc
  const handleResetAllFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    setSelectedDept("all");
    setSelectedRole("all");
    setSortBy("code_asc");
    setCurrentPage(1);
  };

  // Kiểm tra có bộ lọc nào đang kích hoạt hay không
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedStatus !== "all" ||
    selectedDept !== "all" ||
    selectedRole !== "all" ||
    sortBy !== "code_asc"
  );

  // Đếm nhanh các trạng thái
  const countPresent = employees.filter((e) => e.status !== "absent").length;
  const countOnTime = employees.filter((e) => e.status === "on_time").length;
  const countLate = employees.filter((e) => e.status === "late").length;
  const countAbsent = employees.filter((e) => e.status === "absent").length;

  const formatTime = (isoString?: string) => {
    if (!isoString) return "—";
    try {
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
      return match ? `${match[1]}:${match[2]}` : isoString.slice(11, 16);
    } catch {
      return "—";
    }
  };

  const roleBadges: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    director: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    manager: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    employee: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
      {/* 1. Header Khối và Thông tin tổng quan */}
      <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white dark:bg-zinc-900">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>👥</span>
              <span>Dữ Liệu & Điểm Danh Nhân Viên</span>
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Danh sách nhân sự, chức vụ, phòng ban và tình trạng chấm công ngày hôm nay (10 bản ghi/trang)
          </p>
        </div>

        {/* Nút Xóa nhanh bộ lọc nếu đang lọc */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetAllFilters}
            className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      {/* 2. Thanh Công Cụ Bộ Lọc Đa Chiều: Tìm kiếm, Phòng ban, Vai trò, Sắp xếp */}
      {/* 2. Thanh Công Cụ Bộ Lọc Đa Chiều: Tìm kiếm, Phòng ban, Vai trò, Sắp xếp */}
      <div className="p-3 sm:p-4 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-3 text-xs">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 w-full xl:w-auto">
          {/* Ô nhập tìm kiếm (Tên, Mã NV, Email, SĐT) */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã NV, email..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Nhóm 3 dropdown lọc */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            {/* Lọc theo Phòng Ban */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs shrink-0 font-medium hidden sm:inline">Phòng ban:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                aria-label="Lọc theo phòng ban"
                className="w-full sm:w-auto px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer sm:max-w-[180px] truncate"
              >
                <option value="all">Tất cả phòng ban ({employees.length})</option>
                {departments.map((dept) => {
                  const count = employees.filter((e) => e.department === dept).length;
                  return (
                    <option key={dept} value={dept}>
                      {dept} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Lọc theo Vai Trò */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs shrink-0 font-medium hidden sm:inline">Chức vụ:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                aria-label="Lọc theo vai trò"
                className="w-full sm:w-auto px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
              >
                <option value="all">Tất cả chức vụ</option>
                {roles.map((r) => {
                  const label = USER_ROLE_LABELS[r as UserRole] || r;
                  const count = employees.filter((e) => e.role === r).length;
                  return (
                    <option key={r} value={r}>
                      {label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Sắp xếp danh sách */}
            <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs shrink-0 font-medium hidden sm:inline">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sắp xếp danh sách"
                className="w-full sm:w-auto px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
              >
                <option value="code_asc">Mã NV (A-Z)</option>
                <option value="name_asc">Họ tên (A-Z)</option>
                <option value="name_desc">Họ tên (Z-A)</option>
                <option value="time_asc">Check-in sớm nhất</option>
                <option value="duration_desc">Thời lượng nhiều nhất</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bộ Lọc Tab Trạng Thái Nhanh */}
      <div className="px-4 sm:px-5 py-2.5 bg-zinc-50/60 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto text-xs">
        {[
          { key: "all", label: "Tất cả", count: employees.length },
          { key: "present", label: "Đã đi làm", count: countPresent },
          { key: "on_time", label: "Đúng giờ", count: countOnTime },
          { key: "late", label: "Đi muộn", count: countLate },
          { key: "absent", label: "Nghỉ / Vắng", count: countAbsent },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedStatus(tab.key)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${selectedStatus === tab.key
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs font-semibold"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-800"
              }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${selectedStatus === tab.key
                ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900 font-bold"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ========================================================
          4. BẢNG MÀN HÌNH PC / DESKTOP (Chỉ hiển thị 10 bản ghi/trang)
         ======================================================== */}
      <div className="hidden md:block overflow-x-auto">
        {paginatedEmployees.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-lg">
              🔍
            </div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">Không tìm thấy nhân viên nào phù hợp với bộ lọc.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 font-semibold">
              <tr>
                <th className="px-4 py-3">Nhân sự</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Phòng ban</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Giờ vào</th>
                <th className="px-4 py-3 text-center">Giờ ra</th>
                <th className="px-4 py-3 text-center">Thời lượng</th>
                <th className="px-4 py-3 text-right">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedEmployees.map((emp) => {
                const roleLabel = USER_ROLE_LABELS[emp.role as UserRole] || emp.role;
                const isLate = emp.status === "late";
                const isOnTime = emp.status === "on_time";
                const isAbsent = emp.status === "absent";

                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Nhân sự: Avatar + Tên + Mã NV + Email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {emp.avatarUrl ? (
                          <img
                            src={emp.avatarUrl}
                            alt={emp.name}
                            className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {emp.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                            <span>{emp.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold shrink-0">
                              {emp.employeeCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {emp.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Vai trò */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${roleBadges[emp.role] || "bg-zinc-100 text-zinc-700"
                          }`}
                      >
                        {roleLabel}
                      </span>
                    </td>

                    {/* Phòng ban */}
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      <span className="truncate block max-w-[180px]" title={emp.department}>
                        {emp.department || "—"}
                      </span>
                    </td>

                    {/* Trạng thái hôm nay */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {isOnTime ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Đúng giờ
                        </span>
                      ) : isLate ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Đi muộn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Nghỉ / Vắng
                        </span>
                      )}
                    </td>

                    {/* Giờ vào */}
                    <td className="px-4 py-3 text-center font-mono font-bold">
                      {isAbsent ? (
                        <span className="text-zinc-300 dark:text-zinc-600">—</span>
                      ) : (
                        <span className={isLate ? "text-amber-700 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}>
                          {formatTime(emp.checkInTime)}
                        </span>
                      )}
                    </td>

                    {/* Giờ ra */}
                    <td className="px-4 py-3 text-center font-mono text-zinc-600 dark:text-zinc-400">
                      {formatTime(emp.checkOutTime)}
                    </td>

                    {/* Thời lượng làm việc */}
                    <td className="px-4 py-3 text-center font-mono">
                      {emp.workDurationMinutes ? (
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {Math.floor(emp.workDurationMinutes / 60)}h {emp.workDurationMinutes % 60}m
                        </span>
                      ) : isAbsent ? (
                        <span className="text-zinc-300 dark:text-zinc-600">—</span>
                      ) : (
                        <span className="text-zinc-400 italic text-[11px]">Đang làm việc</span>
                      )}
                    </td>

                    {/* Ghi chú */}
                    <td className="px-4 py-3 text-right text-zinc-500 dark:text-zinc-400 text-[11px] italic max-w-[160px] truncate">
                      {emp.note || (isAbsent ? "Chưa chấm công" : "—")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================
          5. THẺ DANH SÁCH MÀN HÌNH MOBILE (Chỉ hiển thị 10 bản ghi/trang)
         ======================================================== */}
      <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
        {paginatedEmployees.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            <p className="font-medium text-zinc-600 dark:text-zinc-400">Không tìm thấy nhân viên nào phù hợp.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        ) : (
          paginatedEmployees.map((emp) => {
            const roleLabel = USER_ROLE_LABELS[emp.role as UserRole] || emp.role;
            const isLate = emp.status === "late";
            const isOnTime = emp.status === "on_time";
            const isAbsent = emp.status === "absent";

            return (
              <div key={emp.id} className="p-3.5 space-y-2.5">
                {/* Header card: Avatar + Tên + Badge Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {emp.avatarUrl ? (
                      <img
                        src={emp.avatarUrl}
                        alt={emp.name}
                        className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                        {emp.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5 truncate">
                        <span>{emp.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {emp.employeeCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {emp.department || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Trạng thái hôm nay */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${isOnTime
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : isLate
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                  >
                    {isOnTime ? "Đúng giờ" : isLate ? "Đi muộn" : "Nghỉ"}
                  </span>
                </div>

                {/* Giờ vào & Giờ ra */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-950/60 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-sans">Giờ vào:</span>
                    <strong
                      className={
                        isLate
                          ? "text-amber-700 dark:text-amber-400 text-xs"
                          : "text-zinc-900 dark:text-zinc-100 text-xs"
                      }
                    >
                      {formatTime(emp.checkInTime)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-sans">Giờ ra:</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 text-xs">
                      {formatTime(emp.checkOutTime)}
                    </strong>
                  </div>
                </div>

                {/* Footer card: Role & Ghi chú */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${roleBadges[emp.role] || ""}`}>
                    {roleLabel}
                  </span>
                  {emp.note && <span className="italic truncate max-w-[180px]">{emp.note}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================
          6. KHỐI PHÂN TRANG (PAGINATION) - Đúng 10 bản ghi/trang
         ======================================================== */}
      <div className="p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Thông tin số lượng hiển thị */}
        <div className="text-zinc-500 dark:text-zinc-400 font-mono text-center sm:text-left">
          {totalRecords > 0 ? (
            <>
              Hiển thị{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">
                {(currentPage - 1) * pageSize + 1}
              </strong>{" "}
              -{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">
                {Math.min(currentPage * pageSize, totalRecords)}
              </strong>{" "}
              trong tổng số{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">{totalRecords}</strong> nhân viên
            </>
          ) : (
            <span>0 nhân viên</span>
          )}
        </div>

        {/* Nút điều hướng trang */}
        {totalPages > 1 && (
          <>
            {/* Desktop Pagination (hidden sm:flex) */}
            <div className="hidden sm:flex items-center gap-1">
              {/* Nút Về Trang Đầu */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(1)}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Về trang đầu"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {/* Nút Trang Trước */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Trang trước"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Các số trang */}
              {paginationItems.map((item, idx) => {
                if (item === "...") {
                  return (
                    <span
                      key={`dots-${idx}`}
                      className="px-2 py-1 text-zinc-400 font-mono select-none"
                    >
                      …
                    </span>
                  );
                }

                const pageNum = item as number;
                const isActive = pageNum === currentPage;

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-8 h-8 px-2 rounded-md font-mono text-xs font-semibold transition-colors cursor-pointer ${isActive
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                      : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Nút Trang Sau */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Trang kế tiếp"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Nút Đến Trang Cuối */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Trang cuối"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Mobile Compact Pagination (sm:hidden) */}
            <div className="sm:hidden flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 text-xs font-semibold"
              >
                ← Trước
              </button>
              <span className="text-xs font-mono font-bold px-1.5 text-zinc-700 dark:text-zinc-300">
                {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 text-xs font-semibold"
              >
                Sau →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

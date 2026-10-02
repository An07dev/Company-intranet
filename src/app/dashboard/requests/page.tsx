"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LeaveOtRequest, RequestStatsSummary } from "@/types";
import { LoadingSection } from "@/components/ui/Loading";
import { CreateLeaveModal } from "@/components/requests/CreateLeaveModal";
import { CreateOtModal } from "@/components/requests/CreateOtModal";
import { ReviewRequestModal } from "@/components/requests/ReviewRequestModal";

export default function RequestsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Bộ lọc & Tìm kiếm & Sắp xếp
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Phân trang: Đúng 10 bản ghi mỗi trang theo yêu cầu
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const [requestsList, setRequestsList] = useState<LeaveOtRequest[]>([]);
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [stats, setStats] = useState<RequestStatsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isOtModalOpen, setIsOtModalOpen] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<LeaveOtRequest | null>(null);

  // Điều hướng nếu chưa đăng nhập
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  const isDirectorOrAdmin =
    user?.role === "director" || user?.role === "admin";
  const isManager = user?.role === "manager";
  const isExecutive = isDirectorOrAdmin || isManager;

  // Scope: Với Giám đốc/Admin thì luôn mặc định và cố định là "manage" (Xét duyệt toàn đơn vị)
  const [scope, setScope] = useState<"my" | "manage">("manage");

  // Đồng bộ scope dựa theo vai trò người dùng (Giám đốc luôn ở scope manage)
  useEffect(() => {
    if (user) {
      if (user.role === "director" || user.role === "admin") {
        setScope("manage");
      } else {
        setScope("my");
      }
    }
  }, [user]);

  // Danh sách các phòng ban hiển thị cho bộ lọc:
  // Lấy danh mục phòng ban chính thức từ Quản Lý Phòng Ban & Nhân Sự (/api/departments),
  // đồng thời bổ sung các phòng ban khác có trong dữ liệu đơn (ví dụ: "Khác") nếu có.
  const departmentOptions = useMemo(() => {
    const officialNames = departmentsList.map((d) => d.name);
    const extraNames: string[] = [];
    requestsList.forEach((req) => {
      if (
        req.department &&
        !officialNames.includes(req.department) &&
        !extraNames.includes(req.department)
      ) {
        extraNames.push(req.department);
      }
    });
    return [...officialNames, ...extraNames];
  }, [departmentsList, requestsList]);

  // Đếm số lượng theo loại đơn cho các Tab
  const typeCounts = useMemo(() => {
    const counts = { all: requestsList.length, leave: 0, overtime: 0 };
    requestsList.forEach((r) => {
      if (r.type === "leave") counts.leave++;
      if (r.type === "overtime") counts.overtime++;
    });
    return counts;
  }, [requestsList]);

  // Bộ lọc đa tiêu chí & Sắp xếp linh hoạt
  const filteredRequests = useMemo(() => {
    const list = requestsList.filter((req) => {
      // 1. Lọc theo loại đơn
      if (typeFilter !== "all" && req.type !== typeFilter) return false;

      // 2. Lọc theo trạng thái
      if (statusFilter !== "all" && req.status !== statusFilter) return false;

      // 3. Lọc theo phòng ban
      if (selectedDept !== "all" && req.department !== selectedDept) return false;

      // 4. Tìm kiếm từ khóa (Tên, Mã NV, Email, Dự án, Lý do, Phòng ban, Người duyệt)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = req.userName?.toLowerCase().includes(q);
        const matchCode = req.employeeCode?.toLowerCase().includes(q);
        const matchEmail = req.userEmail?.toLowerCase().includes(q);
        const matchDept = req.department?.toLowerCase().includes(q);
        const matchReason = req.reason?.toLowerCase().includes(q);
        const matchProject = req.projectOrTask?.toLowerCase().includes(q);
        const matchApprover = req.approverName?.toLowerCase().includes(q);

        if (!matchName && !matchCode && !matchEmail && !matchDept && !matchReason && !matchProject && !matchApprover) {
          return false;
        }
      }

      return true;
    });

    // Sắp xếp
    list.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name_asc":
          return (a.userName || "").localeCompare(b.userName || "", "vi");
        case "duration_desc": {
          const durA = a.type === "leave" ? (a.durationDays || 0) * 8 : (a.durationHours || 0);
          const durB = b.type === "leave" ? (b.durationDays || 0) * 8 : (b.durationHours || 0);
          return durB - durA;
        }
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }, [requestsList, typeFilter, statusFilter, selectedDept, searchQuery, sortBy]);

  // Tự động reset về trang 1 khi thay đổi bất kỳ tiêu chí lọc hay tìm kiếm nào
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, selectedDept, sortBy, searchQuery]);

  // Kiểm tra xem có đang kích hoạt bộ lọc nào không
  const hasActiveFilters =
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    selectedDept !== "all" ||
    sortBy !== "newest" ||
    searchQuery.trim().length > 0;

  // Xóa toàn bộ bộ lọc
  const handleResetAllFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSelectedDept("all");
    setSortBy("newest");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Tính toán phân trang: Chỉ hiển thị 10 bản ghi mỗi trang
  const totalRecords = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRequests.slice(startIndex, startIndex + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

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

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("scope", scope);
      params.set("limit", "500");

      const res = await fetch(`/api/requests?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRequestsList(json.data.items || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách đơn:", err);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  // Tải thống kê phép năm & giờ OT
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/stats?scope=${scope}`);
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải thống kê đơn:", err);
    }
  }, [scope]);

  // Tải danh sách phòng ban chính thức từ Quản Lý Phòng Ban & Nhân Sự
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDepartmentsList(
          json.data.map((d: { id: string; name: string; code?: string }) => ({
            id: d.id,
            name: d.name,
            code: d.code,
          }))
        );
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách phòng ban:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchStats();
      fetchDepartments();
    }
  }, [user, fetchRequests, fetchStats, fetchDepartments]);

  // Xử lý tự hủy đơn
  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn yêu cầu này?")) return;
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await res.json();
      if (json.success) {
        fetchRequests();
        fetchStats();
      } else {
        alert(json.error || json.message || "Hủy đơn thất bại");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const leaveTypeLabels: Record<string, string> = {
    annual: "Nghỉ phép năm",
    sick: "Nghỉ ốm đau",
    unpaid: "Nghỉ không lương",
    remote_wfh: "Làm việc từ xa (WFH)",
    bereavement_marriage: "Việc riêng (Hiếu, hỷ)",
    maternity_paternity: "Nghỉ thai sản",
  };

  const otTypeLabels: Record<string, string> = {
    weekday: "Ngày thường (150%)",
    weekend: "Cuối tuần (200%)",
    holiday: "Ngày lễ / Tết (300%)",
  };

  const statusBadges: Record<string, { label: string; class: string }> = {
    pending: {
      label: "Chờ Giám đốc duyệt",
      class: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    },
    approved: {
      label: "Giám đốc đã duyệt",
      class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    },
    rejected: {
      label: "Giám đốc từ chối",
      class: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900",
    },
    cancelled: {
      label: "Đã hủy",
      class: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700",
    },
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSection text="Đang tải dữ liệu đơn nghỉ phép & OT..." size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* =========================================================================
          1. HEADER TRANG & NÚT TẠO ĐƠN
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Nghỉ Phép &amp; Làm Thêm Giờ (OT)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gửi đơn xin nghỉ phép, đăng ký làm thêm ngoài giờ và theo dõi quy trình xét duyệt trực tuyến.
          </p>
        </div>

        {/* Nút Tạo đơn */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsLeaveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <span>🏖️</span>
            <span>Xin Nghỉ Phép</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOtModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <span>⚡</span>
            <span>Đăng Ký OT</span>
          </button>
        </div>
      </div>


      {/* =========================================================================
          2. HÀNG 4 THẺ CHỈ SỐ KPI TÓM TẮT
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Thẻ 1: Đối với Giám đốc: Tổng đơn toàn đơn vị. Đối với nhân sự: Phép năm còn lại */}
        {isDirectorOrAdmin ? (
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Tổng đơn toàn đơn vị
              </span>
              <span className="text-base">📑</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
              {(stats?.pendingCount ?? 0) + (stats?.approvedCount ?? 0) + (stats?.rejectedCount ?? 0)}
              <span className="text-xs text-zinc-400 font-sans font-normal ml-1">đơn</span>
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 truncate">
              Gồm tất cả nghỉ phép &amp; làm thêm OT
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Phép năm còn lại
              </span>
              <span className="text-base">🏖️</span>
            </div>
            {(stats?.contractType === "probation" || user?.contractType === "probation") ? (
              <>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-amber-600 dark:text-amber-400">
                  0 <span className="text-xs text-zinc-400 font-sans font-normal ml-1">/ 0 ngày</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <span>⏳</span>
                  <span>Đang thử việc (Chưa có phép năm)</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                  {stats?.annualLeaveRemaining ?? 0}
                  <span className="text-xs text-zinc-400 font-sans font-normal ml-1">
                    / {stats?.annualLeaveTotal ?? 0} ngày
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    style={{
                      width: `${
                        (stats?.annualLeaveTotal ?? 0) > 0
                          ? Math.round(
                              ((stats?.annualLeaveRemaining ?? 0) / (stats?.annualLeaveTotal ?? 1)) * 100
                            )
                          : 0
                      }%`,
                    }}
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  />
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 flex justify-between">
                  <span>+1 phép/tháng từ lúc chính thức</span>
                  <span>Tối đa: 12 ngày</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Giờ OT được duyệt tháng này */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {isDirectorOrAdmin ? "Tổng giờ OT đã duyệt" : "Giờ OT đã duyệt (Tháng này)"}
            </span>
            <span className="text-base">⚡</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-blue-600 dark:text-blue-400">
            {stats?.approvedOtHoursThisMonth ?? 0}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">giờ</span>
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 truncate">
            {isDirectorOrAdmin ? "Đã duyệt trong tháng này" : "Được tính hệ số theo quy định lương"}
          </div>
        </div>

        {/* Đơn đang chờ Giám đốc duyệt */}
        <div className={`p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border shadow-xs transition-all ${(stats?.pendingCount ?? 0) > 0 && isDirectorOrAdmin
          ? "border-amber-400/80 dark:border-amber-600 ring-1 ring-amber-400/30 bg-amber-50/10"
          : "border-zinc-200 dark:border-zinc-800"
          }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Chờ Giám đốc duyệt
            </span>
            <span className="text-base">⏳</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-amber-600 dark:text-amber-400">
            {stats?.pendingCount ?? 0}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">đơn</span>
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 truncate">
            {isDirectorOrAdmin ? "Cần Giám đốc xem xét duyệt ngay" : "Đang chờ Giám đốc phê duyệt"}
          </div>
        </div>

        {/* Đơn đã được phê duyệt */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Đơn đã được phê duyệt
            </span>
            <span className="text-base">✅</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {stats?.approvedCount ?? 0}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">đơn</span>
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 truncate">
            {stats?.rejectedCount ? `Có ${stats.rejectedCount} đơn bị từ chối` : "Không có đơn bị từ chối"}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. KHUNG DANH SÁCH & BỘ LỌC ĐƠN YÊU CẦU
         ========================================================================= */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        {/* Thanh tiêu đề trực tiếp cho Giám đốc (Bỏ tab Đơn của tôi) HOẶC Tab chuyển đổi cho Quản lý */}
        {isDirectorOrAdmin ? (
          /* VỚI ROLE GIÁM ĐỐC / ADMIN: BỎ TAB 'ĐƠN CỦA TÔI', HIỂN THỊ TRỰC TIẾP 'XÉT DUYỆT ĐƠN TOÀN ĐƠN VỊ' */
          <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">👑</span>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Xét Duyệt Đơn Toàn Đơn Vị</span>
                  {stats?.pendingCount ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500 text-white font-mono shadow-xs animate-pulse">
                      {stats.pendingCount} đơn chờ duyệt
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                      Tất cả đã được xử lý
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Thẩm quyền phê duyệt trực tiếp của Giám đốc điều hành
                </p>
              </div>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Hiển thị {filteredRequests.length} / {requestsList.length} yêu cầu
            </div>
          </div>
        ) : isManager ? (
          /* VỚI CẤP QUẢN LÝ / TRƯỞNG PHÒNG */
          <div className="px-4 sm:px-5 pt-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScope("my")}
              className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${scope === "my"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
            >
              <span>👤</span>
              <span>Đơn Của Tôi</span>
            </button>
            <button
              type="button"
              onClick={() => setScope("manage")}
              className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${scope === "manage"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
            >
              <span>📋</span>
              <span>Theo Dõi Đơn Toàn Đơn Vị (Chờ GĐ duyệt)</span>
              {stats?.pendingCount ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono">
                  {stats.pendingCount}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}

        {/* Thanh công cụ lọc & Tìm kiếm (Gom gọn gàng trên 1 HÀNG DUY NHẤT) */}
        <div className="p-3 sm:p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto text-xs">
          {/* 1. Tabs phân loại đơn (Tất cả / Nghỉ phép / Làm thêm OT) */}
          <div className="flex items-center gap-1 shrink-0 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60">
            {[
              { key: "all", label: "Tất cả", count: typeCounts.all },
              { key: "leave", label: "🏖️ Nghỉ phép", count: typeCounts.leave },
              { key: "overtime", label: "⚡ Làm thêm (OT)", count: typeCounts.overtime },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTypeFilter(tab.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  typeFilter === tab.key
                    ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    typeFilter === tab.key
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                      : "bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Đường ngăn cách nhẹ */}
          <div className="hidden xl:block h-5 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0 mx-0.5" />

          {/* 2. Lọc theo phòng ban - Ăn khớp 100% với Quản Lý Phòng Ban & Nhân Sự */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setCurrentPage(1);
            }}
            className="w-auto shrink-0 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer font-medium"
          >
            <option value="all">Tất cả phòng ban</option>
            {departmentOptions.map((dept) => {
              const count = requestsList.filter((r) => r.department === dept).length;
              return (
                <option key={dept} value={dept}>
                  {dept} ({count})
                </option>
              );
            })}
          </select>

          {/* 3. Lọc theo trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-auto shrink-0 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ Giám đốc duyệt</option>
            <option value="approved">Giám đốc đã duyệt</option>
            <option value="rejected">Giám đốc từ chối</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          {/* 4. Sắp xếp */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-auto shrink-0 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
          >
            <option value="newest">Ngày nộp: Mới nhất</option>
            <option value="oldest">Ngày nộp: Cũ nhất</option>
            <option value="name_asc">Tên nhân sự: A → Z</option>
            <option value="duration_desc">Thời lượng: Giảm dần</option>
          </select>

          {/* 5. Ô tìm kiếm linh hoạt (co giãn tự nhiên chiếm phần còn lại) */}
          <div className="relative flex-1 min-w-[180px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên, mã NV, phòng ban, lý do..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            <svg
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                title="Xóa từ khóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* 6. Nút Xóa nhanh bộ lọc nếu có lọc */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-colors cursor-pointer whitespace-nowrap"
              title="Đưa về mặc định"
            >
              <span>✕</span>
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        {/* ========================================================
            4. BẢNG MÀN HÌNH PC / DESKTOP (Chỉ hiển thị 10 bản ghi/trang)
           ======================================================== */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <LoadingSection text="Đang tải danh sách đơn từ..." size="md" />
            </div>
          ) : paginatedRequests.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">Không tìm thấy đơn yêu cầu nào phù hợp.</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 font-semibold">
                <tr>
                  <th className="px-4 py-3">Nhân sự nộp đơn</th>
                  <th className="px-4 py-3">Loại đơn</th>
                  <th className="px-4 py-3">Thời gian / Thời lượng</th>
                  <th className="px-4 py-3">Lý do &amp; Dự án</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3">Giám đốc duyệt &amp; Ý kiến</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {paginatedRequests.map((req) => {
                  const isLeave = req.type === "leave";
                  const badge = statusBadges[req.status] || {
                    label: req.status,
                    class: "bg-zinc-100 text-zinc-600",
                  };
                  const isOwner = req.userId === user?.id;

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Nhân sự */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {req.userAvatar ? (
                            <img
                              src={req.userAvatar}
                              alt={req.userName}
                              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                              {req.userName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                              <span>{req.userName}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                {req.employeeCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {req.department}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Loại đơn */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${isLeave
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              }`}
                          >
                            {isLeave ? "🏖️ Nghỉ phép" : "⚡ Làm thêm OT"}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-[150px]">
                          {isLeave
                            ? leaveTypeLabels[req.leaveType || ""] || req.leaveType
                            : otTypeLabels[req.otType || ""] || req.otType}
                        </div>
                      </td>

                      {/* Thời gian / Thời lượng */}
                      <td className="px-4 py-3">
                        {isLeave ? (
                          <div>
                            <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                              {req.startDate}{" "}
                              {req.startDate !== req.endDate ? `→ ${req.endDate}` : ""}
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                              {req.durationDays} ngày
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                              {req.otDate}
                            </div>
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-medium">
                              {req.startTime} - {req.endTime} ({req.durationHours}h)
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Lý do & Dự án */}
                      <td className="px-4 py-3 max-w-[220px]">
                        {req.projectOrTask && (
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate" title={req.projectOrTask}>
                            {req.projectOrTask}
                          </div>
                        )}
                        <div className="text-zinc-500 dark:text-zinc-400 truncate text-[11px]" title={req.reason}>
                          "{req.reason}"
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.class}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Người duyệt & Ý kiến */}
                      <td className="px-4 py-3 max-w-[200px]">
                        {req.approverName ? (
                          <div className="flex items-center gap-2">
                            {req.approverAvatar ? (
                              <img
                                src={req.approverAvatar}
                                alt={req.approverName}
                                className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-amber-400/60"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-amber-300/50">
                                {req.approverName.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1">
                                <span>{req.approverName}</span>
                              </div>
                              {req.approvalNote && (
                                <div className="text-[11px] text-zinc-400 italic truncate" title={req.approvalNote}>
                                  "{req.approvalNote}"
                                </div>
                              )}
                            </div>
                          </div>
                        ) : req.status === "pending" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Chờ Giám đốc duyệt
                          </span>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {/* Nếu ở tab quản lý và đơn đang chờ duyệt -> Nút Xét duyệt */}
                        {scope === "manage" && req.status === "pending" && isExecutive ? (
                          <button
                            type="button"
                            onClick={() => setReviewingRequest(req)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${isDirectorOrAdmin
                              ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                              }`}
                          >
                            {isDirectorOrAdmin ? "👑 Giám đốc duyệt" : "Xem chi tiết"}
                          </button>
                        ) : isOwner && req.status === "pending" ? (
                          /* Nếu là chủ đơn và đơn đang pending -> Nút Hủy đơn */
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(req.id)}
                            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 hover:border-rose-200 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Hủy đơn
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReviewingRequest(req)}
                            className="px-2 py-1 rounded-lg text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            Chi tiết
                          </button>
                        )}
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
          {loading ? (
            <div className="p-8 text-center">
              <LoadingSection text="Đang tải dữ liệu..." size="sm" />
            </div>
          ) : paginatedRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">Không tìm thấy đơn nào.</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          ) : (
            paginatedRequests.map((req) => {
              const isLeave = req.type === "leave";
              const badge = statusBadges[req.status] || {
                label: req.status,
                class: "bg-zinc-100 text-zinc-600",
              };
              const isOwner = req.userId === user?.id;

              return (
                <div key={req.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {req.userAvatar ? (
                        <img
                          src={req.userAvatar}
                          alt={req.userName}
                          className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                          {req.userName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                          <span className="truncate">{req.userName}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 shrink-0">
                            {req.employeeCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                          {isLeave
                            ? `🏖️ Nghỉ phép • ${leaveTypeLabels[req.leaveType || ""] || ""}`
                            : `⚡ Làm thêm OT • ${otTypeLabels[req.otType || ""] || ""}`}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 truncate font-medium">
                          📁 {req.department}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${badge.class}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Thời gian */}
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 font-mono text-xs border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-500 font-sans text-[11px]">Thời gian:</span>
                    <strong className="text-zinc-900 dark:text-zinc-100">
                      {isLeave
                        ? `${req.startDate} (${req.durationDays} ngày)`
                        : `${req.otDate} • ${req.startTime}-${req.endTime} (${req.durationHours}h)`}
                    </strong>
                  </div>

                  {/* Lý do */}
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-300 italic">
                    "{req.reason}"
                  </div>

                  {/* Thao tác mobile */}
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                    </span>

                    {scope === "manage" && req.status === "pending" && isExecutive ? (
                      <button
                        type="button"
                        onClick={() => setReviewingRequest(req)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${isDirectorOrAdmin
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                      >
                        {isDirectorOrAdmin ? "👑 Giám đốc duyệt" : "Xem chi tiết"}
                      </button>
                    ) : isOwner && req.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(req.id)}
                        className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-rose-600 text-xs"
                      >
                        Hủy đơn
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReviewingRequest(req)}
                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        Chi tiết
                      </button>
                    )}
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
                <strong className="text-zinc-900 dark:text-zinc-100">{totalRecords}</strong> đơn
                {totalPages > 1 && ` (Trang ${currentPage}/${totalPages})`}
              </>
            ) : (
              <span>0 đơn yêu cầu</span>
            )}
          </div>

          {/* Nút điều hướng trang */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
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
          )}
        </div>
      </div>

      {/* =========================================================================
          6. CÁC MODAL TƯƠNG TÁC
         ========================================================================= */}
      <CreateLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        remainingLeaveDays={stats?.annualLeaveRemaining ?? 0}
        contractType={stats?.contractType || user?.contractType || "official"}
        onSuccess={() => {
          fetchRequests();
          fetchStats();
        }}
      />

      <CreateOtModal
        isOpen={isOtModalOpen}
        onClose={() => setIsOtModalOpen(false)}
        onSuccess={() => {
          fetchRequests();
          fetchStats();
        }}
      />

      <ReviewRequestModal
        request={reviewingRequest}
        isOpen={Boolean(reviewingRequest)}
        onClose={() => setReviewingRequest(null)}
        onSuccess={() => {
          fetchRequests();
          fetchStats();
        }}
      />
    </div>
  );
}

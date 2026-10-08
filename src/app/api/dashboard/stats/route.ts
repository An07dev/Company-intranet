import { NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import {
  MongoUserModel,
  MongoAttendanceModel,
  MongoTaskModel,
  MongoRequestModel,
} from "@/server/db/schema";
import { ensureUsersSeeded, toSafeUser } from "@/server/models/user.model";
import { ensureAttendanceSeeded, getTodayDateString } from "@/server/models/attendance.model";
import { ensureTasksSeeded } from "@/server/models/task.model";
import { ensureRequestsSeeded } from "@/server/models/request.model";
import { ApiResponse } from "@/types";

export interface DashboardStatsResponse {
  summary: {
    totalEmployees: number;
    presentToday: number;
    onTimeToday: number;
    lateToday: number;
    absentToday: number;
    attendanceRate: number;
    onTimeRate: number;
    avgWorkingHours: number;
  };
  weeklyTrend: Array<{
    date: string;
    label: string;
    weekday: string;
    total: number;
    present: number;
    onTime: number;
    late: number;
    absent: number;
    rate: number;
  }>;
  departmentStats: Array<{
    name: string;
    total: number;
    present: number;
    onTime: number;
    late: number;
    absent: number;
    rate: number;
  }>;
  statusBreakdown: Array<{
    label: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  hourlyDistribution: Array<{
    timeSlot: string;
    count: number;
    percentage: number;
  }>;
  employeeAttendance: Array<{
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
  }>;
  taskStats: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    completed: number;
    overdue: number;
    completionRate: number;
    byDepartment: Array<{
      department: string;
      total: number;
      completed: number;
      inProgress: number;
      overdue: number;
      progressRate: number;
    }>;
  };
  analyticsOtLeave: {
    totalOtHoursMonth: number;
    approvedLeaveDaysMonth: number;
    otByDepartment: Array<{
      department: string;
      hours: number;
    }>;
    leaveByType: Array<{
      type: string;
      label: string;
      days: number;
      color: string;
    }>;
  };
  punctualityLeaderboard: Array<{
    id: string;
    name: string;
    employeeCode: string;
    department: string;
    avatarUrl?: string;
    onTimeCount: number;
    totalCheckins: number;
    punctualityRate: number;
    rank: number;
    badge: string;
  }>;
}

// In-memory cache for Stats (TTL 30 seconds)
let cachedStats: {
  data: DashboardStatsResponse;
  timestamp: number;
} | null = null;
const CACHE_TTL_MS = 30 * 1000;
let isSeededChecked = false;

const WEEKDAY_NAMES = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export async function GET() {
  try {
    const now = Date.now();
    if (cachedStats && now - cachedStats.timestamp < CACHE_TTL_MS) {
      return NextResponse.json<ApiResponse<DashboardStatsResponse>>(
        {
          success: true,
          data: cachedStats.data,
          message: "Tải thống kê dashboard thành công (cache)",
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
          },
        }
      );
    }

    await connectToDatabase();
    if (!isSeededChecked) {
      await ensureUsersSeeded();
      await ensureAttendanceSeeded();
      await ensureTasksSeeded();
      await ensureRequestsSeeded();
      isSeededChecked = true;
    }

    const todayStr = getTodayDateString(0);

    // 1. Lấy danh sách toàn bộ nhân viên active
    const userDocs = await MongoUserModel.find({ status: "active" }).sort({ employeeCode: 1 });
    const users = userDocs.map(toSafeUser);
    const totalEmployees = users.length;

    // 2. Lấy toàn bộ bản ghi chấm công của hôm nay
    const todayRecords = await MongoAttendanceModel.find({ date: todayStr }).lean();
    const todayRecordsMap = new Map<string, typeof todayRecords[0]>();
    for (const rec of todayRecords) {
      todayRecordsMap.set(rec.userId, rec);
    }

    // 3. Thống kê số lượng hôm nay
    let onTimeCount = 0;
    let lateCount = 0;
    let totalWorkMinutes = 0;
    let completedDurationCount = 0;

    // Phân bổ giờ chấm công
    const hourlyBuckets = {
      before8: 0,
      eightTo815: 0,
      eight15To830: 0,
      eight30To845: 0,
      after845: 0,
    };

    // Danh sách chi tiết nhân viên & trạng thái hôm nay
    const employeeAttendance = users.map((u) => {
      const rec = todayRecordsMap.get(u.id);

      if (!rec || !rec.checkInTime) {
        return {
          id: u.id,
          employeeCode: u.employeeCode || "NV-000",
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department || "Khác",
          avatarUrl: u.avatarUrl,
          phone: u.phone,
          status: "absent" as const,
        };
      }

      const isLate = rec.status === "late";
      if (isLate) {
        lateCount++;
      } else {
        onTimeCount++;
      }

      if (rec.workDurationMinutes) {
        totalWorkMinutes += rec.workDurationMinutes;
        completedDurationCount++;
      }

      // Phân loại giờ check-in (theo giờ chuẩn Việt Nam GMT+7)
      try {
        const d = new Date(rec.checkInTime);
        if (!isNaN(d.getTime())) {
          const timeParts = d.toLocaleTimeString("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          const [hour, minute] = timeParts.split(":").map(Number);
          const totalMins = hour * 60 + minute;

          if (totalMins < 8 * 60) {
            hourlyBuckets.before8++;
          } else if (totalMins <= 8 * 60 + 15) {
            hourlyBuckets.eightTo815++;
          } else if (totalMins <= 8 * 60 + 30) {
            hourlyBuckets.eight15To830++;
          } else if (totalMins <= 8 * 60 + 45) {
            hourlyBuckets.eight30To845++;
          } else {
            hourlyBuckets.after845++;
          }
        }
      } catch {
        // bỏ qua nếu lỗi parse
      }

      return {
        id: u.id,
        employeeCode: u.employeeCode || rec.employeeCode || "NV-000",
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || "Khác",
        avatarUrl: u.avatarUrl,
        phone: u.phone,
        status: (isLate ? "late" : "on_time") as "late" | "on_time",
        checkInTime: rec.checkInTime,
        checkOutTime: rec.checkOutTime,
        workDurationMinutes: rec.workDurationMinutes,
        checkInIp: rec.checkInIp,
        note: rec.note,
      };
    });

    const presentCount = onTimeCount + lateCount;
    const absentCount = Math.max(0, totalEmployees - presentCount);
    const attendanceRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;
    const onTimeRate = presentCount > 0 ? Math.round((onTimeCount / presentCount) * 100) : 0;
    const avgWorkingHours =
      completedDurationCount > 0
        ? Math.round((totalWorkMinutes / completedDurationCount / 60) * 10) / 10
        : 8.0;

    // 4. Xu hướng 7 ngày gần nhất (Past 7 days trend)
    const pastDates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      pastDates.push(getTodayDateString(-i));
    }

    const pastRecords = await MongoAttendanceModel.find({
      date: { $in: pastDates },
    }).lean();

    const dateRecordsMap = new Map<string, typeof pastRecords>();
    for (const rec of pastRecords) {
      const arr = dateRecordsMap.get(rec.date) || [];
      arr.push(rec);
      dateRecordsMap.set(rec.date, arr);
    }

    const activeUserIds = new Set(users.map((u) => u.id));

    const weeklyTrend = pastDates.map((dStr) => {
      const d = new Date(dStr + "T00:00:00");
      const weekday = WEEKDAY_NAMES[d.getDay()] || "Thứ —";
      const [, m, day] = dStr.split("-");
      const label = `${day}/${m}`;

      const rawRecs = dateRecordsMap.get(dStr) || [];

      // Khử trùng lặp theo từng nhân viên (mỗi nhân viên chỉ tính 1 lần trong 1 ngày)
      const uniqueUserMap = new Map<string, string>();
      for (const rec of rawRecs) {
        if (activeUserIds.has(rec.userId)) {
          const prev = uniqueUserMap.get(rec.userId);
          // Nếu đã có bản ghi và bản ghi trước là đi muộn, còn bản ghi này đúng giờ thì cập nhật
          if (!prev || (prev === "late" && rec.status !== "late")) {
            uniqueUserMap.set(rec.userId, rec.status);
          }
        }
      }

      const dayOnTime = Array.from(uniqueUserMap.values()).filter((st) => st !== "late").length;
      const dayLate = Array.from(uniqueUserMap.values()).filter((st) => st === "late").length;
      const dayPresent = Math.min(totalEmployees, dayOnTime + dayLate);
      const dayAbsent = Math.max(0, totalEmployees - dayPresent);
      const dayRate = totalEmployees > 0 ? Math.min(100, Math.round((dayPresent / totalEmployees) * 100)) : 0;

      return {
        date: dStr,
        label,
        weekday,
        total: totalEmployees,
        present: dayPresent,
        onTime: dayOnTime,
        late: dayLate,
        absent: dayAbsent,
        rate: dayRate,
      };
    });

    // 5. Thống kê theo phòng ban
    const deptMap = new Map<
      string,
      { total: number; present: number; onTime: number; late: number; absent: number }
    >();

    for (const emp of employeeAttendance) {
      const dept = emp.department || "Khác";
      const cur = deptMap.get(dept) || { total: 0, present: 0, onTime: 0, late: 0, absent: 0 };
      cur.total++;
      if (emp.status === "on_time") {
        cur.present++;
        cur.onTime++;
      } else if (emp.status === "late") {
        cur.present++;
        cur.late++;
      } else {
        cur.absent++;
      }
      deptMap.set(dept, cur);
    }

    const departmentStats = Array.from(deptMap.entries())
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        present: stats.present,
        onTime: stats.onTime,
        late: stats.late,
        absent: stats.absent,
        rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // 6. Phân bổ trạng thái (Cho Donut Chart)
    const statusBreakdown = [
      {
        label: "Đúng giờ",
        count: onTimeCount,
        percentage: totalEmployees > 0 ? Math.round((onTimeCount / totalEmployees) * 100) : 0,
        color: "#10b981", // emerald-500
      },
      {
        label: "Đi muộn",
        count: lateCount,
        percentage: totalEmployees > 0 ? Math.round((lateCount / totalEmployees) * 100) : 0,
        color: "#f59e0b", // amber-500
      },
      {
        label: "Nghỉ / Vắng",
        count: absentCount,
        percentage: totalEmployees > 0 ? Math.round((absentCount / totalEmployees) * 100) : 0,
        color: "#ef4444", // rose-500
      },
    ];

    // 7. Phân bổ khung giờ check-in
    const hourlyDistribution = [
      {
        timeSlot: "Trước 08:00",
        count: hourlyBuckets.before8,
        percentage: presentCount > 0 ? Math.round((hourlyBuckets.before8 / presentCount) * 100) : 0,
      },
      {
        timeSlot: "08:00 - 08:15",
        count: hourlyBuckets.eightTo815,
        percentage: presentCount > 0 ? Math.round((hourlyBuckets.eightTo815 / presentCount) * 100) : 0,
      },
      {
        timeSlot: "08:15 - 08:30",
        count: hourlyBuckets.eight15To830,
        percentage: presentCount > 0 ? Math.round((hourlyBuckets.eight15To830 / presentCount) * 100) : 0,
      },
      {
        timeSlot: "08:30 - 08:45",
        count: hourlyBuckets.eight30To845,
        percentage: presentCount > 0 ? Math.round((hourlyBuckets.eight30To845 / presentCount) * 100) : 0,
      },
      {
        timeSlot: "Sau 08:45",
        count: hourlyBuckets.after845,
        percentage: presentCount > 0 ? Math.round((hourlyBuckets.after845 / presentCount) * 100) : 0,
      },
    ];

    // 8. Thống kê Tiến độ Công việc & Dự án (Task Completion & Progress Chart)
    const allTasks = await MongoTaskModel.find({}).lean();
    const totalTasks = allTasks.length;
    const todoTasks = allTasks.filter((t) => t.status === "todo").length;
    const inProgressTasks = allTasks.filter((t) => t.status === "in_progress").length;
    const reviewTasks = allTasks.filter((t) => t.status === "review").length;
    const completedTasks = allTasks.filter((t) => t.status === "completed").length;
    const overdueTasks = allTasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled" && t.dueDate && t.dueDate < todayStr
    ).length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const taskDeptMap = new Map<string, { total: number; completed: number; inProgress: number; overdue: number }>();
    for (const t of allTasks) {
      const dept = t.department || t.assigneeDepartment || "Khác";
      const cur = taskDeptMap.get(dept) || { total: 0, completed: 0, inProgress: 0, overdue: 0 };
      cur.total++;
      if (t.status === "completed") cur.completed++;
      if (t.status === "in_progress") cur.inProgress++;
      if (t.status !== "completed" && t.status !== "cancelled" && t.dueDate && t.dueDate < todayStr) cur.overdue++;
      taskDeptMap.set(dept, cur);
    }
    const taskByDepartment = Array.from(taskDeptMap.entries())
      .map(([department, s]) => ({
        department,
        total: s.total,
        completed: s.completed,
        inProgress: s.inProgress,
        overdue: s.overdue,
        progressRate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const taskStats = {
      total: totalTasks,
      todo: todoTasks,
      inProgress: inProgressTasks,
      review: reviewTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      completionRate: taskCompletionRate,
      byDepartment: taskByDepartment,
    };

    // 9. Thống kê Làm thêm giờ (OT) & Nghỉ phép tháng (Overtime & Leave Analytics)
    const allRequests = await MongoRequestModel.find({}).lean();
    const currentMonthPrefix = todayStr.slice(0, 7); // "2026-10"

    const approvedOtThisMonth = allRequests.filter(
      (r) =>
        r.type === "overtime" &&
        r.status === "approved" &&
        (r.otDate?.startsWith(currentMonthPrefix) || r.createdAt?.startsWith(currentMonthPrefix))
    );
    const totalOtHoursMonth = approvedOtThisMonth.reduce((sum, r) => sum + (r.durationHours || 0), 0);

    const otDeptMap = new Map<string, number>();
    for (const r of approvedOtThisMonth) {
      const dept = r.department || "Khác";
      otDeptMap.set(dept, (otDeptMap.get(dept) || 0) + (r.durationHours || 0));
    }
    const otByDepartment = Array.from(otDeptMap.entries())
      .map(([department, hours]) => ({
        department,
        hours: Math.round(hours * 10) / 10,
      }))
      .sort((a, b) => b.hours - a.hours);

    const approvedLeaveThisMonth = allRequests.filter(
      (r) =>
        r.type === "leave" &&
        r.status === "approved" &&
        (r.startDate?.startsWith(currentMonthPrefix) || r.createdAt?.startsWith(currentMonthPrefix))
    );
    const approvedLeaveDaysMonth = approvedLeaveThisMonth.reduce((sum, r) => sum + (r.durationDays || 0), 0);

    const leaveTypeMeta: Record<string, { label: string; color: string }> = {
      annual: { label: "Nghỉ phép năm", color: "#10b981" },
      sick: { label: "Nghỉ ốm đau", color: "#3b82f6" },
      unpaid: { label: "Nghỉ không lương", color: "#94a3b8" },
      remote_wfh: { label: "Làm việc từ xa (WFH)", color: "#8b5cf6" },
      bereavement_marriage: { label: "Nghỉ chế độ / Hiếu hỷ", color: "#f59e0b" },
    };

    const leaveTypeCountMap = new Map<string, number>();
    for (const r of approvedLeaveThisMonth) {
      const lt = r.leaveType || "annual";
      leaveTypeCountMap.set(lt, (leaveTypeCountMap.get(lt) || 0) + (r.durationDays || 0));
    }
    const leaveByType = Array.from(leaveTypeCountMap.entries())
      .map(([type, days]) => ({
        type,
        label: leaveTypeMeta[type]?.label || type,
        days,
        color: leaveTypeMeta[type]?.color || "#6b7280",
      }))
      .sort((a, b) => b.days - a.days);

    const analyticsOtLeave = {
      totalOtHoursMonth: Math.round(totalOtHoursMonth * 10) / 10,
      approvedLeaveDaysMonth,
      otByDepartment,
      leaveByType,
    };

    // 10. Bảng xếp hạng chuyên cần & vinh danh (Punctuality Leaderboard)
    const monthAttendanceDocs = await MongoAttendanceModel.find({
      date: { $regex: `^${currentMonthPrefix}` },
    }).lean();

    const userAttendanceAgg = new Map<string, { onTime: number; total: number }>();
    for (const rec of monthAttendanceDocs) {
      if (activeUserIds.has(rec.userId)) {
        const cur = userAttendanceAgg.get(rec.userId) || { onTime: 0, total: 0 };
        cur.total++;
        if (rec.status !== "late") {
          cur.onTime++;
        }
        userAttendanceAgg.set(rec.userId, cur);
      }
    }

    const leaderboardCandidates = users.map((u) => {
      const agg = userAttendanceAgg.get(u.id) || { onTime: 0, total: 0 };
      const punctualityRate = agg.total > 0 ? Math.round((agg.onTime / agg.total) * 100) : 0;
      return {
        id: u.id,
        name: u.name,
        employeeCode: u.employeeCode,
        department: u.department || "Khác",
        avatarUrl: u.avatarUrl,
        onTimeCount: agg.onTime,
        totalCheckins: agg.total,
        punctualityRate,
      };
    });

    leaderboardCandidates.sort((a, b) => {
      if (b.punctualityRate !== a.punctualityRate) return b.punctualityRate - a.punctualityRate;
      return b.onTimeCount - a.onTimeCount;
    });

    const punctualityLeaderboard = leaderboardCandidates.slice(0, 5).map((item, index) => {
      let badge = "Gương Mẫu";
      if (index === 0) badge = "Quán Quân Chuyên Cần 👑";
      else if (index === 1) badge = "Ngôi Sao Kỷ Luật ⭐";
      else if (index === 2) badge = "Chiến Binh Đúng Giờ ⚡";
      else badge = "Xuất Sắc 🌟";

      return {
        ...item,
        rank: index + 1,
        badge,
      };
    });

    const data: DashboardStatsResponse = {
      summary: {
        totalEmployees,
        presentToday: presentCount,
        onTimeToday: onTimeCount,
        lateToday: lateCount,
        absentToday: absentCount,
        attendanceRate,
        onTimeRate,
        avgWorkingHours,
      },
      weeklyTrend,
      departmentStats,
      statusBreakdown,
      hourlyDistribution,
      employeeAttendance,
      taskStats,
      analyticsOtLeave,
      punctualityLeaderboard,
    };

    // Lưu vào in-memory cache
    cachedStats = {
      data,
      timestamp: Date.now(),
    };

    const response: ApiResponse<DashboardStatsResponse> = {
      success: true,
      data,
      message: "Tải thống kê dashboard thành công",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
      },
    });
  } catch (error) {
    console.error("Lỗi khi tải thống kê dashboard:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi server nội bộ",
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(response, { status: 500 });
  }
}

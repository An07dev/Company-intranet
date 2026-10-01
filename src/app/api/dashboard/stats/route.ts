import { NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoUserModel, MongoAttendanceModel } from "@/server/db/schema";
import { ensureUsersSeeded, toSafeUser } from "@/server/models/user.model";
import { ensureAttendanceSeeded, getTodayDateString } from "@/server/models/attendance.model";
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
}

const WEEKDAY_NAMES = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export async function GET() {
  try {
    await connectToDatabase();
    await ensureUsersSeeded();
    await ensureAttendanceSeeded();

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

      // Phân loại giờ check-in
      try {
        const timeMatch = rec.checkInTime.match(/T(\d{2}):(\d{2})/);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1], 10);
          const minute = parseInt(timeMatch[2], 10);
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
    };

    const response: ApiResponse<DashboardStatsResponse> = {
      success: true,
      data,
      message: "Tải thống kê dashboard thành công",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
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

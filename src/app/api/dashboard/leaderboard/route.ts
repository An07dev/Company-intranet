import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoUserModel, MongoAttendanceModel } from "@/server/db/schema";
import { ensureUsersSeeded, toSafeUser } from "@/server/models/user.model";
import { ensureAttendanceSeeded, getTodayDateString } from "@/server/models/attendance.model";
import { ApiResponse } from "@/types";

export interface LeaderboardMember {
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
}

export interface LeaderboardResponse {
  month: string;
  monthLabel: string;
  totalCheckinsInMonth: number;
  totalRanked: number;
  items: LeaderboardMember[];
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    await ensureUsersSeeded();
    await ensureAttendanceSeeded();

    const { searchParams } = new URL(request.url);
    const currentMonthStr = getTodayDateString(0).slice(0, 7); // "YYYY-MM"
    const month = searchParams.get("month") || currentMonthStr;

    // Validate format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Định dạng tháng không hợp lệ (yêu cầu định dạng YYYY-MM)",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const [year, monthNum] = month.split("-");
    const monthLabel = `Tháng ${monthNum}/${year}`;

    // 1. Lấy toàn bộ người dùng active
    const userDocs = await MongoUserModel.find({ status: "active" }).lean();
    const users = userDocs.map(toSafeUser);
    const activeUserIds = new Set(users.map((u) => u.id));

    // 2. Lấy dữ liệu điểm danh của tháng được chọn
    const monthAttendanceDocs = await MongoAttendanceModel.find({
      date: { $regex: `^${month}` },
    }).lean();

    // 3. Tổng hợp số lượt đi làm và đúng giờ
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

    // 4. Lọc và xếp hạng những nhân sự có lượt check-in trong tháng
    const rankedCandidates = users
      .map((u) => {
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
      })
      .filter((u) => u.totalCheckins > 0)
      .sort((a, b) => {
        if (b.punctualityRate !== a.punctualityRate) return b.punctualityRate - a.punctualityRate;
        if (b.onTimeCount !== a.onTimeCount) return b.onTimeCount - a.onTimeCount;
        return b.totalCheckins - a.totalCheckins;
      });

    // 5. Gán huy hiệu và thứ hạng Top 5
    const topItems: LeaderboardMember[] = rankedCandidates.slice(0, 5).map((item, index) => {
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

    const data: LeaderboardResponse = {
      month,
      monthLabel,
      totalCheckinsInMonth: monthAttendanceDocs.length,
      totalRanked: rankedCandidates.length,
      items: topItems,
    };

    return NextResponse.json<ApiResponse<LeaderboardResponse>>({
      success: true,
      data,
      message: `Tải bảng vinh danh chuyên cần ${monthLabel} thành công`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Lỗi khi tải bảng vinh danh chuyên cần:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi server nội bộ",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

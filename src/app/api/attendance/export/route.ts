import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { AttendanceModel } from "@/server/models/attendance.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError } from "@/server/utils/response";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromCookies();
    if (!user) {
      return apiError("Chưa đăng nhập", 401);
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const employeeCode = searchParams.get("employeeCode") || undefined;
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const requestedUserId = searchParams.get("userId") || undefined;
    const scope = searchParams.get("scope"); // "all" | "my"

    const isPrivileged = user.role === "admin" || user.role === "director" || user.role === "manager";

    // Phân quyền dữ liệu: Mặc định hiển thị của chính mình ("my")
    let filterUserId: string | undefined = user.userId;
    if (isPrivileged && scope === "all") {
      filterUserId = requestedUserId || undefined;
    }

    // Lấy toàn bộ bản ghi theo điều kiện lọc (không bị giới hạn trang)
    const result = await AttendanceModel.getHistory({
      userId: filterUserId,
      employeeCode,
      date,
      startDate,
      endDate,
      status,
      search,
      page: 1,
      limit: 10000,
    });

    const records = result.items;

    // Chuyển đổi dữ liệu sang định dạng hàng của bảng Excel
    const filterInfo = [
      employeeCode ? `Nhân viên: ${employeeCode}` : "Tất cả nhân viên",
      date ? `Ngày: ${date}` : "Tất cả ngày",
      status && status !== "all" ? `Trạng thái: ${status}` : "Tất cả trạng thái",
    ].join(" | ");

    const rows: (string | number)[][] = [
      ["BÁO CÁO DỮ LIỆU ĐIỂM DANH & CHẤM CÔNG NHÂN VIÊN"],
      [`Người xuất báo cáo: ${user.name} (${user.role.toUpperCase()}) | Phạm vi: ${scope === "all" ? "Toàn Đơn Vị" : "Cá Nhân"}`],
      [`Điều kiện lọc: ${filterInfo}`],
      [`Thời gian xuất: ${new Date().toLocaleDateString("vi-VN")} ${new Date().toLocaleTimeString("vi-VN")} | Tổng số bản ghi: ${records.length}`],
      [],
      [
        "STT",
        "Mã Nhân Viên",
        "Họ Và Tên",
        "Email",
        "Ngày Chấm Công",
        "Giờ Vào (Check-in)",
        "IP Check-in",
        "Giờ Về (Check-out)",
        "IP Check-out",
        "Thời Lượng Làm Việc",
        "Trạng Thái",
        "Ghi Chú",
      ],
    ];

    records.forEach((r, idx) => {
      const formatTime = (iso?: string | null) => {
        if (!iso) return "—";
        const d = new Date(iso);
        return !isNaN(d.getTime())
          ? d.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
          : iso.slice(11, 19) || "—";
      };

      const formatDuration = (mins?: number) => {
        if (mins === undefined || mins === null) return "—";
        return `${Math.floor(mins / 60)} giờ ${mins % 60} phút`;
      };

      const statusMap: Record<string, string> = {
        on_time: "Đúng Giờ",
        late: "Đi Muộn",
        early_leave: "Về Sớm",
        completed: "Hoàn Thành",
      };

      rows.push([
        idx + 1,
        r.employeeCode || "—",
        r.userName,
        r.userEmail,
        r.date,
        formatTime(r.checkInTime),
        r.checkInIp || "—",
        formatTime(r.checkOutTime),
        r.checkOutIp || "—",
        formatDuration(r.workDurationMinutes),
        statusMap[r.status] || r.status || "—",
        r.note || "",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 25 },
      { wch: 28 },
      { wch: 16 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 45 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dữ Liệu Điểm Danh");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const safeDate = new Date().toISOString().slice(0, 10);
    const scopeLabel = scope === "all" ? "Toan_Don_Vi" : (user.employeeCode || "Ca_Nhan");
    const empLabel = employeeCode ? `_${employeeCode}` : "";
    const dateLabel = date ? `_${date}` : "";
    const filename = `Diem_Danh_${scopeLabel}${empLabel}${dateLabel}_${safeDate}.xlsx`;

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi xuất file Excel";
    return apiError(message, 500);
  }
}

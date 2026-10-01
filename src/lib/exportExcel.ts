import * as XLSX from "xlsx";
import { AttendanceRecord, LeaveOtRequest } from "@/types";

export interface ExportAttendanceExtra {
  leaveMap?: Record<string, LeaveOtRequest[]>;
  otMap?: Record<string, LeaveOtRequest[]>;
  month?: number; // 1-12
  year?: number;
  user?: {
    name?: string;
    employeeCode?: string;
    email?: string;
    department?: string;
  };
}

/**
 * Chuyển đổi mã trạng thái chấm công sang tiếng Việt
 */
function getStatusLabel(status?: string): string {
  switch (status) {
    case "on_time":
      return "Đúng Giờ";
    case "late":
      return "Đi Muộn";
    case "early_leave":
      return "Về Sớm";
    case "completed":
      return "Hoàn Thành";
    default:
      return status || "—";
  }
}

/**
 * Chuyển loại nghỉ phép sang tên tiếng Việt
 */
function getLeaveTypeLabel(type?: string): string {
  switch (type) {
    case "annual":
      return "Nghỉ phép năm";
    case "sick":
      return "Nghỉ ốm đau";
    case "unpaid":
      return "Nghỉ không lương";
    case "remote_wfh":
      return "Làm việc từ xa (WFH)";
    case "bereavement_marriage":
      return "Việc riêng (Hiếu/Hỷ)";
    case "maternity_paternity":
      return "Nghỉ thai sản";
    default:
      return type || "Nghỉ phép";
  }
}

/**
 * Chuyển loại OT sang tên tiếng Việt kèm hệ số lương
 */
function getOtTypeLabel(type?: string): string {
  switch (type) {
    case "weekday":
      return "Ngày thường (150%)";
    case "weekend":
      return "Cuối tuần (200%)";
    case "holiday":
      return "Ngày Lễ / Tết (300%)";
    default:
      return type || "Làm thêm giờ (OT)";
  }
}

/**
 * Chuyển đổi ca nghỉ sang tiếng Việt
 */
function getShiftLabel(shift?: string): string {
  switch (shift) {
    case "morning":
      return "Buổi sáng (08:00 - 12:00)";
    case "afternoon":
      return "Buổi chiều (13:30 - 17:30)";
    case "all_day":
    default:
      return "Cả ngày";
  }
}

/**
 * Trích xuất giờ:phút:giây an toàn từ ISO string
 */
function formatTime(isoString?: string | null): string {
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
  const match = isoString.match(/T(\d{2})[:.](\d{2})[:.](\d{2})/);
  if (match) return `${match[1]}:${match[2]}:${match[3]}`;
  return "—";
}

/**
 * Định dạng thời lượng (phút sang giờ phút)
 */
function formatDuration(minutes?: number): string {
  if (minutes === undefined || minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} giờ ${m} phút`;
}

/**
 * Lấy tên thứ trong tuần theo tiếng Việt
 */
function getDayOfWeekName(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return days[d.getDay()] || "";
}

/**
 * Xuất danh sách bản ghi chấm công, kèm nghỉ phép và OT ra file Excel (.xlsx) chuẩn
 * Tạo thành các sheet chuyên nghiệp:
 *  - Sheet 1: "Tổng Hợp Công & Nghỉ OT" (Bảng theo từng ngày trong tháng)
 *  - Sheet 2: "Chi Tiết Nghỉ Phép" (Nếu có đơn nghỉ phép đã duyệt)
 *  - Sheet 3: "Chi Tiết Làm Thêm (OT)" (Nếu có đơn OT đã duyệt)
 */
export function exportAttendanceToExcel(
  records: AttendanceRecord[],
  filename = "Bang_Cham_Cong.xlsx",
  sheetTitle = "BẢNG CHẤM CÔNG, NGHỈ PHÉP & LÀM THÊM GIỜ (OT)",
  extra?: ExportAttendanceExtra
) {
  const wb = XLSX.utils.book_new();

  // Thu thập danh sách duy nhất các đơn nghỉ phép và đơn OT trong tháng
  const allLeavesMap = new Map<string, LeaveOtRequest>();
  if (extra?.leaveMap) {
    Object.values(extra.leaveMap).forEach((list) => {
      list.forEach((req) => allLeavesMap.set(req.id, req));
    });
  }
  const allLeaves = Array.from(allLeavesMap.values());

  const allOtsMap = new Map<string, LeaveOtRequest>();
  if (extra?.otMap) {
    Object.values(extra.otMap).forEach((list) => {
      list.forEach((req) => allOtsMap.set(req.id, req));
    });
  }
  const allOts = Array.from(allOtsMap.values());

  // Tính tổng số giờ OT đã duyệt
  let totalOtHours = 0;
  allOts.forEach((ot) => {
    totalOtHours += ot.durationHours || 0;
  });

  // Map chấm công theo ngày YYYY-MM-DD
  const recMap: Record<string, AttendanceRecord> = {};
  records.forEach((r) => {
    recMap[r.date] = r;
  });

  // Xác định tháng & năm để duyệt toàn bộ các ngày trong tháng
  const now = new Date();
  const targetYear = extra?.year || now.getFullYear();
  const targetMonth = extra?.month || now.getMonth() + 1;
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

  // 1. ================= SHEET 1: BẢNG TỔNG HỢP CÔNG & NGHỈ OT =================
  const mainRows: (string | number)[][] = [
    [sheetTitle],
    [
      `Nhân viên: ${extra?.user?.name || records[0]?.userName || "—"} | Mã NV: ${
        extra?.user?.employeeCode || records[0]?.employeeCode || "—"
      } | Phòng ban: ${extra?.user?.department || "—"} | Email: ${extra?.user?.email || records[0]?.userEmail || "—"}`,
    ],
    [
      `Tháng: ${targetMonth}/${targetYear} | Số ngày đi làm: ${records.length} | Nghỉ phép đã duyệt: ${allLeaves.length} đơn | Tổng giờ OT đã duyệt: ${totalOtHours}h | Ngày xuất: ${new Date().toLocaleDateString(
        "vi-VN"
      )} ${new Date().toLocaleTimeString("vi-VN")}`,
    ],
    [], // Dòng trống ngăn cách
    // Header cột
    [
      "STT",
      "Ngày",
      "Thứ",
      "Giờ Vào",
      "IP Check-in",
      "Giờ Về",
      "IP Check-out",
      "Thời Lượng Làm",
      "Trạng Thái Điểm Danh",
      "Nghỉ Phép (Đã Duyệt)",
      "Ca Nghỉ Phép",
      "Lý Do Nghỉ Phép",
      "Người Duyệt Nghỉ",
      "Làm Thêm Giờ OT",
      "Loại OT & Hệ Số",
      "Dự Án / Đầu Việc OT",
      "Người Duyệt OT",
      "Ghi Chú",
    ],
  ];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayOfWeek = getDayOfWeekName(targetYear, targetMonth, day);
    const isWeekend = dayOfWeek === "Thứ 7" || dayOfWeek === "Chủ Nhật";

    const record = recMap[dateStr];
    const leaves = (extra?.leaveMap && extra.leaveMap[dateStr]) || [];
    const ots = (extra?.otMap && extra.otMap[dateStr]) || [];

    // Chấm công
    const inTime = record ? formatTime(record.checkInTime) : "—";
    const inIp = record?.checkInIp || "—";
    const outTime = record ? formatTime(record.checkOutTime) : "—";
    const outIp = record?.checkOutIp || "—";
    const duration = record ? formatDuration(record.workDurationMinutes) : "—";
    let statusLabel = record ? getStatusLabel(record.status) : "—";
    if (!record && leaves.length > 0) {
      statusLabel = "Nghỉ phép có duyệt";
    } else if (!record && isWeekend) {
      statusLabel = "Nghỉ cuối tuần";
    }

    // Nghỉ phép
    const leaveTypes = leaves.map((l) => getLeaveTypeLabel(l.leaveType)).join("; ") || "—";
    const leaveShifts = leaves.map((l) => getShiftLabel(l.durationShift)).join("; ") || "—";
    const leaveReasons = leaves.map((l) => l.reason).join("; ") || "—";
    const leaveApprovers = leaves.map((l) => l.approverName || "Giám Đốc").join("; ") || "—";

    // Làm thêm giờ OT
    const otTimes =
      ots.map((o) => `${o.startTime || ""} - ${o.endTime || ""} (+${o.durationHours || 0}h)`).join("; ") || "—";
    const otTypeRates = ots.map((o) => getOtTypeLabel(o.otType)).join("; ") || "—";
    const otTasks = ots.map((o) => o.projectOrTask || "—").join("; ") || "—";
    const otApprovers = ots.map((o) => o.approverName || "Giám Đốc").join("; ") || "—";

    mainRows.push([
      day,
      dateStr,
      dayOfWeek,
      inTime,
      inIp,
      outTime,
      outIp,
      duration,
      statusLabel,
      leaveTypes,
      leaveShifts,
      leaveReasons,
      leaveApprovers,
      otTimes,
      otTypeRates,
      otTasks,
      otApprovers,
      record?.note || "",
    ]);
  }

  const wsMain = XLSX.utils.aoa_to_sheet(mainRows);
  wsMain["!cols"] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Ngày
    { wch: 12 }, // Thứ
    { wch: 16 }, // Giờ Vào
    { wch: 16 }, // IP Check-in
    { wch: 16 }, // Giờ Về
    { wch: 16 }, // IP Check-out
    { wch: 18 }, // Thời Lượng Làm
    { wch: 20 }, // Trạng Thái Điểm Danh
    { wch: 26 }, // Nghỉ Phép (Đã Duyệt)
    { wch: 24 }, // Ca Nghỉ Phép
    { wch: 38 }, // Lý Do Nghỉ Phép
    { wch: 22 }, // Người Duyệt Nghỉ
    { wch: 24 }, // Làm Thêm Giờ OT
    { wch: 24 }, // Loại OT & Hệ Số
    { wch: 38 }, // Dự Án / Đầu Việc OT
    { wch: 22 }, // Người Duyệt OT
    { wch: 28 }, // Ghi Chú
  ];
  XLSX.utils.book_append_sheet(wb, wsMain, "Tổng Hợp Tháng");

  // 2. ================= SHEET 2: CHI TIẾT ĐƠN NGHỈ PHÉP (NẾU CÓ) =================
  if (allLeaves.length > 0) {
    const leaveRows: (string | number)[][] = [
      [`DANH SÁCH ĐƠN XIN NGHỈ PHÉP ĐÃ ĐƯỢC DUYỆT - THÁNG ${targetMonth}/${targetYear}`],
      [`Nhân viên: ${extra?.user?.name || "—"} | Mã NV: ${extra?.user?.employeeCode || "—"}`],
      [`Tổng số đơn nghỉ phép được duyệt: ${allLeaves.length}`],
      [], // Dòng trống
      [
        "STT",
        "Mã Đơn",
        "Loại Nghỉ Phép",
        "Từ Ngày",
        "Đến Ngày",
        "Số Ngày Nghỉ",
        "Ca Nghỉ",
        "Lý Do Xin Nghỉ",
        "Trạng Thái",
        "Người Phê Duyệt",
        "Ý Kiến / Ghi Chú Duyệt",
        "Thời Điểm Phê Duyệt",
      ],
    ];

    allLeaves.forEach((leave, idx) => {
      leaveRows.push([
        idx + 1,
        leave.id,
        getLeaveTypeLabel(leave.leaveType),
        leave.startDate || "—",
        leave.endDate || "—",
        leave.durationDays ? `${leave.durationDays} ngày` : "1 ngày",
        getShiftLabel(leave.durationShift),
        leave.reason,
        "Đã Phê Duyệt",
        leave.approverName || "Trịnh Gia Giám Đốc",
        leave.approvalNote || "Giám đốc đã phê duyệt",
        leave.reviewedAt ? new Date(leave.reviewedAt).toLocaleString("vi-VN") : "—",
      ]);
    });

    const wsLeave = XLSX.utils.aoa_to_sheet(leaveRows);
    wsLeave["!cols"] = [
      { wch: 6 },  // STT
      { wch: 18 }, // Mã Đơn
      { wch: 24 }, // Loại Nghỉ Phép
      { wch: 14 }, // Từ Ngày
      { wch: 14 }, // Đến Ngày
      { wch: 14 }, // Số Ngày Nghỉ
      { wch: 24 }, // Ca Nghỉ
      { wch: 42 }, // Lý Do Xin Nghỉ
      { wch: 16 }, // Trạng Thái
      { wch: 24 }, // Người Phê Duyệt
      { wch: 42 }, // Ý Kiến / Ghi Chú Duyệt
      { wch: 22 }, // Thời Điểm Phê Duyệt
    ];
    XLSX.utils.book_append_sheet(wb, wsLeave, "Chi Tiết Nghỉ Phép");
  }

  // 3. ================= SHEET 3: CHI TIẾT ĐƠN LÀM THÊM GIỜ OT (NẾU CÓ) =================
  if (allOts.length > 0) {
    const otRows: (string | number)[][] = [
      [`DANH SÁCH ĐƠN LÀM THÊM GIỜ (OT) ĐÃ ĐƯỢC DUYỆT - THÁNG ${targetMonth}/${targetYear}`],
      [`Nhân viên: ${extra?.user?.name || "—"} | Mã NV: ${extra?.user?.employeeCode || "—"}`],
      [`Tổng số đơn OT được duyệt: ${allOts.length} đơn | Tổng số giờ OT: ${totalOtHours}h`],
      [], // Dòng trống
      [
        "STT",
        "Mã Đơn",
        "Ngày Làm Thêm",
        "Khung Giờ Bắt Đầu - Kết Thúc",
        "Thời Lượng (Giờ)",
        "Loại OT & Hệ Số Lương",
        "Dự Án / Đầu Việc",
        "Lý Do Làm Thêm Giờ",
        "Trạng Thái",
        "Người Phê Duyệt",
        "Ý Kiến / Ghi Chú Duyệt",
        "Thời Điểm Phê Duyệt",
      ],
    ];

    allOts.forEach((ot, idx) => {
      otRows.push([
        idx + 1,
        ot.id,
        ot.otDate || "—",
        `${ot.startTime || ""} - ${ot.endTime || ""}`,
        ot.durationHours ? `${ot.durationHours} giờ` : "—",
        getOtTypeLabel(ot.otType),
        ot.projectOrTask || "—",
        ot.reason,
        "Đã Phê Duyệt",
        ot.approverName || "Trịnh Gia Giám Đốc",
        ot.approvalNote || "Giám đốc đã phê duyệt",
        ot.reviewedAt ? new Date(ot.reviewedAt).toLocaleString("vi-VN") : "—",
      ]);
    });

    const wsOt = XLSX.utils.aoa_to_sheet(otRows);
    wsOt["!cols"] = [
      { wch: 6 },  // STT
      { wch: 18 }, // Mã Đơn
      { wch: 16 }, // Ngày Làm Thêm
      { wch: 22 }, // Khung Giờ
      { wch: 18 }, // Thời Lượng (Giờ)
      { wch: 24 }, // Loại OT & Hệ Số Lương
      { wch: 42 }, // Dự Án / Đầu Việc
      { wch: 42 }, // Lý Do Làm Thêm Giờ
      { wch: 16 }, // Trạng Thái
      { wch: 24 }, // Người Phê Duyệt
      { wch: 42 }, // Ý Kiến / Ghi Chú Duyệt
      { wch: 22 }, // Thời Điểm Phê Duyệt
    ];
    XLSX.utils.book_append_sheet(wb, wsOt, "Chi Tiết Làm Thêm (OT)");
  }

  // Tự động tải file về máy
  const safeFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

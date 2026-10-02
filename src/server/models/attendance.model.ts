import { AttendanceRecord, AttendanceStatus, PaginatedData } from "@/types";
import { SettingsModel } from "@/server/models/settings.model";
import { isIpMatched } from "@/server/utils/ip";
import { connectToDatabase } from "@/server/db";
import { MongoAttendanceModel, MongoUserModel, IAttendanceDocument } from "@/server/db/schema";

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam
 */
export function getTodayDateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

/**
 * Lấy giờ phút HH:mm:ss hiện tại theo múi giờ Việt Nam
 */
export function getCurrentTimeString(): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return formatter.format(new Date());
}

/**
 * Danh sách mã nhân viên mặc định
 */
const USER_CODE_MAP: Record<string, string> = {
  usr_admin_01: "ADM-001",
  usr_dir_01: "GD-001",
  usr_mgr_01: "QL-001",
  usr_mgr_02: "QL-002",
  usr_emp_01: "NV-001",
  usr_emp_02: "NV-002",
  usr_emp_03: "NV-003",
  usr_emp_04: "NV-004",
  usr_emp_05: "NV-005",
  usr_emp_06: "NV-006",
  usr_emp_07: "NV-007",
  usr_emp_08: "NV-008",
};

// Chuẩn bị danh sách bản ghi mẫu ban đầu
function buildSeedRecords(): IAttendanceDocument[] {
  const sampleSeedRecords: IAttendanceDocument[] = [];

  const employeePool = [
    { id: "usr_admin_01", code: "ADM-001", name: "Nguyễn Văn Admin", email: "admin@company.internal", ip: "127.0.0.1", inMin: 15 },
    { id: "usr_dir_01", code: "GD-001", name: "Trịnh Gia Giám Đốc", email: "director@company.internal", ip: "192.168.1.10", inMin: 20 },
    { id: "usr_mgr_01", code: "QL-001", name: "Trần Thị Quản Lý", email: "manager@company.internal", ip: "192.168.1.20", inMin: 12 },
    { id: "usr_mgr_02", code: "QL-002", name: "Nguyễn Hải Đăng", email: "haidang@company.internal", ip: "192.168.1.25", inMin: 18 },
    { id: "usr_emp_01", code: "NV-001", name: "Lê Hoàng Nhân Viên", email: "employee@company.internal", ip: "192.168.1.45", inMin: 42, late: true },
    { id: "usr_emp_02", code: "NV-002", name: "Phạm Tuấn Anh", email: "tuananh@company.internal", ip: "192.168.1.46", inMin: 26 },
    { id: "usr_emp_03", code: "NV-003", name: "Đặng Thu Hà", email: "thuha@company.internal", ip: "192.168.1.47", inMin: 10 },
    { id: "usr_emp_04", code: "NV-004", name: "Vũ Quốc Bảo", email: "quocbao@company.internal", ip: "192.168.1.48", inMin: 48, late: true },
    { id: "usr_emp_05", code: "NV-005", name: "Ngô Mai Lan", email: "mailan@company.internal", ip: "192.168.1.49", inMin: 5 },
    { id: "usr_emp_06", code: "NV-006", name: "Bùi Hoàng Nam", email: "hoangnam@company.internal", ip: "192.168.1.50", inMin: 22 },
    { id: "usr_emp_07", code: "NV-007", name: "Hoàng Thu Trang", email: "thutrang@company.internal", ip: "192.168.1.51", inMin: 16 },
    { id: "usr_emp_08", code: "NV-008", name: "Đỗ Hùng Dũng", email: "hungdung@company.internal", ip: "192.168.1.52", inMin: 29 },
  ];

  // 1. Bản ghi HÔM NAY (offset = 0): 10 người có mặt (8 đúng giờ, 2 đi muộn), 2 người vắng (NV-006, NV-007)
  const todayStr = getTodayDateString(0);
  employeePool.forEach((emp) => {
    // NV-006 và NV-007 hôm nay nghỉ phép
    if (emp.code === "NV-006" || emp.code === "NV-007") return;

    const inMinute = String(emp.inMin).padStart(2, "0");
    const isLate = Boolean(emp.late);

    sampleSeedRecords.push({
      id: `att_today_${emp.code.toLowerCase()}`,
      userId: emp.id,
      employeeCode: emp.code,
      userName: emp.name,
      userEmail: emp.email,
      date: todayStr,
      checkInTime: `${todayStr}T08:${inMinute}:25+07:00`,
      checkInIp: emp.ip,
      checkOutTime: isLate ? undefined : `${todayStr}T17:35:10+07:00`,
      checkOutIp: isLate ? undefined : emp.ip,
      status: isLate ? "late" : "completed",
      workDurationMinutes: isLate ? undefined : 555,
      note: isLate ? "Đi muộn do mưa lớn" : "Chấm công đúng giờ",
      createdAt: `${todayStr}T08:${inMinute}:25+07:00`,
      updatedAt: `${todayStr}T08:${inMinute}:25+07:00`,
    });
  });

  // 20 ghi chú công tác dành cho Giám Đốc
  const directorNotes = [
    "Điều hành cuộc họp HĐQT thường kỳ",
    "Làm việc với đối tác tài chính quốc tế",
    "Ký kết thỏa thuận hợp tác dự án chiến lược",
    "Duyệt báo cáo tài chính và ngân sách quý",
    "Khảo sát thực địa cơ sở dự án mới",
    "Chỉ đạo cuộc họp chuyển đổi số nội bộ",
    "Làm việc với ban quản lý điều hành",
    "Đánh giá KPI và kế hoạch nhân sự toàn công ty",
    "Gặp gỡ khách hàng VIP và đối tác chiến lược",
    "Tham gia hội nghị lãnh đạo doanh nghiệp tiêu biểu",
    "Chỉ đạo rà soát quy trình quản trị rủi ro hệ thống",
    "Họp trực tuyến chỉ đạo các chi nhánh khu vực",
    "Duyệt chiến lược kinh doanh và phát triển thị trường",
    "Họp giao ban ban giám đốc định kỳ",
    "Phê duyệt hợp đồng đấu thầu giải pháp công nghệ",
    "Làm việc cùng hội đồng cố vấn phát triển",
    "Tiếp đón phái đoàn chuyên gia cấp cao",
    "Kiểm tra tiến độ các dự án trọng điểm",
    "Chỉ đạo kế hoạch đào tạo cán bộ quản lý",
    "Duyệt chính sách khen thưởng và đãi ngộ nhân sự",
  ];

  // 2. Bản ghi các ngày quá khứ (offset = 1..14)
  const dayOffsets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  dayOffsets.forEach((offset) => {
    const dStr = getTodayDateString(-offset);

    employeePool.forEach((emp, empIdx) => {
      // Một số nhân viên thỉnh thoảng nghỉ phép (vắng) theo chu kỳ offset
      const isAbsent = (offset + empIdx) % 7 === 0;
      if (isAbsent && emp.code !== "GD-001" && emp.code !== "ADM-001") return;

      const isLate = (offset + empIdx) % 5 === 0;
      const baseMin = (emp.inMin + offset * 3) % 25;
      const inMinute = isLate ? String(38 + ((offset * 2) % 15)).padStart(2, "0") : String(8 + baseMin).padStart(2, "0");
      const inSecond = String(10 + ((offset * 7) % 45)).padStart(2, "0");
      const outMinute = String(30 + ((offset * 3) % 25)).padStart(2, "0");
      const outSecond = String(15 + ((offset * 5) % 40)).padStart(2, "0");

      let note = isLate ? "Kẹt xe giờ cao điểm" : "Hoàn thành ca làm việc";
      if (emp.code === "GD-001") {
        note = directorNotes[offset - 1] || "Điều hành công tác ban giám đốc";
      }

      sampleSeedRecords.push({
        id: `att_seed_${emp.code.toLowerCase()}_${offset}`,
        userId: emp.id,
        employeeCode: emp.code,
        userName: emp.name,
        userEmail: emp.email,
        date: dStr,
        checkInTime: `${dStr}T08:${inMinute}:${inSecond}+07:00`,
        checkInIp: emp.ip,
        checkOutTime: `${dStr}T17:${outMinute}:${outSecond}+07:00`,
        checkOutIp: emp.ip,
        status: isLate ? "late" : "completed",
        workDurationMinutes: isLate ? 520 : 550 + (offset % 20),
        note,
        createdAt: `${dStr}T08:${inMinute}:${inSecond}+07:00`,
        updatedAt: `${dStr}T17:${outMinute}:${outSecond}+07:00`,
      });
    });
  });

  return sampleSeedRecords;
}

let attendanceSeeded = false;
export async function ensureAttendanceSeeded() {
  if (attendanceSeeded) return;
  await connectToDatabase();

  // Kiểm tra siêu tốc: Nếu bộ sưu tập đã có dữ liệu, kết thúc ngay lập tức (O(1) metadata read)
  const count = await MongoAttendanceModel.estimatedDocumentCount();
  if (count === 0) {
    const seedRecords = buildSeedRecords();
    if (seedRecords.length > 0) {
      try {
        await MongoAttendanceModel.insertMany(seedRecords, { ordered: false });
      } catch (err) {
        console.warn("[Seed] Khởi tạo dữ liệu điểm danh mẫu:", err);
      }
    }
  }
  attendanceSeeded = true;
}

function toSafeAttendance(doc: IAttendanceDocument, avatar?: string): AttendanceRecord {
  return {
    id: doc.id,
    userId: doc.userId,
    employeeCode: doc.employeeCode || USER_CODE_MAP[doc.userId] || "NV-001",
    userName: doc.userName,
    userEmail: doc.userEmail,
    userAvatar: avatar,
    date: doc.date,
    checkInTime: doc.checkInTime,
    checkInIp: doc.checkInIp,
    checkOutTime: doc.checkOutTime,
    checkOutIp: doc.checkOutIp,
    status: doc.status,
    workDurationMinutes: doc.workDurationMinutes,
    note: doc.note,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const AttendanceModel = {
  /**
   * Lấy bản ghi chấm công hôm nay của một user từ MongoDB
   */
  async getTodayRecord(userId: string): Promise<AttendanceRecord | null> {
    await ensureAttendanceSeeded();
    const today = getTodayDateString();
    const record = await MongoAttendanceModel.findOne({ userId, date: today }).lean();
    return record ? toSafeAttendance(record) : null;
  },

  /**
   * Chấm công vào (Check-in) lưu vào MongoDB
   */
  async checkIn(params: {
    userId: string;
    employeeCode?: string;
    userName: string;
    userEmail: string;
    clientIp: string;
    note?: string;
  }): Promise<AttendanceRecord> {
    await ensureAttendanceSeeded();
    const settings = await SettingsModel.getAttendanceSettings();

    // 1. Kiểm tra IP nếu tính năng đang bật
    if (settings.enableIpCheck) {
      const allowed = isIpMatched(params.clientIp, settings.allowedIps);
      if (!allowed) {
        throw new Error(
          `IP của bạn (${params.clientIp}) không thuộc danh sách IP văn phòng được cho phép. Vui lòng kết nối Wi-Fi công ty để chấm công.`
        );
      }
    }

    const today = getTodayDateString();
    const existing = await MongoAttendanceModel.findOne({ userId: params.userId, date: today });

    if (existing && existing.checkInTime) {
      throw new Error(`Bạn đã chấm công vào hôm nay lúc ${existing.checkInTime.slice(11, 19)}.`);
    }

    // 2. Tính toán trạng thái Đúng giờ hay Đi muộn
    const currentTimeStr = getCurrentTimeString().slice(0, 5); // "08:35"
    let status: AttendanceStatus = "on_time";

    const [startH, startM] = settings.workStartTime.split(":").map(Number);
    const [currentH, currentM] = currentTimeStr.split(":").map(Number);
    const startTotalMinutes = startH * 60 + startM;
    const currentTotalMinutes = currentH * 60 + currentM;

    // Quá giờ làm + ngưỡng muộn cho phép
    if (currentTotalMinutes > startTotalMinutes + settings.lateThresholdMinutes) {
      status = "late";
    }

    const nowIso = new Date().toISOString();
    const employeeCode = params.employeeCode || USER_CODE_MAP[params.userId] || "NV-001";

    if (existing) {
      existing.checkInTime = nowIso;
      existing.checkInIp = params.clientIp;
      existing.status = status;
      existing.employeeCode = employeeCode;
      if (params.note) existing.note = params.note;
      existing.updatedAt = nowIso;
      await existing.save();
      return toSafeAttendance(existing.toObject());
    }

    const newDoc = await MongoAttendanceModel.create({
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: params.userId,
      employeeCode,
      userName: params.userName,
      userEmail: params.userEmail,
      date: today,
      checkInTime: nowIso,
      checkInIp: params.clientIp,
      status,
      note: params.note || "",
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return toSafeAttendance(newDoc.toObject());
  },

  /**
   * Chấm công ra (Check-out) lưu vào MongoDB
   */
  async checkOut(params: {
    userId: string;
    clientIp: string;
    note?: string;
  }): Promise<AttendanceRecord> {
    await ensureAttendanceSeeded();
    const settings = await SettingsModel.getAttendanceSettings();

    // 1. Kiểm tra IP nếu bật
    if (settings.enableIpCheck) {
      const allowed = isIpMatched(params.clientIp, settings.allowedIps);
      if (!allowed) {
        throw new Error(
          `IP của bạn (${params.clientIp}) không thuộc danh sách IP văn phòng được cho phép.`
        );
      }
    }

    const today = getTodayDateString();
    const record = await MongoAttendanceModel.findOne({ userId: params.userId, date: today });

    if (!record || !record.checkInTime) {
      throw new Error("Bạn chưa thực hiện chấm công vào hôm nay, không thể chấm công ra.");
    }

    if (record.checkOutTime) {
      throw new Error(`Bạn đã chấm công ra hôm nay lúc ${record.checkOutTime.slice(11, 19)}.`);
    }

    const nowIso = new Date().toISOString();
    const checkInDate = new Date(record.checkInTime);
    const checkOutDate = new Date(nowIso);
    const durationMinutes = Math.max(
      0,
      Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60))
    );

    // Tính trạng thái Về sớm nếu về trước giờ quy định
    const currentTimeStr = getCurrentTimeString().slice(0, 5);
    const [endH, endM] = settings.workEndTime.split(":").map(Number);
    const [currentH, currentM] = currentTimeStr.split(":").map(Number);
    const endTotalMinutes = endH * 60 + endM;
    const currentTotalMinutes = currentH * 60 + currentM;

    let finalStatus: AttendanceStatus = record.status;
    if (currentTotalMinutes < endTotalMinutes) {
      finalStatus = record.status === "late" ? "late" : "early_leave";
    } else {
      finalStatus = record.status === "late" ? "late" : "completed";
    }

    record.checkOutTime = nowIso;
    record.checkOutIp = params.clientIp;
    record.workDurationMinutes = durationMinutes;
    record.status = finalStatus;
    if (params.note) {
      record.note = record.note ? `${record.note} | ${params.note}` : params.note;
    }
    record.updatedAt = nowIso;

    await record.save();
    return toSafeAttendance(record.toObject());
  },

  /**
   * Lấy lịch sử chấm công có hỗ trợ bộ lọc và phân trang từ MongoDB
   */
  async getHistory(params?: {
    userId?: string;
    employeeCode?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedData<AttendanceRecord>> {
    await ensureAttendanceSeeded();

    const query: Record<string, unknown> = {};

    if (params?.userId) {
      query.userId = params.userId;
    }

    if (params?.employeeCode) {
      query.employeeCode = params.employeeCode.trim();
    }

    if (params?.date) {
      query.date = params.date;
    }

    if (params?.startDate || params?.endDate) {
      const dateRange: Record<string, string> = {};
      if (params.startDate) dateRange.$gte = params.startDate;
      if (params.endDate) dateRange.$lte = params.endDate;
      query.date = dateRange;
    }

    if (params?.status && params.status !== "all") {
      query.status = params.status;
    }

    if (params?.search) {
      const q = params.search.trim();
      const regex = new RegExp(q, "i");
      query.$or = [
        { employeeCode: regex },
        { userName: regex },
        { userEmail: regex },
        { note: regex },
      ];
    }

    const total = await MongoAttendanceModel.countDocuments(query);
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, params?.limit || 10);
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;

    const docs = await MongoAttendanceModel.find(query)
      .sort({ createdAt: -1 })
      .skip(start)
      .limit(limit)
      .lean();

    const userIds = Array.from(new Set(docs.map((d) => d.userId)));
    const users = await MongoUserModel.find({ id: { $in: userIds } })
      .select("id avatarUrl")
      .lean();
    const avatarMap = new Map<string, string>();
    users.forEach((u) => {
      if (u.avatarUrl) avatarMap.set(u.id, u.avatarUrl);
    });

    return {
      items: docs.map((d) => toSafeAttendance(d, avatarMap.get(d.userId))),
      total,
      page,
      limit,
      totalPages,
    };
  },
};

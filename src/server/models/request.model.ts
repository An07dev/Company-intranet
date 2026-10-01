import { connectToDatabase } from "@/server/db";
import { MongoRequestModel, MongoUserModel, IRequestDocument } from "@/server/db/schema";
import {
  LeaveOtRequest,
  CreateLeaveRequestInput,
  CreateOtRequestInput,
  RequestStatsSummary,
  PaginatedData,
  RequestType,
  LeaveType,
  OvertimeType,
  RequestStatus,
  DurationShift,
  ContractType,
} from "@/types";
import { getTodayDateString } from "@/server/models/attendance.model";

function toSafeRequest(
  doc: IRequestDocument,
  userAvatar?: string,
  approverAvatar?: string
): LeaveOtRequest {
  return {
    id: doc.id,
    userId: doc.userId,
    employeeCode: doc.employeeCode,
    userName: doc.userName,
    userEmail: doc.userEmail,
    userAvatar,
    department: doc.department,
    type: doc.type as RequestType,
    leaveType: doc.leaveType as LeaveType | undefined,
    startDate: doc.startDate,
    endDate: doc.endDate,
    durationDays: doc.durationDays,
    durationShift: doc.durationShift as DurationShift | undefined,
    otType: doc.otType as OvertimeType | undefined,
    otDate: doc.otDate,
    startTime: doc.startTime,
    endTime: doc.endTime,
    durationHours: doc.durationHours,
    projectOrTask: doc.projectOrTask,
    reason: doc.reason,
    status: doc.status as RequestStatus,
    approverId: doc.approverId,
    approverName: doc.approverName,
    approverAvatar,
    approvalNote: doc.approvalNote,
    reviewedAt: doc.reviewedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// Khởi tạo các đơn mẫu ban đầu để demo sinh động (18 đơn phong phú cho nhiều phòng ban & trạng thái)
const INITIAL_REQUEST_SEEDS: IRequestDocument[] = [
  {
    id: "req_seed_01",
    userId: "usr_emp_01",
    employeeCode: "NV-001",
    userName: "Lê Hoàng Nhân Viên",
    userEmail: "employee@company.internal",
    department: "Bộ Phận Phát Triển Sản Phẩm",
    type: "leave",
    leaveType: "annual",
    startDate: getTodayDateString(2),
    endDate: getTodayDateString(3),
    durationDays: 2,
    durationShift: "all_day",
    reason: "Đi khám sức khỏe định kỳ và giải quyết việc cá nhân gia đình",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "req_seed_02",
    userId: "usr_emp_01",
    employeeCode: "NV-001",
    userName: "Lê Hoàng Nhân Viên",
    userEmail: "employee@company.internal",
    department: "Bộ Phận Phát Triển Sản Phẩm",
    type: "overtime",
    otType: "weekday",
    otDate: getTodayDateString(-1),
    startTime: "18:00",
    endTime: "21:00",
    durationHours: 3,
    projectOrTask: "Dự án Nâng cấp Hệ thống Cổng thông tin Nội bộ V2",
    reason: "Tối ưu hóa cơ sở dữ liệu MongoDB và hoàn tất API thống kê cho Dashboard",
    status: "approved",
    approverId: "usr_dir_01",
    approverName: "Trịnh Gia Giám Đốc",
    approvalNote: "Đã duyệt, ghi nhận đóng góp tích cực cho dự án.",
    reviewedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: "req_seed_03",
    userId: "usr_emp_02",
    employeeCode: "NV-002",
    userName: "Phạm Tuấn Anh",
    userEmail: "tuananh@company.internal",
    department: "Phòng Kinh Doanh",
    type: "leave",
    leaveType: "remote_wfh",
    startDate: getTodayDateString(1),
    endDate: getTodayDateString(1),
    durationDays: 1,
    durationShift: "all_day",
    reason: "Gặp khách hàng tại đối tác và làm việc từ xa theo lịch hẹn",
    status: "approved",
    approverId: "usr_dir_01",
    approverName: "Trịnh Gia Giám Đốc",
    approvalNote: "Giám đốc phê duyệt làm việc từ xa, nhớ cập nhật báo cáo tiến độ cuối ngày.",
    reviewedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 16).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "req_seed_04",
    userId: "usr_emp_04",
    employeeCode: "NV-004",
    userName: "Vũ Quốc Bảo",
    userEmail: "quocbao@company.internal",
    department: "Bộ Phận Phát Triển Sản Phẩm",
    type: "overtime",
    otType: "weekend",
    otDate: getTodayDateString(2),
    startTime: "09:00",
    endTime: "16:00",
    durationHours: 6,
    projectOrTask: "Bảo trì nâng cấp máy chủ phòng máy công ty",
    reason: "Bảo trì hệ thống định kỳ vào cuối tuần để tránh gián đoạn giờ hành chính",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: "req_seed_05",
    userId: "usr_emp_06",
    employeeCode: "NV-006",
    userName: "Bùi Hoàng Nam",
    userEmail: "hoangnam@company.internal",
    department: "Phòng Kinh Doanh",
    type: "leave",
    leaveType: "annual",
    startDate: getTodayDateString(0),
    endDate: getTodayDateString(0),
    durationDays: 1,
    durationShift: "all_day",
    reason: "Nghỉ phép năm giải quyết việc gia đình",
    status: "approved",
    approverId: "usr_dir_01",
    approverName: "Trịnh Gia Giám Đốc",
    approvalNote: "Đồng ý cho nghỉ phép năm.",
    reviewedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: "req_seed_06",
    userId: "usr_emp_03",
    employeeCode: "NV-003",
    userName: "Đặng Thu Hà",
    userEmail: "thuha@company.internal",
    department: "Phòng Kế Toán",
    type: "overtime",
    otType: "weekday",
    otDate: getTodayDateString(0),
    startTime: "18:00",
    endTime: "20:30",
    durationHours: 2.5,
    projectOrTask: "Báo cáo Quyết toán Thuế & Kiểm toán Quý 3",
    reason: "Khớp số liệu công nợ và hoàn thành tờ khai thuế trước hạn nộp",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "req_seed_07",
    userId: "usr_emp_05",
    employeeCode: "NV-005",
    userName: "Ngô Mai Lan",
    userEmail: "mailan@company.internal",
    department: "Phòng Marketing",
    type: "leave",
    leaveType: "annual",
    startDate: getTodayDateString(4),
    endDate: getTodayDateString(5),
    durationDays: 2,
    durationShift: "all_day",
    reason: "Nghỉ phép năm về quê lo công việc hiếu hỷ",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "req_seed_08",
    userId: "usr_emp_07",
    employeeCode: "NV-007",
    userName: "Hoàng Thu Trang",
    userEmail: "thutrang@company.internal",
    department: "Phòng Nhân Sự",
    type: "leave",
    leaveType: "sick",
    startDate: getTodayDateString(-2),
    endDate: getTodayDateString(-1),
    durationDays: 2,
    durationShift: "all_day",
    reason: "Nghỉ ốm theo chỉ định của bác sĩ bệnh viện",
    status: "approved",
    approverId: "usr_dir_01",
    approverName: "Trịnh Gia Giám Đốc",
    approvalNote: "Đã duyệt nghỉ ốm, chúc nhân sự sớm bình phục.",
    reviewedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: "req_seed_09",
    userId: "usr_emp_08",
    employeeCode: "NV-008",
    userName: "Đỗ Hùng Dũng",
    userEmail: "hungdung@company.internal",
    department: "Khối Vận Hành",
    type: "overtime",
    otType: "weekend",
    otDate: getTodayDateString(3),
    startTime: "08:00",
    endTime: "16:30",
    durationHours: 7,
    projectOrTask: "Tổng kiểm kê thiết bị văn phòng và trung tâm dữ liệu",
    reason: "Thực hiện kiểm kê tài sản cố định toàn bộ các tầng trụ sở công ty",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
  },
  {
    id: "req_seed_10",
    userId: "usr_emp_01",
    employeeCode: "NV-001",
    userName: "Lê Hoàng Nhân Viên",
    userEmail: "employee@company.internal",
    department: "Bộ Phận Phát Triển Sản Phẩm",
    type: "overtime",
    otType: "holiday",
    otDate: getTodayDateString(5),
    startTime: "09:00",
    endTime: "13:00",
    durationHours: 4,
    projectOrTask: "Trực hỗ trợ khẩn cấp ngày lễ",
    reason: "Đề xuất trực standby theo dõi lỗi hệ thống phát sinh ngoài giờ",
    status: "rejected",
    approverId: "usr_dir_01",
    approverName: "Trịnh Gia Giám Đốc",
    approvalNote: "Đã có đội ngũ DevOps ca trực phụ trách, không cần thiết mở rộng OT thêm.",
    reviewedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "req_seed_11",
    userId: "usr_emp_02",
    employeeCode: "NV-002",
    userName: "Phạm Tuấn Anh",
    userEmail: "tuananh@company.internal",
    department: "Phòng Kinh Doanh",
    type: "overtime",
    otType: "weekday",
    otDate: getTodayDateString(-2),
    startTime: "18:00",
    endTime: "21:00",
    durationHours: 3,
    projectOrTask: "Đàm phán hợp đồng thầu giải pháp doanh nghiệp",
    reason: "Họp tiếp khách hàng đối tác phía Bắc để thống nhất điều khoản hợp đồng",
    status: "approved",
    approverId: "usr_dir_01",
    approverName: "Trịnh Gia Giám Đốc",
    approvalNote: "Duyệt đơn, nỗ lực chốt hợp đồng sớm trong tuần.",
    reviewedAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 46).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 40).toISOString(),
  },
  {
    id: "req_seed_12",
    userId: "usr_emp_03",
    employeeCode: "NV-003",
    userName: "Đặng Thu Hà",
    userEmail: "thuha@company.internal",
    department: "Phòng Kế Toán",
    type: "leave",
    leaveType: "unpaid",
    startDate: getTodayDateString(6),
    endDate: getTodayDateString(7),
    durationDays: 2,
    durationShift: "all_day",
    reason: "Việc gia đình phát sinh gấp cần về quê giải quyết thủ tục nhà đất",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 9).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 9).toISOString(),
  },
  {
    id: "req_seed_13",
    userId: "usr_emp_04",
    employeeCode: "NV-004",
    userName: "Vũ Quốc Bảo",
    userEmail: "quocbao@company.internal",
    department: "Bộ Phận Phát Triển Sản Phẩm",
    type: "leave",
    leaveType: "remote_wfh",
    startDate: getTodayDateString(3),
    endDate: getTodayDateString(4),
    durationDays: 2,
    durationShift: "all_day",
    reason: "Làm việc từ xa để tập trung cao độ xử lý tối ưu Index MongoDB và Docker container",
    status: "approved",
    approverId: "usr_dir_01",
    approverName: "Trịnh Gia Giám Đốc",
    approvalNote: "Đồng ý WFH, duy trì liên lạc qua kênh Slack công ty.",
    reviewedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 16).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
  {
    id: "req_seed_14",
    userId: "usr_emp_05",
    employeeCode: "NV-005",
    userName: "Ngô Mai Lan",
    userEmail: "mailan@company.internal",
    department: "Phòng Marketing",
    type: "overtime",
    otType: "weekday",
    otDate: getTodayDateString(1),
    startTime: "18:00",
    endTime: "21:30",
    durationHours: 3.5,
    projectOrTask: "Chiến dịch truyền thông Thương hiệu Quý 4",
    reason: "Sản xuất video clip và chuẩn bị banner quảng cáo ra mắt dịch vụ mới",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 11).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 11).toISOString(),
  },
  {
    id: "req_seed_15",
    userId: "usr_emp_06",
    employeeCode: "NV-006",
    userName: "Bùi Hoàng Nam",
    userEmail: "hoangnam@company.internal",
    department: "Phòng Kinh Doanh",
    type: "overtime",
    otType: "weekend",
    otDate: getTodayDateString(2),
    startTime: "09:00",
    endTime: "14:00",
    durationHours: 5,
    projectOrTask: "Hội thảo Khách hàng Doanh nghiệp Tiềm năng",
    reason: "Điều phối gian hàng và tiếp xúc tư vấn trực tiếp đại diện doanh nghiệp",
    status: "approved",
    approverId: "usr_dir_01",
    approverName: "Trịnh Gia Giám Đốc",
    approvalNote: "Đã duyệt, chuẩn bị tài liệu chu đáo.",
    reviewedAt: new Date(Date.now() - 3600000 * 15).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 22).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 15).toISOString(),
  },
  {
    id: "req_seed_16",
    userId: "usr_emp_07",
    employeeCode: "NV-007",
    userName: "Hoàng Thu Trang",
    userEmail: "thutrang@company.internal",
    department: "Phòng Nhân Sự",
    type: "leave",
    leaveType: "bereavement_marriage",
    startDate: getTodayDateString(7),
    endDate: getTodayDateString(9),
    durationDays: 3,
    durationShift: "all_day",
    reason: "Nghỉ việc hỷ theo chế độ pháp luật (tổ chức đám cưới)",
    status: "approved",
    approverId: "usr_dir_01",
    approverName: "Trịnh Gia Giám Đốc",
    approvalNote: "Chúc mừng hạnh phúc nhân sự! Duyệt đủ 3 ngày chế độ có lương.",
    reviewedAt: new Date(Date.now() - 3600000 * 25).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 25).toISOString(),
  },
  {
    id: "req_seed_17",
    userId: "usr_emp_08",
    employeeCode: "NV-008",
    userName: "Đỗ Hùng Dũng",
    userEmail: "hungdung@company.internal",
    department: "Khối Vận Hành",
    type: "leave",
    leaveType: "annual",
    startDate: getTodayDateString(1),
    endDate: getTodayDateString(1),
    durationDays: 1,
    durationShift: "all_day",
    reason: "Xin phép nghỉ việc riêng nhưng đã bố trí người thay thế nên xin tự hủy",
    status: "cancelled",
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: "req_seed_18",
    userId: "usr_emp_01",
    employeeCode: "NV-001",
    userName: "Lê Hoàng Nhân Viên",
    userEmail: "employee@company.internal",
    department: "Bộ Phận Phát Triển Sản Phẩm",
    type: "leave",
    leaveType: "remote_wfh",
    startDate: getTodayDateString(5),
    endDate: getTodayDateString(5),
    durationDays: 1,
    durationShift: "all_day",
    reason: "Làm việc từ xa chuẩn bị tài liệu kỹ thuật hướng dẫn người dùng mới",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

let requestsSeeded = false;
export async function ensureRequestsSeeded() {
  if (requestsSeeded) return;
  await connectToDatabase();
  const count = await MongoRequestModel.countDocuments();
  if (count === 0) {
    await MongoRequestModel.insertMany(INITIAL_REQUEST_SEEDS);
  }
  requestsSeeded = true;
}

export const RequestModel = {
  /**
   * Tạo đơn xin nghỉ phép mới
   */
  async createLeaveRequest(
    user: { id: string; employeeCode: string; name: string; email: string; department?: string },
    input: CreateLeaveRequestInput
  ): Promise<LeaveOtRequest> {
    await ensureRequestsSeeded();
    const nowIso = new Date().toISOString();
    const id = `req_leave_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const doc = await MongoRequestModel.create({
      id,
      userId: user.id,
      employeeCode: user.employeeCode,
      userName: user.name,
      userEmail: user.email,
      department: user.department || "Khác",
      type: "leave",
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      durationDays: input.durationDays,
      durationShift: input.durationShift,
      reason: input.reason.trim(),
      status: "pending",
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return toSafeRequest(doc);
  },

  /**
   * Tạo đơn xin làm thêm giờ (OT) mới
   */
  async createOtRequest(
    user: { id: string; employeeCode: string; name: string; email: string; department?: string },
    input: CreateOtRequestInput
  ): Promise<LeaveOtRequest> {
    await ensureRequestsSeeded();
    const nowIso = new Date().toISOString();
    const id = `req_ot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const doc = await MongoRequestModel.create({
      id,
      userId: user.id,
      employeeCode: user.employeeCode,
      userName: user.name,
      userEmail: user.email,
      department: user.department || "Khác",
      type: "overtime",
      otType: input.otType,
      otDate: input.otDate,
      startTime: input.startTime,
      endTime: input.endTime,
      durationHours: input.durationHours,
      projectOrTask: input.projectOrTask.trim(),
      reason: input.reason.trim(),
      status: "pending",
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return toSafeRequest(doc);
  },

  /**
   * Lấy danh sách đơn xin nghỉ & OT có hỗ trợ lọc và phân trang
   */
  async getRequests(params?: {
    userId?: string;
    type?: string;
    status?: string;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedData<LeaveOtRequest>> {
    await ensureRequestsSeeded();

    const query: Record<string, unknown> = {};

    if (params?.userId) {
      query.userId = params.userId;
    }

    if (params?.type && params.type !== "all") {
      query.type = params.type;
    }

    if (params?.status && params.status !== "all") {
      query.status = params.status;
    }

    if (params?.department && params.department !== "all") {
      query.department = params.department;
    }

    if (params?.search) {
      const regex = new RegExp(params.search.trim(), "i");
      query.$or = [
        { userName: regex },
        { employeeCode: regex },
        { userEmail: regex },
        { projectOrTask: regex },
        { reason: regex },
      ];
    }

    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, Math.min(params?.limit || 20, 500));
    const skip = (page - 1) * limit;

    const total = await MongoRequestModel.countDocuments(query);
    const docs = await MongoRequestModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = Array.from(
      new Set(
        docs
          .map((d) => d.userId)
          .concat(docs.map((d) => d.approverId).filter(Boolean) as string[])
      )
    );
    const users = await MongoUserModel.find({ id: { $in: userIds } })
      .select("id avatarUrl")
      .lean();
    const avatarMap = new Map<string, string>();
    users.forEach((u) => {
      if (u.avatarUrl) avatarMap.set(u.id, u.avatarUrl);
    });

    return {
      items: docs.map((d) =>
        toSafeRequest(
          d,
          avatarMap.get(d.userId),
          d.approverId ? avatarMap.get(d.approverId) : undefined
        )
      ),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  /**
   * Duyệt đơn (Phê duyệt hoặc Từ chối) dành cho Cấp quản lý & Giám đốc
   */
  async reviewRequest(
    requestId: string,
    review: {
      approverId: string;
      approverName: string;
      status: "approved" | "rejected";
      approvalNote?: string;
    }
  ): Promise<LeaveOtRequest> {
    await ensureRequestsSeeded();
    const doc = await MongoRequestModel.findOne({ id: requestId });
    if (!doc) {
      throw new Error("Không tìm thấy đơn yêu cầu với mã cung cấp.");
    }

    if (doc.status !== "pending") {
      throw new Error(`Đơn này đã được xử lý ở trạng thái "${doc.status}", không thể thay đổi.`);
    }

    const nowIso = new Date().toISOString();
    doc.status = review.status;
    doc.approverId = review.approverId;
    doc.approverName = review.approverName;
    doc.approvalNote = review.approvalNote ? review.approvalNote.trim() : undefined;
    doc.reviewedAt = nowIso;
    doc.updatedAt = nowIso;

    await doc.save();
    return toSafeRequest(doc);
  },

  /**
   * Hủy đơn do chính người tạo thực hiện
   */
  async cancelRequest(requestId: string, userId: string): Promise<LeaveOtRequest> {
    await ensureRequestsSeeded();
    const doc = await MongoRequestModel.findOne({ id: requestId });
    if (!doc) {
      throw new Error("Không tìm thấy đơn cần hủy.");
    }

    if (doc.userId !== userId) {
      throw new Error("Bạn không có quyền hủy đơn của người khác.");
    }

    if (doc.status !== "pending") {
      throw new Error("Chỉ có thể hủy đơn khi đang ở trạng thái Chờ Duyệt (Pending).");
    }

    const nowIso = new Date().toISOString();
    doc.status = "cancelled";
    doc.updatedAt = nowIso;

    await doc.save();
    return toSafeRequest(doc);
  },

  /**
   * Thống kê tóm tắt số ngày nghỉ phép và giờ OT
   */
  async getSummaryStats(userId?: string): Promise<RequestStatsSummary> {
    await ensureRequestsSeeded();

    const query: Record<string, unknown> = {};
    if (userId) {
      query.userId = userId;
    }

    const allDocs = await MongoRequestModel.find(query).lean();

    let annualLeaveTotal = 12;
    let contractType: ContractType | undefined = undefined;
    let officialStartDate: string | undefined = undefined;

    if (userId) {
      const userDoc = await MongoUserModel.findOne({ id: userId }).lean();
      if (userDoc) {
        contractType = userDoc.contractType || "official";
        officialStartDate = userDoc.officialStartDate;

        if (contractType === "probation") {
          // Thử việc: không được nghỉ phép năm (0 phép)
          annualLeaveTotal = 0;
        } else {
          // Chính thức: Mỗi tháng tính từ lúc lên chính thức được cộng 1 phép (tối đa 12)
          const dateStr = userDoc.officialStartDate || userDoc.createdAt;
          if (dateStr) {
            const startDate = new Date(dateStr);
            if (!isNaN(startDate.getTime())) {
              const now = new Date();
              const startYear = startDate.getFullYear();
              const startMonth = startDate.getMonth() + 1; // 1-indexed (1-12)
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth() + 1; // 1-indexed (1-12)

              // Số tháng đã trôi qua tính từ tháng lên chính thức đến tháng hiện tại
              const diffMonths = (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1;
              annualLeaveTotal = Math.min(12, Math.max(0, diffMonths));
            }
          }
        }
      }
    }

    // 1. Phép năm đã dùng và còn lại
    const approvedAnnualLeaves = allDocs.filter(
      (d) => d.type === "leave" && d.leaveType === "annual" && d.status === "approved"
    );
    const annualLeaveUsed = approvedAnnualLeaves.reduce((sum, d) => sum + (d.durationDays || 0), 0);
    const annualLeaveRemaining = Math.max(0, annualLeaveTotal - annualLeaveUsed);

    // 2. Giờ OT được duyệt trong tháng hiện tại
    const currentMonthPrefix = getTodayDateString(0).slice(0, 7); // "2026-10"
    const approvedOtDocs = allDocs.filter(
      (d) =>
        d.type === "overtime" &&
        d.status === "approved" &&
        d.otDate &&
        d.otDate.startsWith(currentMonthPrefix)
    );
    const approvedOtHoursThisMonth = approvedOtDocs.reduce(
      (sum, d) => sum + (d.durationHours || 0),
      0
    );

    // 3. Đếm trạng thái đơn
    const pendingCount = allDocs.filter((d) => d.status === "pending").length;
    const approvedCount = allDocs.filter((d) => d.status === "approved").length;
    const rejectedCount = allDocs.filter((d) => d.status === "rejected").length;

    return {
      annualLeaveTotal,
      annualLeaveUsed,
      annualLeaveRemaining,
      approvedOtHoursThisMonth,
      pendingCount,
      approvedCount,
      rejectedCount,
      contractType,
      officialStartDate,
    };
  },
};

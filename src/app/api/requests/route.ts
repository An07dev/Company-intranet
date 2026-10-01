import { NextRequest } from "next/server";
import { RequestModel } from "@/server/models/request.model";
import { UserModel } from "@/server/models/user.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { CreateLeaveRequestInput, CreateOtRequestInput, RequestType } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xem danh sách đơn", 401);
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "my";
    const type = searchParams.get("type") || "all";
    const status = searchParams.get("status") || "all";
    const department = searchParams.get("department") || "all";
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Quyền truy cập: nếu scope là "my" hoặc user là employee, chỉ xem đơn của chính mình
    const isExecutive = authUser.role === "admin" || authUser.role === "director" || authUser.role === "manager";
    let targetUserId: string | undefined = authUser.userId;

    if (scope === "manage" && isExecutive) {
      targetUserId = undefined; // Quản lý & Giám đốc xem toàn bộ đơn của công ty / bộ phận
    }

    const data = await RequestModel.getRequests({
      userId: targetUserId,
      type,
      status,
      department,
      search,
      page,
      limit,
    });

    return apiSuccess(data, "Tải danh sách đơn thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi tải danh sách đơn";
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để tạo đơn", 401);
    }

    const body = await request.json().catch(() => ({}));
    const type: RequestType = body.type;

    if (!type || (type !== "leave" && type !== "overtime")) {
      return apiError("Loại đơn không hợp lệ (chỉ hỗ trợ 'leave' hoặc 'overtime')", 400);
    }

    const userProfile = {
      id: authUser.userId,
      employeeCode: authUser.employeeCode || "NV-001",
      name: authUser.name,
      email: authUser.email,
      department: authUser.department || "Khác",
    };

    const userDoc = await UserModel.findById(authUser.userId);
    const contractType = userDoc?.contractType || "official";

    if (type === "leave") {
      const { leaveType, startDate, endDate, durationDays, durationShift, reason } = body;
      if (!leaveType || !startDate || !endDate || !reason?.trim()) {
        return apiError("Vui lòng điền đầy đủ loại nghỉ phép, ngày bắt đầu, ngày kết thúc và lý do", 400);
      }

      const reqDays = Number(durationDays) || 1;

      // Kiểm tra quy định nghỉ phép cho nhân viên thử việc vs chính thức
      if (leaveType === "annual") {
        if (contractType === "probation") {
          return apiError(
            "Nhân viên trong thời gian thử việc chưa được hưởng chế độ nghỉ phép năm có lương. Quý nhân sự vui lòng chọn loại nghỉ không hưởng lương hoặc hình thức khác phù hợp.",
            400
          );
        }

        // Kiểm tra số phép khả dụng còn lại
        const userStats = await RequestModel.getSummaryStats(authUser.userId);
        if (reqDays > userStats.annualLeaveRemaining) {
          return apiError(
            `Số ngày xin nghỉ phép năm (${reqDays} ngày) vượt quá số ngày phép khả dụng hiện có (${userStats.annualLeaveRemaining} ngày). Vui lòng chọn loại nghỉ khác hoặc giảm số ngày xin nghỉ.`,
            400
          );
        }
      }

      const leaveInput: CreateLeaveRequestInput = {
        leaveType,
        startDate,
        endDate,
        durationDays: reqDays,
        durationShift: durationShift || "all_day",
        reason: reason.trim(),
      };

      const result = await RequestModel.createLeaveRequest(userProfile, leaveInput);
      return apiSuccess(result, "Gửi đơn xin nghỉ phép thành công! Đang chờ cấp quản lý phê duyệt.");
    } else {
      const { otType, otDate, startTime, endTime, durationHours, projectOrTask, reason } = body;
      if (!otType || !otDate || !startTime || !endTime || !reason?.trim() || !projectOrTask?.trim()) {
        return apiError("Vui lòng điền đầy đủ ngày làm thêm, khung giờ, dự án và lý do làm thêm giờ", 400);
      }

      const otInput: CreateOtRequestInput = {
        otType,
        otDate,
        startTime,
        endTime,
        durationHours: Number(durationHours) || 2,
        projectOrTask: projectOrTask.trim(),
        reason: reason.trim(),
      };

      const result = await RequestModel.createOtRequest(userProfile, otInput);
      return apiSuccess(result, "Gửi đơn xin làm thêm giờ (OT) thành công! Đang chờ cấp quản lý phê duyệt.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tạo đơn thất bại";
    return apiError(message, 400);
  }
}

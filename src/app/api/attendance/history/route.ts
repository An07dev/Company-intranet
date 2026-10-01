import { NextRequest } from "next/server";
import { AttendanceModel } from "@/server/models/attendance.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

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

    // Phân quyền dữ liệu: Mặc định luôn hiển thị bản ghi của chính mình ("my")
    // Chỉ khi có quyền (admin/director/manager) VÀ yêu cầu rõ scope="all" mới hiển thị toàn bộ
    let filterUserId: string | undefined = user.userId;
    if (isPrivileged && scope === "all") {
      filterUserId = requestedUserId || undefined;
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const paginatedResult = await AttendanceModel.getHistory({
      userId: filterUserId,
      employeeCode,
      date,
      startDate,
      endDate,
      status,
      search,
      page,
      limit,
    });

    return apiSuccess(paginatedResult, "Lấy lịch sử chấm công thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy lịch sử chấm công";
    return apiError(message, 500);
  }
}

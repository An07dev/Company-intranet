import { NextRequest } from "next/server";
import { RequestModel } from "@/server/models/request.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xem thông tin thống kê", 401);
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "my";

    const isExecutive =
      authUser.role === "admin" || authUser.role === "director" || authUser.role === "manager";
    const targetUserId = scope === "manage" && isExecutive ? undefined : authUser.userId;

    const stats = await RequestModel.getSummaryStats(targetUserId);

    return apiSuccess(stats, "Tải thống kê đơn thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi tải thống kê đơn";
    return apiError(message, 500);
  }
}

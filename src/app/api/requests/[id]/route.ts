import { NextRequest } from "next/server";
import { RequestModel } from "@/server/models/request.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để thực hiện thao tác", 401);
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    // Trường hợp 1: Người dùng tự hủy đơn của chính mình
    if (body.action === "cancel") {
      const cancelled = await RequestModel.cancelRequest(id, authUser.userId);
      return apiSuccess(cancelled, "Đã hủy đơn yêu cầu thành công.");
    }

    // Trường hợp 2: Duyệt đơn (Approved / Rejected) - Quy định: Tất cả các đơn đều phải qua Giám đốc duyệt
    const isDirectorOrAdmin = authUser.role === "director" || authUser.role === "admin";

    if (!isDirectorOrAdmin) {
      return apiError("Tất cả các đơn xin nghỉ phép và đơn OT đều bắt buộc phải do Giám đốc trực tiếp phê duyệt.", 403);
    }

    const { status, approvalNote } = body;
    if (status !== "approved" && status !== "rejected") {
      return apiError("Trạng thái xử lý không hợp lệ (phải là 'approved' hoặc 'rejected')", 400);
    }

    const reviewed = await RequestModel.reviewRequest(id, {
      approverId: authUser.userId,
      approverName: authUser.name,
      status,
      approvalNote,
    });

    const statusText = status === "approved" ? "phê duyệt" : "từ chối";
    return apiSuccess(reviewed, `Đã ${statusText} đơn yêu cầu thành công.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Xử lý đơn thất bại";
    return apiError(message, 400);
  }
}

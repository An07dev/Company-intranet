import { NextRequest } from "next/server";
import { AssetModel } from "@/server/models/asset.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { HandoverAssetInput } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/assets/[id]/handover
 * Bàn giao tài sản cho nhân viên
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập", 401);
    }

    if (!["admin", "director", "manager"].includes(authUser.role)) {
      return apiError("Bạn không có quyền thực hiện bàn giao tài sản", 403);
    }

    const { id } = await params;
    const body = (await request.json()) as HandoverAssetInput;

    if (!body.assigneeId) {
      return apiError("Vui lòng chọn nhân sự tiếp nhận bàn giao", 400);
    }

    const performer = {
      id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
      employeeCode: authUser.employeeCode,
      role: authUser.role,
      department: authUser.department,
    };

    const updated = await AssetModel.handoverAsset(id, body, performer);
    return apiSuccess(updated, `Đã bàn giao tài sản thành công cho nhân viên ${updated.currentAssigneeName}`);
  } catch (error) {
    console.error("POST /api/assets/[id]/handover error:", error);
    return apiError(error instanceof Error ? error.message : "Lỗi khi thực hiện bàn giao tài sản", 400);
  }
}

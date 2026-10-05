import { NextRequest } from "next/server";
import { AssetModel } from "@/server/models/asset.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { RecallAssetInput } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/assets/[id]/recall
 * Thu hồi tài sản từ nhân viên về kho / bảo dưỡng
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập", 401);
    }

    if (!["admin", "director", "manager"].includes(authUser.role)) {
      return apiError("Bạn không có quyền thu hồi tài sản", 403);
    }

    const { id } = await params;
    const body = (await request.json()) as RecallAssetInput;

    const performer = {
      id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
      employeeCode: authUser.employeeCode,
      role: authUser.role,
      department: authUser.department,
    };

    const updated = await AssetModel.recallAsset(id, body, performer);
    return apiSuccess(updated, "Đã thu hồi tài sản thành công về kho lưu trữ");
  } catch (error) {
    console.error("POST /api/assets/[id]/recall error:", error);
    return apiError(error instanceof Error ? error.message : "Lỗi khi thu hồi tài sản", 400);
  }
}

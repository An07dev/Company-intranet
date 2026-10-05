import { NextRequest } from "next/server";
import { AssetModel } from "@/server/models/asset.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { UpdateAssetInput } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/assets/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập", 401);
    }

    const { id } = await params;
    const asset = await AssetModel.getAssetById(id);
    if (!asset) {
      return apiError("Không tìm thấy thông tin tài sản", 404);
    }

    return apiSuccess(asset, "Lấy thông tin tài sản thành công");
  } catch (error) {
    console.error("GET /api/assets/[id] error:", error);
    return apiError(error instanceof Error ? error.message : "Lỗi khi lấy tài sản", 500);
  }
}

/**
 * PUT /api/assets/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập", 401);
    }

    if (!["admin", "director", "manager"].includes(authUser.role)) {
      return apiError("Bạn không có quyền chỉnh sửa tài sản", 403);
    }

    const { id } = await params;
    const body = (await request.json()) as UpdateAssetInput;

    const updated = await AssetModel.updateAsset(id, body);
    if (!updated) {
      return apiError("Không tìm thấy tài sản để cập nhật", 404);
    }

    return apiSuccess(updated, "Cập nhật tài sản thành công");
  } catch (error) {
    console.error("PUT /api/assets/[id] error:", error);
    return apiError(error instanceof Error ? error.message : "Lỗi khi cập nhật tài sản", 500);
  }
}

/**
 * DELETE /api/assets/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập", 401);
    }

    if (!["admin", "director", "manager"].includes(authUser.role)) {
      return apiError("Bạn không có quyền xóa tài sản", 403);
    }

    const { id } = await params;
    const success = await AssetModel.deleteAsset(id);
    if (!success) {
      return apiError("Không tìm thấy tài sản để xóa", 404);
    }

    return apiSuccess({ deleted: true }, "Đã xóa tài sản thành công");
  } catch (error) {
    console.error("DELETE /api/assets/[id] error:", error);
    return apiError(error instanceof Error ? error.message : "Lỗi khi xóa tài sản", 500);
  }
}

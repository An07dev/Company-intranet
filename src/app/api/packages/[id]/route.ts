import { NextRequest } from "next/server";
import { PackageModel } from "@/server/models/package.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { UpdatePackageInput, PackageStatus } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/packages/[id]
 * Lấy chi tiết kiện hàng theo ID hoặc Mã kiện hàng
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xem kiện hàng", 401);
    }

    const { id } = await params;
    const pkg = await PackageModel.getPackageByIdOrCode(id);

    if (!pkg) {
      return apiError("Không tìm thấy kiện hàng", 404);
    }

    return apiSuccess(pkg);
  } catch (error: any) {
    console.error("GET /api/packages/[id] error:", error);
    return apiError(error.message || "Lỗi khi lấy thông tin kiện hàng", 500);
  }
}

/**
 * PUT /api/packages/[id]
 * Cập nhật thông tin kiện hàng
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để cập nhật kiện hàng", 401);
    }

    const { id } = await params;
    const body: UpdatePackageInput = await request.json();

    const user = {
      id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
    };

    const updated = await PackageModel.updatePackage(id, body, user);

    if (!updated) {
      return apiError("Không tìm thấy kiện hàng để cập nhật", 404);
    }

    return apiSuccess(updated, "Cập nhật kiện hàng thành công");
  } catch (error: any) {
    console.error("PUT /api/packages/[id] error:", error);
    return apiError(error.message || "Lỗi khi cập nhật kiện hàng", 500);
  }
}

/**
 * PATCH /api/packages/[id]
 * Cập nhật nhanh trạng thái kiện hàng (draft, packed, in_transit, delivered, cancelled)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để thao tác", 401);
    }

    const { id } = await params;
    const body = await request.json();
    const status: PackageStatus = body.status;

    if (!status || !["draft", "packed", "in_transit", "delivered", "cancelled"].includes(status)) {
      return apiError("Trạng thái không hợp lệ", 400);
    }

    const updated = await PackageModel.updateStatus(id, status, authUser.name);

    if (!updated) {
      return apiError("Không tìm thấy kiện hàng để đổi trạng thái", 404);
    }

    return apiSuccess(updated, "Cập nhật trạng thái thành công");
  } catch (error: any) {
    console.error("PATCH /api/packages/[id] error:", error);
    return apiError(error.message || "Lỗi khi cập nhật trạng thái kiện hàng", 500);
  }
}

/**
 * DELETE /api/packages/[id]
 * Xóa kiện hàng
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xóa kiện hàng", 401);
    }

    const { id } = await params;
    const success = await PackageModel.deletePackage(id);

    if (!success) {
      return apiError("Không tìm thấy kiện hàng để xóa", 404);
    }

    return apiSuccess({ deleted: true }, "Đã xóa kiện hàng thành công");
  } catch (error: any) {
    console.error("DELETE /api/packages/[id] error:", error);
    return apiError(error.message || "Lỗi khi xóa kiện hàng", 500);
  }
}

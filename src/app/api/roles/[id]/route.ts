import { NextRequest } from "next/server";
import { RoleModel } from "@/server/models/role.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { UpdateRoleInput } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/roles/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xem vai trò", 401);
    }

    const { id } = await params;
    const role = await RoleModel.getRoleById(id);
    if (!role) {
      return apiError("Không tìm thấy vai trò", 404);
    }

    return apiSuccess(role, "Lấy thông tin vai trò thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy thông tin vai trò";
    return apiError(message, 500);
  }
}

/**
 * PUT /api/roles/[id]
 * Cập nhật vai trò (chỉ Admin/Giám đốc)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "director")) {
      return apiError("Chỉ Quản trị viên hoặc Giám đốc mới có quyền chỉnh sửa vai trò", 403);
    }

    const { id } = await params;
    const body = (await request.json().catch(() => null)) as UpdateRoleInput;
    if (!body) {
      return apiError("Dữ liệu gửi lên không hợp lệ", 400);
    }

    const updated = await RoleModel.updateRole(id, body, authUser.role);
    return apiSuccess(updated, "Cập nhật vai trò thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi cập nhật vai trò";
    return apiError(message, 400);
  }
}

/**
 * DELETE /api/roles/[id]
 * Xóa vai trò (chỉ Admin/Giám đốc, không xóa role hệ thống hoặc role đang có nhân sự)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "director")) {
      return apiError("Chỉ Quản trị viên hoặc Giám đốc mới có quyền xóa vai trò", 403);
    }

    const { id } = await params;
    await RoleModel.deleteRole(id, authUser.role);

    return apiSuccess({ deleted: true }, "Đã xóa vai trò thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi xóa vai trò";
    return apiError(message, 400);
  }
}

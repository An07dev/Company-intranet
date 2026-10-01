import { NextRequest } from "next/server";
import { userService } from "@/server/services/user.service";
import { apiError, apiSuccess } from "@/server/utils/response";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { UserRole, UserStatus, ContractType } from "@/types";

const VALID_ROLES: UserRole[] = ["admin", "director", "manager", "employee"];
const VALID_STATUSES: UserStatus[] = ["active", "inactive", "suspended"];
const VALID_CONTRACT_TYPES: ContractType[] = ["probation", "official"];

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]
 * Lấy thông tin chi tiết một người dùng
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await userService.getById(id);

    if (!user) {
      return apiError(`Không tìm thấy người dùng với ID: ${id}`, 404);
    }

    return apiSuccess(user, "Lấy thông tin người dùng thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi máy chủ";
    return apiError(message, 500);
  }
}

/**
 * PUT / PATCH /api/users/[id]
 * Cập nhật thông tin hoặc role của người dùng
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "director")) {
      return apiError("Chỉ Quản trị viên hoặc Giám đốc mới có quyền chỉnh sửa người dùng", 403);
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body) {
      return apiError("Thiếu dữ liệu cập nhật", 400);
    }

    // Kiểm tra role nếu có gửi lên
    if (body.role && !VALID_ROLES.includes(body.role)) {
      return apiError(
        `Role không hợp lệ. Chỉ chấp nhận: ${VALID_ROLES.join(", ")}`,
        400
      );
    }

    // Kiểm tra status nếu có gửi lên
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return apiError(
        `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }

    // Kiểm tra contractType nếu có gửi lên
    if (body.contractType && !VALID_CONTRACT_TYPES.includes(body.contractType)) {
      return apiError(
        `Loại hợp đồng không hợp lệ. Chỉ chấp nhận: ${VALID_CONTRACT_TYPES.join(", ")} (probation, official)`,
        400
      );
    }

    const updatedUser = await userService.update(id, body);

    if (!updatedUser) {
      return apiError(`Không tìm thấy người dùng với ID: ${id}`, 404);
    }

    return apiSuccess(updatedUser, "Cập nhật thông tin người dùng thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi cập nhật";
    return apiError(message, 400);
  }
}

export { PUT as PATCH };

/**
 * DELETE /api/users/[id]
 * Xóa người dùng
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "director")) {
      return apiError("Chỉ Quản trị viên hoặc Giám đốc mới có quyền xóa người dùng", 403);
    }

    const { id } = await params;

    if (authUser.userId === id) {
      return apiError("Bạn không thể tự xóa tài khoản của chính mình", 400);
    }

    const deleted = await userService.delete(id);

    if (!deleted) {
      return apiError(`Không tìm thấy người dùng với ID: ${id}`, 404);
    }

    return apiSuccess({ id, deleted: true }, "Đã xóa người dùng thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi xóa người dùng";
    return apiError(message, 500);
  }
}

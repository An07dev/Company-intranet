import { NextRequest } from "next/server";
import { RoleModel, SYSTEM_PAGES } from "@/server/models/role.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { CreateRoleInput } from "@/types";

/**
 * GET /api/roles
 * Lấy danh sách toàn bộ roles và danh mục SYSTEM_PAGES
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xem danh sách vai trò", 401);
    }

    const roles = await RoleModel.getRoles();

    return apiSuccess(
      {
        roles,
        systemPages: SYSTEM_PAGES,
      },
      "Lấy danh sách vai trò thành công"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy danh sách vai trò";
    return apiError(message, 500);
  }
}

/**
 * POST /api/roles
 * Tạo vai trò mới (chỉ Admin và Giám đốc)
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "director")) {
      return apiError("Chỉ Quản trị viên hoặc Giám đốc mới có quyền tạo vai trò", 403);
    }

    const body = (await request.json().catch(() => null)) as CreateRoleInput;
    if (!body || !body.name) {
      return apiError("Tên vai trò là bắt buộc", 400);
    }

    const newRole = await RoleModel.createRole(body, authUser.role);

    return apiSuccess(newRole, "Tạo vai trò mới thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi tạo vai trò";
    return apiError(message, 400);
  }
}

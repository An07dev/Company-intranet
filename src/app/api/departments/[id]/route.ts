import { NextRequest } from "next/server";
import { DepartmentModel } from "@/server/models/department.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { UpdateDepartmentInput } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/departments/[id]
 * Lấy chi tiết phòng ban kèm danh sách nhân sự
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xem thông tin", 401);
    }

    const { id } = await params;
    const dept = await DepartmentModel.findById(id);

    if (!dept) {
      return apiError(`Không tìm thấy phòng ban với mã ID: ${id}`, 404);
    }

    return apiSuccess(dept, "Lấy thông tin phòng ban thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi máy chủ";
    return apiError(message, 500);
  }
}

/**
 * PUT /api/departments/[id]
 * Cập nhật thông tin phòng ban
 * Phân quyền: Chỉ Quản trị viên (admin) hoặc Giám đốc (director).
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "director")) {
      return apiError("Chỉ Quản trị viên hoặc Giám đốc mới có quyền chỉnh sửa phòng ban", 403);
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body) {
      return apiError("Thiếu dữ liệu cập nhật", 400);
    }

    const input: UpdateDepartmentInput = {
      name: body.name?.trim(),
      code: body.code?.trim()?.toUpperCase(),
      description: body.description?.trim(),
      location: body.location?.trim(),
      managerId: body.managerId,
    };

    const updated = await DepartmentModel.update(id, input);

    if (!updated) {
      return apiError(`Không tìm thấy phòng ban với mã ID: ${id}`, 404);
    }

    return apiSuccess(updated, "Cập nhật phòng ban thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi cập nhật phòng ban";
    return apiError(message, 400);
  }
}

/**
 * DELETE /api/departments/[id]
 * Xóa phòng ban
 * Phân quyền: Chỉ Quản trị viên (admin) hoặc Giám đốc (director).
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "director")) {
      return apiError("Chỉ Quản trị viên hoặc Giám đốc mới có quyền xóa phòng ban", 403);
    }

    const { id } = await params;
    const deleted = await DepartmentModel.delete(id);

    if (!deleted) {
      return apiError(`Không tìm thấy phòng ban với mã ID: ${id}`, 404);
    }

    return apiSuccess({ id }, "Xóa phòng ban thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi xóa phòng ban";
    return apiError(message, 400);
  }
}

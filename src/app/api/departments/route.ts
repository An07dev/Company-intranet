import { NextRequest } from "next/server";
import { DepartmentModel } from "@/server/models/department.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { CreateDepartmentInput } from "@/types";

/**
 * GET /api/departments
 * Lấy danh sách tất cả phòng ban kèm thông tin trưởng phòng và số lượng nhân sự
 * Hỗ trợ tất cả các role xem được.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xem thông tin phòng ban", 401);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const departments = await DepartmentModel.findAll({ search });

    return apiSuccess(departments, "Lấy danh sách phòng ban thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy danh sách phòng ban";
    return apiError(message, 500);
  }
}

/**
 * POST /api/departments
 * Tạo mới một phòng ban trong doanh nghiệp
 * Phân quyền: Chỉ Quản trị viên (admin) hoặc Giám đốc (director) được tạo.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "director")) {
      return apiError("Chỉ Quản trị viên hoặc Giám đốc mới có quyền tạo phòng ban", 403);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return apiError("Thiếu dữ liệu gửi lên", 400);
    }

    const { name, code, description, location, managerId } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return apiError("Tên phòng ban là bắt buộc", 400);
    }

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return apiError("Mã phòng ban là bắt buộc", 400);
    }

    const input: CreateDepartmentInput = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim(),
      location: location?.trim(),
      managerId: managerId || undefined,
    };

    const newDept = await DepartmentModel.create(input);

    return apiSuccess(newDept, "Tạo phòng ban mới thành công", 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi tạo phòng ban";
    return apiError(message, 400);
  }
}

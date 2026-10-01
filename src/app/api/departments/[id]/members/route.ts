import { NextRequest } from "next/server";
import { DepartmentModel } from "@/server/models/department.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { AdjustDepartmentMembersInput } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/departments/[id]/members
 * Điều chỉnh nhân sự trong phòng ban: Thêm nhân sự, gỡ nhân sự, hoặc chỉ định Trưởng phòng
 * Phân quyền: Chỉ Quản trị viên (admin) hoặc Giám đốc (director).
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "director")) {
      return apiError("Chỉ Quản trị viên hoặc Giám đốc mới có quyền điều chỉnh nhân sự phòng ban", 403);
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body || !body.action) {
      return apiError("Thiếu thông tin thao tác nhân sự (action: 'add' | 'remove' | 'set_manager')", 400);
    }

    const action = body.action;
    if (action !== "add" && action !== "remove" && action !== "set_manager") {
      return apiError("Thao tác không hợp lệ. Chỉ chấp nhận 'add', 'remove', hoặc 'set_manager'", 400);
    }

    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];

    const input: AdjustDepartmentMembersInput = {
      action,
      userIds,
    };

    const updatedDept = await DepartmentModel.adjustMembers(id, input);

    let message = "Điều chỉnh nhân sự phòng ban thành công";
    if (action === "add") message = `Đã bổ sung ${userIds.length} nhân sự vào phòng ban`;
    if (action === "remove") message = `Đã rút ${userIds.length} nhân sự khỏi phòng ban`;
    if (action === "set_manager") message = "Đã cập nhật Trưởng phòng ban thành công";

    return apiSuccess(updatedDept, message);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi điều chỉnh nhân sự phòng ban";
    return apiError(message, 400);
  }
}

export { PUT as POST };

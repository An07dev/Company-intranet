import { NextRequest } from "next/server";
import { TaskModel } from "@/server/models/task.model";
import { MongoTaskModel } from "@/server/db/schema";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { toSafeTask } from "@/server/models/task.model";
import { UpdateTaskInput } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xem công việc", 401);
    }

    const { id } = await params;
    const taskDoc = await MongoTaskModel.findOne({ id }).lean();
    if (!taskDoc) {
      return apiError("Không tìm thấy công việc", 404);
    }

    return apiSuccess(toSafeTask(taskDoc), "Lấy chi tiết công việc thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy chi tiết công việc";
    return apiError(message, 500);
  }
}

/**
 * PUT /api/tasks/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để cập nhật công việc", 401);
    }

    const { id } = await params;
    const body = (await request.json().catch(() => null)) as UpdateTaskInput;
    if (!body) {
      return apiError("Dữ liệu gửi lên không hợp lệ", 400);
    }

    const currentUser = {
      id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
      employeeCode: authUser.employeeCode,
      role: authUser.role,
      department: authUser.department,
    };

    const updatedTask = await TaskModel.updateTask(id, body, currentUser);
    return apiSuccess(updatedTask, "Cập nhật công việc thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi cập nhật công việc";
    return apiError(message, 400);
  }
}

/**
 * DELETE /api/tasks/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xóa công việc", 401);
    }

    const { id } = await params;

    const currentUser = {
      id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
      employeeCode: authUser.employeeCode,
      role: authUser.role,
      department: authUser.department,
    };

    await TaskModel.deleteTask(id, currentUser);
    return apiSuccess({ deleted: true }, "Đã xóa công việc thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi xóa công việc";
    return apiError(message, 400);
  }
}

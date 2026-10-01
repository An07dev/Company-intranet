import { NextRequest } from "next/server";
import { TaskModel } from "@/server/models/task.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { CreateTaskInput, TaskFilterParams, TaskPriority, TaskStatus } from "@/types";

/**
 * GET /api/tasks
 * Lấy danh sách công việc theo phân quyền và các tham số lọc:
 * - tab: 'all' | 'assigned_to_me' | 'created_by_me' | 'department'
 * - status, priority, department, search, page, limit
 * - stats: boolean (nếu true, trả về cả stats count)
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để xem danh sách công việc", 401);
    }

    const { searchParams } = new URL(request.url);
    const tab = (searchParams.get("tab") as TaskFilterParams["tab"]) || "all";
    const status = (searchParams.get("status") as TaskStatus | "all") || "all";
    const priority = (searchParams.get("priority") as TaskPriority | "all") || "all";
    const department = searchParams.get("department") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "200", 10);
    const includeStats = searchParams.get("stats") === "true";

    const currentUser = {
      id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
      employeeCode: authUser.employeeCode,
      role: authUser.role,
      department: authUser.department,
    };

    const result = await TaskModel.getTasks(
      {
        tab,
        status,
        priority,
        department,
        search,
        page,
        limit,
      },
      currentUser
    );

    let stats = null;
    if (includeStats) {
      stats = await TaskModel.getStats(currentUser);
    }

    return apiSuccess(
      {
        ...result,
        stats,
      },
      "Tải danh sách công việc thành công"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy danh sách công việc";
    return apiError(message, 500);
  }
}

/**
 * POST /api/tasks
 * Tạo mới một công việc
 * Phân quyền:
 * - Nhân viên: Tự tạo cho mình
 * - Quản lý: Tạo cho nhân viên cùng phòng ban hoặc cho mình
 * - Giám đốc & Admin: Tạo cho bất kỳ ai
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để tạo công việc", 401);
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.title) {
      return apiError("Vui lòng nhập tiêu đề công việc", 400);
    }

    const currentUser = {
      id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
      employeeCode: authUser.employeeCode,
      role: authUser.role,
      department: authUser.department,
    };

    const input: CreateTaskInput = {
      title: body.title,
      description: body.description,
      assigneeId: body.assigneeId,
      department: body.department,
      priority: body.priority,
      dueDate: body.dueDate,
      checklist: body.checklist,
    };

    const task = await TaskModel.createTask(input, currentUser);
    return apiSuccess(task, "Tạo công việc mới thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi tạo công việc";
    return apiError(message, 400);
  }
}

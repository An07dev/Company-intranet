import { NextRequest } from "next/server";
import { userService } from "@/server/services/user.service";
import { apiError, apiSuccess } from "@/server/utils/response";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { UserRole, UserStatus, ContractType } from "@/types";

const VALID_ROLES: UserRole[] = ["admin", "director", "manager", "employee"];
const VALID_STATUSES: UserStatus[] = ["active", "inactive", "suspended"];
const VALID_CONTRACT_TYPES: ContractType[] = ["probation", "official"];

/**
 * GET /api/users
 * Lấy danh sách users có hỗ trợ filter theo role, tìm kiếm và phân trang
 * Ví dụ:
 * - GET /api/users?role=director
 * - GET /api/users?search=Admin&page=1&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const roleParam = searchParams.get("role") as UserRole | null;
    const statusParam = searchParams.get("status") as UserStatus | null;
    const contractTypeParam = searchParams.get("contractType") as ContractType | null;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const role = roleParam && VALID_ROLES.includes(roleParam) ? roleParam : undefined;
    const status = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : undefined;
    const contractType = contractTypeParam && VALID_CONTRACT_TYPES.includes(contractTypeParam) ? contractTypeParam : undefined;

    const result = await userService.getAll({
      role,
      status,
      contractType,
      search,
      page,
      limit,
    });

    return apiSuccess(result, "Lấy danh sách người dùng thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy danh sách người dùng";
    return apiError(message, 500);
  }
}

/**
 * POST /api/users
 * Tạo mới một tài khoản user với role (admin, director, manager, employee)
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "director")) {
      return apiError("Chỉ Quản trị viên hoặc Giám đốc mới có quyền tạo người dùng", 403);
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return apiError("Thiếu dữ liệu gửi lên", 400);
    }

    const {
      employeeCode,
      name,
      email,
      password,
      role,
      phone,
      department,
      avatarUrl,
      status,
      contractType,
      officialStartDate,
    } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return apiError("Tên người dùng là bắt buộc", 400);
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return apiError("Email không hợp lệ", 400);
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return apiError(
        `Role không hợp lệ. Chỉ chấp nhận một trong các role: ${VALID_ROLES.join(", ")} (admin, director, manager, employee)`,
        400
      );
    }

    if (contractType && !VALID_CONTRACT_TYPES.includes(contractType)) {
      return apiError("Loại hợp đồng không hợp lệ. Chỉ chấp nhận 'probation' (Thử việc) hoặc 'official' (Chính thức)", 400);
    }

    const newUser = await userService.create({
      employeeCode: employeeCode?.trim() || undefined,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      phone,
      department,
      avatarUrl,
      status: status || "active",
      contractType: contractType || "official",
      officialStartDate: contractType === "probation" ? undefined : officialStartDate,
    });

    return apiSuccess(newUser, "Tạo người dùng mới thành công", 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi tạo người dùng";
    return apiError(message, 400);
  }
}

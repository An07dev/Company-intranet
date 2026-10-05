import { NextRequest } from "next/server";
import { AssetModel } from "@/server/models/asset.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { CreateAssetInput } from "@/types";

/**
 * GET /api/assets
 * Lấy danh sách tài sản theo phân trang, tìm kiếm và bộ lọc
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để truy cập danh sách tài sản", 401);
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "all";
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const assigneeId = searchParams.get("assigneeId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const includeStats = searchParams.get("stats") === "true";

    const currentUser = {
      id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
      employeeCode: authUser.employeeCode,
      role: authUser.role,
      department: authUser.department,
    };

    const result = await AssetModel.getAssets(
      {
        tab,
        category,
        status,
        search,
        assigneeId,
        page,
        limit,
      },
      currentUser
    );

    let stats = null;
    if (includeStats) {
      stats = await AssetModel.getStats(currentUser);
    }

    return apiSuccess({
      ...result,
      stats,
    });
  } catch (error) {
    console.error("GET /api/assets error:", error);
    return apiError(error instanceof Error ? error.message : "Lỗi máy chủ khi lấy danh sách tài sản", 500);
  }
}

/**
 * POST /api/assets
 * Tạo tài sản mới (Chỉ dành cho Admin, Giám đốc, Quản lý)
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập", 401);
    }

    if (!["admin", "director", "manager"].includes(authUser.role)) {
      return apiError("Bạn không có quyền thêm mới tài sản công ty", 403);
    }

    const body = (await request.json()) as CreateAssetInput;

    if (!body.name || !body.name.trim()) {
      return apiError("Tên sản phẩm / tài sản là bắt buộc", 400);
    }

    if (!body.code || !body.code.trim()) {
      body.code = `SP-${Math.floor(100 + Math.random() * 900)}`;
    }

    if (!body.category) {
      body.category = "it_equipment";
    }

    const currentUser = {
      id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
      employeeCode: authUser.employeeCode,
      role: authUser.role,
      department: authUser.department,
    };

    const newAsset = await AssetModel.createAsset(body, currentUser);
    return apiSuccess(newAsset, "Thêm mới tài sản thành công", 201);
  } catch (error) {
    console.error("POST /api/assets error:", error);
    return apiError(error instanceof Error ? error.message : "Lỗi khi thêm mới tài sản", 500);
  }
}

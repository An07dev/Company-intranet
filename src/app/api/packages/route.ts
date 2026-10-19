import { NextRequest } from "next/server";
import { PackageModel } from "@/server/models/package.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { CreatePackageInput } from "@/types";

/**
 * GET /api/packages
 * Lấy danh sách kiện hàng theo phân trang và bộ lọc, kèm theo thống kê
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để truy cập danh sách kiện hàng", 401);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const package_type = searchParams.get("package_type") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") as any) || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const includeStats = searchParams.get("stats") !== "false";

    const result = await PackageModel.getPackages({
      search,
      status,
      package_type,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    let stats = null;
    if (includeStats) {
      stats = await PackageModel.getStats();
    }

    return apiSuccess({
      ...result,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/packages error:", error);
    return apiError(error.message || "Lỗi khi lấy danh sách kiện hàng", 500);
  }
}

/**
 * POST /api/packages
 * Tạo kiện hàng mới
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để tạo kiện hàng", 401);
    }

    const body: CreatePackageInput = await request.json();

    if (!body.title || !body.title.trim()) {
      return apiError("Vui lòng nhập tên hoặc mô tả kiện hàng", 400);
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return apiError("Kiện hàng phải có ít nhất 1 sản phẩm", 400);
    }

    // Kiểm tra tính hợp lệ của từng sản phẩm trong kiện
    for (const item of body.items) {
      if (!item.product_name || !item.product_name.trim()) {
        return apiError("Tên sản phẩm không được để trống", 400);
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        return apiError(`Số lượng sản phẩm "${item.product_name}" phải lớn hơn 0`, 400);
      }
    }

    const user = {
      id: authUser.userId,
      name: authUser.name,
      email: authUser.email,
    };

    const pkg = await PackageModel.createPackage(body, user);

    return apiSuccess(pkg, "Tạo kiện hàng thành công", 201);
  } catch (error: any) {
    console.error("POST /api/packages error:", error);
    return apiError(error.message || "Lỗi khi tạo kiện hàng mới", 500);
  }
}

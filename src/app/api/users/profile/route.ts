import { NextRequest } from "next/server";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { UserModel } from "@/server/models/user.model";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/profile
 * Lấy thông tin hồ sơ của người dùng đang đăng nhập
 */
export async function GET() {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn chưa đăng nhập hoặc phiên đã hết hạn", 401);
    }

    const user = await UserModel.findById(authUser.userId);
    if (!user) {
      return apiError("Không tìm thấy thông tin tài khoản", 404);
    }

    return apiSuccess(user, "Lấy thông tin cá nhân thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi máy chủ";
    return apiError(message, 500);
  }
}

/**
 * PUT /api/users/profile
 * Cập nhật thông tin hồ sơ (Họ tên, Số điện thoại, Ảnh đại diện)
 */
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn chưa đăng nhập hoặc phiên đã hết hạn", 401);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return apiError("Thiếu dữ liệu cập nhật", 400);
    }

    const { name, phone, avatarUrl } = body;

    if (name !== undefined && !name.trim()) {
      return apiError("Họ và tên không được để trống", 400);
    }

    const updatedUser = await UserModel.updateProfile(authUser.userId, {
      name,
      phone,
      avatarUrl,
    });

    return apiSuccess(updatedUser, "Cập nhật thông tin cá nhân thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi cập nhật thông tin";
    return apiError(message, 400);
  }
}

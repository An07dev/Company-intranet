import { NextRequest } from "next/server";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { UserModel } from "@/server/models/user.model";

export const dynamic = "force-dynamic";

/**
 * POST / PUT /api/users/profile/password
 * Đổi mật khẩu tài khoản người dùng
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn chưa đăng nhập hoặc phiên đã hết hạn", 401);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return apiError("Thiếu dữ liệu yêu cầu", 400);
    }

    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword) {
      return apiError("Vui lòng nhập mật khẩu hiện tại", 400);
    }

    if (!newPassword || newPassword.length < 6) {
      return apiError("Mật khẩu mới phải có tối thiểu 6 ký tự", 400);
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return apiError("Xác nhận mật khẩu mới không khớp", 400);
    }

    await UserModel.changePassword(authUser.userId, currentPassword, newPassword);

    return apiSuccess(null, "Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới của bạn.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Đổi mật khẩu thất bại";
    return apiError(message, 400);
  }
}

export { POST as PUT };

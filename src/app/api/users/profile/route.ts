import { NextRequest } from "next/server";
import { getAuthUserFromCookies, signAuthToken, AUTH_COOKIE_NAME } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { UserModel } from "@/server/models/user.model";
import { cookies } from "next/headers";

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
 * Cập nhật thông tin hồ sơ (Họ tên, Email, Số điện thoại, Ảnh đại diện)
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

    const { name, email, phone, avatarUrl } = body;

    if (name !== undefined && !name.trim()) {
      return apiError("Họ và tên không được để trống", 400);
    }

    if (email !== undefined) {
      const emailTrim = email.trim();
      if (!emailTrim || !emailTrim.includes("@")) {
        return apiError("Địa chỉ email không hợp lệ", 400);
      }
    }

    const updatedUser = await UserModel.updateProfile(authUser.userId, {
      name,
      email: email !== undefined ? email.trim().toLowerCase() : undefined,
      phone,
      avatarUrl,
    });

    // Nếu email thay đổi, cập nhật lại token & session cookie
    if (email && email.trim().toLowerCase() !== authUser.email.toLowerCase()) {
      try {
        const token = signAuthToken(
          {
            userId: updatedUser.id,
            employeeCode: updatedUser.employeeCode,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            department: updatedUser.department,
          },
          86400 * 7
        );
        const cookieStore = await cookies();
        cookieStore.set(AUTH_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 86400 * 7,
        });
      } catch (cookieErr) {
        console.error("Lỗi khi cập nhật cookie phiên sau khi đổi email:", cookieErr);
      }
    }

    return apiSuccess(updatedUser, "Cập nhật thông tin cá nhân thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi cập nhật thông tin";
    return apiError(message, 400);
  }
}

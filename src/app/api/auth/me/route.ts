import { NextRequest } from "next/server";
import { authService } from "@/server/services/auth.service";
import { apiError, apiSuccess } from "@/server/utils/response";
import { AUTH_COOKIE_NAME } from "@/server/utils/auth";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // 1. Kiểm tra Cookie
    const cookieStore = await cookies();
    let token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    // 2. Nếu không có cookie, kiểm tra Header Authorization Bearer
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401);
    }

    const user = await authService.getUserByToken(token);
    if (!user) {
      return apiError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn", 401);
    }

    return apiSuccess({ user }, "Xác thực phiên thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Xác thực thất bại";
    return apiError(message, 500);
  }
}

import { NextRequest } from "next/server";
import { authService } from "@/server/services/auth.service";
import { apiError, apiSuccess } from "@/server/utils/response";
import { AUTH_COOKIE_NAME } from "@/server/utils/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.email || !body.password) {
      return apiError("Vui lòng nhập đầy đủ Email và Mật khẩu", 400);
    }

    const session = await authService.login({
      email: body.email,
      password: body.password,
      rememberMe: Boolean(body.rememberMe),
    });

    // Thiết lập HttpOnly Cookie bảo mật
    const cookieStore = await cookies();
    const maxAge = body.rememberMe ? 86400 * 30 : 86400 * 1;

    cookieStore.set(AUTH_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return apiSuccess(
      {
        user: session.user,
        token: session.token,
        expiresAt: session.expiresAt,
      },
      "Đăng nhập thành công!"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Đăng nhập thất bại";
    return apiError(message, 401);
  }
}

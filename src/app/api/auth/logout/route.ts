import { cookies } from "next/headers";
import { apiSuccess } from "@/server/utils/response";
import { AUTH_COOKIE_NAME } from "@/server/utils/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);

  return apiSuccess(null, "Đã đăng xuất thành công!");
}

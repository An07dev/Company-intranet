import { authService } from "@/server/services/auth.service";
import { apiSuccess } from "@/server/utils/response";

export async function GET() {
  const accounts = authService.getDemoAccounts();
  return apiSuccess(accounts, "Danh sách tài khoản mẫu");
}

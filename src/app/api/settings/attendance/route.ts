import { NextRequest } from "next/server";
import { SettingsModel } from "@/server/models/settings.model";
import { getClientIp, isIpMatched } from "@/server/utils/ip";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

/**
 * GET /api/settings/attendance
 * Lấy cấu hình chấm công và phát hiện IP hiện tại của client
 */
export async function GET(request: NextRequest) {
  try {
    const settings = await SettingsModel.getAttendanceSettings();
    const clientIp = getClientIp(request);
    const isIpAllowed = isIpMatched(clientIp, settings.allowedIps);

    return apiSuccess({
      settings,
      detectedClientIp: clientIp,
      isIpAllowed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy cấu hình";
    return apiError(message, 500);
  }
}

/**
 * PUT /api/settings/attendance
 * Cập nhật cấu hình IP và giờ làm việc (Chỉ dành cho ADMIN hoặc GIÁM ĐỐC)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUserFromCookies();

    if (!user) {
      return apiError("Vui lòng đăng nhập để thực hiện thao tác này", 401);
    }

    if (user.role !== "admin" && user.role !== "director") {
      return apiError("Chỉ có ADMIN hoặc GIÁM ĐỐC mới có quyền thay đổi cấu hình hệ thống", 403);
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return apiError("Dữ liệu gửi lên không hợp lệ", 400);
    }

    const updated = await SettingsModel.updateAttendanceSettings(body, user.name);

    return apiSuccess(updated, "Cập nhật cấu hình chấm công thành công!");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi cập nhật cấu hình";
    return apiError(message, 400);
  }
}

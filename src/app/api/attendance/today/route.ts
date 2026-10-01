import { NextRequest } from "next/server";
import { AttendanceModel, getCurrentTimeString } from "@/server/models/attendance.model";
import { SettingsModel } from "@/server/models/settings.model";
import { getClientIp, isIpMatched } from "@/server/utils/ip";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromCookies();

    if (!user) {
      return apiError("Chưa đăng nhập", 401);
    }

    const clientIp = getClientIp(request);
    const settings = await SettingsModel.getAttendanceSettings();
    const isIpAllowed = isIpMatched(clientIp, settings.allowedIps);
    const todayRecord = await AttendanceModel.getTodayRecord(user.userId);

    return apiSuccess({
      todayRecord,
      clientIp,
      isIpAllowed,
      ipCheckEnabled: settings.enableIpCheck,
      serverTime: getCurrentTimeString(),
      workStartTime: settings.workStartTime,
      workEndTime: settings.workEndTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy thông tin chấm công hôm nay";
    return apiError(message, 500);
  }
}

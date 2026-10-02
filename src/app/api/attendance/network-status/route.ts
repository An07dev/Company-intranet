import { NextRequest } from "next/server";
import { getClientIp, isIpMatched } from "@/server/utils/ip";
import { SettingsModel } from "@/server/models/settings.model";
import { apiSuccess } from "@/server/utils/response";

/**
 * GET /api/attendance/network-status
 * Endpoint siêu nhẹ chuyên trách kiểm tra IP & trạng thái mạng văn phòng.
 * Không thực hiện các truy vấn dữ liệu chấm công nặng. Phản hồi trong ~20-50ms.
 */
export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    // Đọc thông tin vị trí địa lý tự động từ headers của Vercel (nếu có)
    const rawCity = request.headers.get("x-vercel-ip-city");
    const city = rawCity ? decodeURIComponent(rawCity) : undefined;
    const country = request.headers.get("x-vercel-ip-country") || undefined;
    const region = request.headers.get("x-vercel-ip-country-region") || undefined;

    const settings = await SettingsModel.getAttendanceSettings();
    const isIpAllowed = isIpMatched(clientIp, settings.allowedIps);

    return apiSuccess({
      clientIp,
      isIpAllowed,
      ipCheckEnabled: settings.enableIpCheck,
      location: {
        city,
        country,
        region,
      },
    });
  } catch {
    return apiSuccess({
      clientIp: "127.0.0.1",
      isIpAllowed: true,
      ipCheckEnabled: false,
    });
  }
}

import { NextRequest } from "next/server";
import { AttendanceModel } from "@/server/models/attendance.model";
import { getClientIp } from "@/server/utils/ip";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromCookies();

    if (!user) {
      return apiError("Vui lòng đăng nhập để thực hiện chấm công", 401);
    }

    const clientIp = getClientIp(request);
    const body = await request.json().catch(() => ({}));

    const record = await AttendanceModel.checkOut({
      userId: user.userId,
      clientIp,
      note: body.note,
    });

    const time = record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString("vi-VN") : "";
    return apiSuccess(record, `Chấm công về thành công lúc ${time}! (IP: ${clientIp})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chấm công về thất bại";
    return apiError(message, 400);
  }
}

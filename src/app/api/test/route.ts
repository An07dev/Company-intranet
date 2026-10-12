import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/server/utils/response";

/**
 * GET /api/test
 * Dùng để kiểm tra nhanh kết nối tới Backend
 */
export async function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "unknown";
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

  return apiSuccess(
    {
      status: "online",
      message: "Backend đang hoạt động hoàn toàn bình thường! 🚀",
      serverTime: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      clientInfo: {
        ip,
        userAgent,
      },
    },
    "Kết nối Backend thành công!"
  );
}

/**
 * POST /api/test
 * Dùng để test gửi dữ liệu từ Frontend lên Backend và nhận phản hồi
 */
export async function POST(request: NextRequest) {
  try {
    const rawText = await request.text();
    let body: unknown = null;

    if (rawText && rawText.trim().length > 0) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = rawText;
      }
    }

    return apiSuccess(
      {
        status: "received",
        receivedData: body ?? "Không có body truyền lên",
        receivedAt: new Date().toISOString(),
      },
      "Backend đã nhận và xử lý POST request thành công!"
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Dữ liệu không hợp lệ";
    return apiError(errorMsg, 400, "Không thể xử lý yêu cầu");
  }
}

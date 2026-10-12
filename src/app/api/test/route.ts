import { NextRequest, NextResponse } from "next/server";
import { apiSuccess, apiError } from "@/server/utils/response";

/**
 * GET /api/test
 * Dùng để kiểm tra nhanh kết nối tới Backend
 */
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel } from "@/server/db/schema";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");
  if (action === "test_debt") {
    const logs: any[] = [];
    const t0 = Date.now();
    try {
      await connectToDatabase();
      logs.push({ step: "connectToDatabase", time: Date.now() - t0 });

      const t1 = Date.now();
      const total = await MongoShopeeOrderModel.countDocuments();
      logs.push({ step: "countDocuments", count: total, time: Date.now() - t1 });

      const now = new Date();
      const dStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      const startDateStr = dStart.toISOString().slice(0, 10);
      const startTimeDate = new Date(`${startDateStr}T00:00:00+07:00`);

      const query: any = {
        order_status: { $ne: "Đã hủy" },
        $or: [
          { status_description: { $regex: /pending|partially_paid/i } },
          { createdAt: { $gte: `${startDateStr}T00:00:00.000Z` } },
          { updatedAt: { $gte: startTimeDate } },
        ],
      };

      const t2 = Date.now();
      const countMatched = await MongoShopeeOrderModel.countDocuments(query);
      logs.push({ step: "countMatchedQuery", count: countMatched, time: Date.now() - t2 });

      const t3 = Date.now();
      const docs = await MongoShopeeOrderModel.find(query, {
        order_sn: 1, shop_username: 1, buyer_username: 1, order_status: 1, total_amount: 1, raw_text: 1, createdAt: 1
      }).lean().exec();
      logs.push({ step: "fetchMatchedDocs", docsLength: docs.length, time: Date.now() - t3 });

      return apiSuccess({ logs, totalTime: Date.now() - t0 }, "Diagnostic test completed");
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || String(err), logs }, { status: 500 });
    }
  }

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

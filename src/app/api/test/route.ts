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
  const step = request.nextUrl.searchParams.get("step");
  if (action === "test_debt" || step) {
    const t0 = Date.now();
    try {
      if (step === "1") {
        await connectToDatabase();
        return apiSuccess({ step: 1, time: Date.now() - t0 }, "connectToDatabase OK");
      }
      if (step === "2") {
        await connectToDatabase();
        const total = await MongoShopeeOrderModel.countDocuments();
        return apiSuccess({ step: 2, total, time: Date.now() - t0 }, "countDocuments OK");
      }
      if (step === "3") {
        await connectToDatabase();
        const dStart = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
        const startDateStr = dStart.toISOString().slice(0, 10);
        const startIsoStr = `${startDateStr}T00:00:00.000Z`;
        const query: any = {
          order_status: { $ne: "Đã hủy" },
          $or: [
            { status_description: { $regex: /pending|partially_paid/i } },
            { createdAt: { $gte: startIsoStr } },
          ],
        };
        const count = await MongoShopeeOrderModel.countDocuments(query);
        return apiSuccess({ step: 3, count, time: Date.now() - t0 }, "countMatchedQuery OK");
      }
      if (step === "4") {
        await connectToDatabase();
        const dStart = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
        const startDateStr = dStart.toISOString().slice(0, 10);
        const startIsoStr = `${startDateStr}T00:00:00.000Z`;
        const query: any = {
          order_status: { $ne: "Đã hủy" },
          $or: [
            { status_description: { $regex: /pending|partially_paid/i } },
            { createdAt: { $gte: startIsoStr } },
          ],
        };
        const docs = await MongoShopeeOrderModel.find(query, {
          order_sn: 1, shop_username: 1, buyer_username: 1, order_status: 1, total_amount: 1, createdAt: 1
        }).lean().exec();
        return apiSuccess({ step: 4, count: docs.length, time: Date.now() - t0 }, "find all matched docs without raw_text OK");
      }
      if (step === "5") {
        await connectToDatabase();
        // ONLY debt orders with raw_text (481 docs)
        const debtDocs = await MongoShopeeOrderModel.find({
          order_status: { $ne: "Đã hủy" },
          status_description: { $regex: /pending|partially_paid/i },
        }, {
          order_sn: 1, shop_username: 1, buyer_username: 1, order_status: 1, total_amount: 1, raw_text: 1, createdAt: 1
        }).lean().exec();
        return apiSuccess({ step: 5, count: debtDocs.length, time: Date.now() - t0 }, "find only debt orders with raw_text OK");
      }
      return apiSuccess({ message: "Specify ?step=1, 2, 3, or 4" });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
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

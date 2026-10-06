import { NextRequest, NextResponse } from "next/server";
import { LogModel } from "@/server/models/log.model";

// Headers hỗ trợ CORS để Chrome Extension bắn log trực tiếp không bị chặn
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Xử lý preflight CORS request từ Extension
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * POST /api/shopee/logs
 * Endpoint nhận dữ liệu log từ Chrome Extension hoặc Backend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Hỗ trợ gửi nhiều log 1 lúc
    if (body.logs && Array.isArray(body.logs)) {
      const count = await LogModel.createBulkLogs(body.logs);
      return NextResponse.json(
        {
          success: true,
          message: `Đã lưu thành công ${count} bản ghi log`,
          count,
        },
        { status: 201, headers: corsHeaders }
      );
    }

    const { level, type, source, shop_username, message, details, duration_ms, timestamp } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Thiếu trường message trong log" },
        { status: 400, headers: corsHeaders }
      );
    }

    const validLevels = ["info", "warn", "error", "success"];
    const sanitizedLevel = validLevels.includes(level?.toLowerCase())
      ? level.toLowerCase()
      : "info";

    const log = await LogModel.createLog({
      level: sanitizedLevel,
      type: type || "system",
      source: source || "chrome_extension",
      shop_username: shop_username || "baobiyensen",
      message,
      details: details || {},
      duration_ms: typeof duration_ms === "number" ? duration_ms : undefined,
      createdAt: timestamp || new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        data: log,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Shopee Log API] Lỗi khi lưu log:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi máy chủ khi ghi log",
        error: error.message || String(error),
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/shopee/logs
 * Endpoint lấy danh sách log kèm thống kê và bộ lọc
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const level = searchParams.get("level") || undefined;
    const type = searchParams.get("type") || undefined;
    const source = searchParams.get("source") || undefined;
    const shop_username = searchParams.get("shop_username") || undefined;
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const data = await LogModel.getLogs({
      page,
      limit,
      level,
      type,
      source,
      shop_username,
      search,
      startDate,
      endDate,
    });

    const stats = await LogModel.getStats(shop_username);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...data,
          stats,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Shopee Log API] Lỗi khi truy vấn log:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/shopee/logs
 * Endpoint xóa log theo ID hoặc dọn dẹp log cũ
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const deleted = await LogModel.deleteLogById(id);
      return NextResponse.json(
        { success: true, message: `Đã xóa log ${id}`, deleted },
        { status: 200, headers: corsHeaders }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { shop_username, level, olderThanDays } = body;
    const deletedCount = await LogModel.clearLogs({
      shopUsername: shop_username,
      level,
      olderThanDays: olderThanDays ? parseInt(olderThanDays, 10) : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Đã dọn dẹp ${deletedCount} bản ghi log`,
        deletedCount,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Shopee Log API] Lỗi khi xóa log:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

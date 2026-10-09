import { NextRequest, NextResponse } from "next/server";
import { OrderModel } from "@/server/models/order.model";
import { SapoService } from "@/server/services/sapo.service";
import { MongoShopeeOrderModel } from "@/server/db/schema";
import { connectToDatabase } from "@/server/db";

// Headers hỗ trợ CORS để Chrome Extension bắn dữ liệu trực tiếp không bị chặn
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
 * POST /api/shopee/orders
 * Endpoint nhận dữ liệu đồng bộ đơn hàng từ Chrome Extension
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop_username, orders } = body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { success: false, message: "Danh sách đơn hàng rỗng hoặc không đúng định dạng" },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await OrderModel.upsertOrders(orders, shop_username || "baobiyensen");

    console.log(`[Shopee Sync] Đã đồng bộ ${result.total} đơn (Mới: ${result.inserted}, Cập nhật: ${result.updated})`);

    return NextResponse.json(
      {
        success: true,
        message: `Đồng bộ thành công ${result.total} đơn hàng (Thêm mới: ${result.inserted}, Cập nhật: ${result.updated})`,
        data: result,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Shopee Sync] Lỗi khi xử lý đơn hàng:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi máy chủ khi lưu đơn hàng",
        error: error.message || String(error),
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/shopee/orders
 * Endpoint lấy danh sách đơn hàng đã đồng bộ về hệ thống
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const shop_username = searchParams.get("shop_username") || undefined;

    const data = await OrderModel.getOrders({ page, limit, status, search, shop_username });
    const stats = await OrderModel.getStats(shop_username);

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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/shopee/orders
 * Endpoint xóa đơn hàng (theo order_sn trong query hoặc danh sách trong body)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const order_sn = searchParams.get("order_sn");
    const all = searchParams.get("all");
    let internalOnly = searchParams.get("internal_only") === "true";

    let orderSns: string[] | undefined = undefined;
    if (order_sn) {
      orderSns = [order_sn];
    } else if (all === "true" || all === "1") {
      orderSns = undefined; // xóa toàn bộ
    } else {
      try {
        const body = await request.json();
        if (body?.internal_only) internalOnly = true;
        if (body && Array.isArray(body.order_sns)) {
          orderSns = body.order_sns;
        } else if (body && body.all) {
          orderSns = undefined;
        }
      } catch {
        // không có json body
      }
    }

    // Nếu xóa đơn cụ thể và KHÔNG PHẢI internal_only, đồng bộ xóa trên Sapo nếu có Sapo ID
    if (!internalOnly && orderSns && orderSns.length === 1) {
      try {
        await connectToDatabase();
        const singleSn = orderSns[0];
        const doc = await MongoShopeeOrderModel.findOne({ order_sn: singleSn });
        let sapoId: number | string | null = null;
        if (doc?.raw_text) {
          try {
            const raw = JSON.parse(doc.raw_text);
            if (raw.id) sapoId = raw.id;
          } catch {}
        }
        if (!sapoId && doc?.id && /^\d+$/.test(String(doc.id)) && String(doc.id).length >= 7) {
          sapoId = doc.id;
        }
        if (sapoId) {
          await SapoService.deleteOrder(sapoId).catch((err) =>
            console.warn(`[Shopee Orders DELETE] Sapo delete error for ${singleSn}:`, err.message)
          );
        }
      } catch (e: any) {
        console.warn("[Shopee Orders DELETE] Failed checking Sapo ID:", e.message);
      }
    }

    const result = await OrderModel.deleteOrders(orderSns);

    return NextResponse.json(
      {
        success: true,
        message: `Đã xóa thành công ${result.deletedCount} đơn hàng`,
        data: result,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}


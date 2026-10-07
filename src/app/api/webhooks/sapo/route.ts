import { NextRequest, NextResponse } from "next/server";
import { OrderModel } from "@/server/models/order.model";
import { LogModel } from "@/server/models/log.model";
import { ShopeeOrder } from "@/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Sapo-Topic, X-Sapo-Hmac-Sha256",
};

/**
 * Xử lý preflight CORS request
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET /api/webhooks/sapo
 * Health check endpoint để kiểm tra webhook URL đã hoạt động chưa
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      message: "Sapo Webhook endpoint is active and ready to receive orders",
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: corsHeaders }
  );
}

/**
 * POST /api/webhooks/sapo
 * Nhận dữ liệu webhook đơn hàng từ Sapo (orders/create, orders/updated)
 */
export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    if (!orderData || typeof orderData !== "object") {
      return NextResponse.json(
        { success: false, message: "Payload rỗng hoặc không hợp lệ" },
        { status: 400, headers: corsHeaders }
      );
    }

    const topic = (request.headers.get("x-sapo-topic") || "").toLowerCase();

    console.log(`=== [Sapo Webhook] Nhận sự kiện (${topic || "unknown"}) ===`);
    console.log("Mã đơn Sapo ID:", orderData.id);
    console.log("Số hiệu đơn:", orderData.order_number || orderData.name);
    console.log("Kênh phát sinh (source_name):", orderData.source_name || orderData.channel);
    console.log("Tổng tiền:", orderData.total_price);

    // Xác định mã đơn hàng duy nhất
    const orderSn = String(
      orderData.order_number ||
      orderData.name ||
      orderData.reference_order_number ||
      orderData.id
    );

    // Xác định tên sàn / nguồn (Shopee, Lazada, TikTok, Website, POS...)
    const shopSource = (orderData.source_name || orderData.channel || "sapo").toLowerCase();

    // Lấy thông tin khách hàng
    const buyerName =
      orderData.shipping_address?.name ||
      [orderData.customer?.last_name, orderData.customer?.first_name].filter(Boolean).join(" ").trim() ||
      orderData.customer?.name ||
      "Khách Sapo";

    // Phân loại trạng thái đơn
    const isCancelled =
      topic.includes("cancelled") ||
      Boolean(orderData.cancelled_on) ||
      Boolean(orderData.cancel_reason) ||
      orderData.status === "cancelled" ||
      orderData.financial_status === "voided";

    let orderStatus = "Chờ xử lý";
    if (isCancelled) {
      orderStatus = "Đã hủy";
    } else if (orderData.fulfillment_status === "fulfilled" || orderData.status === "closed") {
      orderStatus = "Đã giao";
    } else if (orderData.fulfillment_status === "partial") {
      orderStatus = "Đang giao";
    } else if (orderData.financial_status === "paid") {
      orderStatus = "Đã thanh toán";
    }

    // Danh sách sản phẩm trong đơn
    const items = Array.isArray(orderData.line_items)
      ? orderData.line_items.map((item: any) => ({
          product_name: String(item.title || item.name || "Sản phẩm"),
          variation: String(item.variant_title || ""),
          quantity: Number(item.quantity) || 1,
        }))
      : [];

    const now = new Date().toISOString();

    const statusDesc = isCancelled
      ? `Đã hủy trên Sapo | Lý do: ${orderData.cancel_reason || "Khác"} | Thời điểm: ${orderData.cancelled_on || now}`
      : `Financial: ${orderData.financial_status || "N/A"} | Fulfillment: ${orderData.fulfillment_status || "N/A"} | Kênh: ${shopSource}`;

    const mappedOrder: ShopeeOrder = {
      order_sn: orderSn,
      shop_username: `sapo_${shopSource}`,
      buyer_username: buyerName,
      total_amount: Number(orderData.total_price) || 0,
      payment_method: orderData.gateway || "Chưa rõ",
      order_status: orderStatus,
      status_description: statusDesc,
      shipping_carrier: orderData.fulfillments?.[0]?.tracking_company || "",
      tracking_number: orderData.fulfillments?.[0]?.tracking_number || "",
      items,
      raw_text: JSON.stringify(orderData),
      synced_at: now,
      createdAt: orderData.created_on || orderData.created_at || now,
      updatedAt: now,
    };

    // Lưu / Cập nhật vào MongoDB thông qua OrderModel
    try {
      const syncResult = await OrderModel.upsertOrders([mappedOrder], mappedOrder.shop_username);
      console.log(`[Sapo Webhook] Đã lưu thành công đơn #${orderSn} vào Database (Thêm mới: ${syncResult.inserted}, Cập nhật: ${syncResult.updated}, Trạng thái: ${orderStatus})`);

      const logMsg = isCancelled
        ? `[Sapo Webhook] Hủy đơn hàng #${orderSn} trên hệ thống (Lý do: ${orderData.cancel_reason || "Khác"})`
        : topic.includes("updated")
        ? `[Sapo Webhook] Cập nhật đơn hàng #${orderSn} từ Sapo -> Trạng thái: ${orderStatus}`
        : `[Sapo Webhook] Nhận đơn hàng mới #${orderSn} từ sàn ${shopSource.toUpperCase()}`;

      // Ghi lại nhật ký đồng bộ để hiển thị trên trang Nhật ký Webhook
      await LogModel.createLog({
        level: "success",
        type: isCancelled ? "order_cancel" : "order_sync",
        source: "sapo_webhook",
        shop_username: mappedOrder.shop_username,
        message: logMsg,
        details: {
          order_id: orderData.id,
          order_number: orderSn,
          topic: topic || (isCancelled ? "orders/cancelled" : "orders/create"),
          source_name: shopSource,
          total_price: mappedOrder.total_amount,
          buyer: buyerName,
          order_status: orderStatus,
          cancel_reason: orderData.cancel_reason,
          cancelled_on: orderData.cancelled_on,
          fulfillment_status: orderData.fulfillment_status,
          financial_status: orderData.financial_status,
        },
      });
    } catch (dbError: any) {
      console.error("[Sapo Webhook] Lỗi khi lưu đơn hàng vào Database:", dbError?.message || dbError);
      try {
        await LogModel.createLog({
          level: "error",
          type: "order_sync",
          source: "sapo_webhook",
          shop_username: mappedOrder.shop_username,
          message: `[Sapo Webhook] Lỗi lưu đơn hàng #${orderSn}: ${dbError?.message || dbError}`,
          details: { error: String(dbError), raw: orderData },
        });
      } catch {}
    }

    // Luôn trả về 200 OK để Sapo biết webhook đã được tiếp nhận thành công
    return NextResponse.json(
      {
        success: true,
        message: "Webhook processed successfully",
        order_sn: orderSn,
        source: shopSource,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Sapo Webhook] Lỗi xử lý webhook:", error);
    // Vẫn trả về 200 kèm cảnh báo lỗi để tránh Sapo ngắt Webhook
    return NextResponse.json(
      {
        success: false,
        message: "Error processing webhook payload",
        error: error.message || String(error),
      },
      { status: 200, headers: corsHeaders }
    );
  }
}

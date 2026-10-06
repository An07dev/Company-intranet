import { NextRequest, NextResponse } from "next/server";
import { OrderModel } from "@/server/models/order.model";
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

    console.log("=== [Sapo Webhook] Nhận dữ liệu đơn hàng mới ===");
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
    let orderStatus = "Chờ xử lý";
    if (orderData.cancelled_on || orderData.status === "cancelled" || orderData.financial_status === "voided") {
      orderStatus = "Đã hủy";
    } else if (orderData.fulfillment_status === "fulfilled") {
      orderStatus = "Đã giao hàng";
    } else if (orderData.fulfillment_status === "partial") {
      orderStatus = "Đang giao hàng";
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

    const mappedOrder: ShopeeOrder = {
      order_sn: orderSn,
      shop_username: `sapo_${shopSource}`,
      buyer_username: buyerName,
      total_amount: Number(orderData.total_price) || 0,
      payment_method: orderData.gateway || "Chưa rõ",
      order_status: orderStatus,
      status_description: `Financial: ${orderData.financial_status || "N/A"} | Fulfillment: ${orderData.fulfillment_status || "N/A"} | Kênh: ${shopSource}`,
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
      console.log(`[Sapo Webhook] Đã lưu thành công đơn #${orderSn} vào Database (Thêm mới: ${syncResult.inserted}, Cập nhật: ${syncResult.updated})`);
    } catch (dbError: any) {
      console.error("[Sapo Webhook] Lỗi khi lưu đơn hàng vào Database:", dbError?.message || dbError);
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

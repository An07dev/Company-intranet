import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { OrderModel, resolveSapoOrderSn } from "@/server/models/order.model";
import { LogModel } from "@/server/models/log.model";
import { ShopeeOrder } from "@/types";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeProductModel } from "@/server/db/schema";
import { CustomerModel } from "@/server/models/customer.model";
import { invalidateShopeeStatsCache } from "@/app/api/dashboard/shopee-stats/route";
import { invalidateInventoryStatsCache } from "@/app/api/dashboard/inventory-stats/route";
import { invalidateCRMStatsCache } from "@/app/api/dashboard/crm-stats/route";

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
      message: "Sapo Webhook endpoint is active and ready to receive orders and products",
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: corsHeaders }
  );
}

/**
 * POST /api/webhooks/sapo
 * Nhận dữ liệu webhook đơn hàng & sản phẩm từ Sapo (Kèm xác thực HMAC SHA-256)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    if (!rawBody || rawBody.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Payload rỗng hoặc không hợp lệ" },
        { status: 400, headers: corsHeaders }
      );
    }

    // -------------------------------------------------------------
    // XÁC THỰC BẢO MẬT CHỮ KÝ HMAC SHA-256 TỪ SAPO
    // -------------------------------------------------------------
    const sapoHmac = request.headers.get("x-sapo-hmac-sha256");
    const secret = process.env.SAPO_API_SECRET || "b4ddea44a45447a1ab29e3680fc76c16";

    if (sapoHmac) {
      const calculatedHmac = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
      const hmacBuffer = Buffer.from(sapoHmac, "utf8");
      const calcBuffer = Buffer.from(calculatedHmac, "utf8");

      const isValid =
        hmacBuffer.length === calcBuffer.length &&
        crypto.timingSafeEqual(hmacBuffer, calcBuffer);

      if (!isValid) {
        console.error("[Sapo Webhook] ❌ Xác thực chữ ký HMAC SHA-256 thất bại! Request bị từ chối.");
        return NextResponse.json(
          { success: false, message: "Chữ ký xác thực Webhook không hợp lệ (Invalid HMAC)" },
          { status: 401, headers: corsHeaders }
        );
      }
    } else if (process.env.NODE_ENV === "production" && process.env.SAPO_ENFORCE_HMAC === "true") {
      console.warn("[Sapo Webhook] ⚠️ Thiếu header X-Sapo-Hmac-Sha256 trên môi trường Production.");
      return NextResponse.json(
        { success: false, message: "Yêu cầu chữ ký xác thực Webhook (Missing X-Sapo-Hmac-Sha256)" },
        { status: 401, headers: corsHeaders }
      );
    }

    let rawData: any;
    try {
      rawData = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, message: "Payload JSON không hợp lệ" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!rawData || typeof rawData !== "object") {
      return NextResponse.json(
        { success: false, message: "Payload rỗng hoặc không hợp lệ" },
        { status: 400, headers: corsHeaders }
      );
    }

    const topic = (request.headers.get("x-sapo-topic") || "").toLowerCase();

    // =========================================================================
    // 1. XỬ LÝ SỰ KIỆN SẢN PHẨM TỪ SAPO (Xóa sản phẩm, Cập nhật sản phẩm)
    // =========================================================================
    if (topic.includes("products/") || topic.includes("product/")) {
      await connectToDatabase();
      const prodId = String(rawData.id || rawData.item_id || "");

      if (!prodId) {
        return NextResponse.json(
          { success: false, message: "Thiếu ID sản phẩm" },
          { status: 400, headers: corsHeaders }
        );
      }

      // SỰ KIỆN 1: XÓA SẢN PHẨM TRÊN SAPO ADMIN (products/delete)
      if (topic.includes("delete")) {
        console.log(`=== [Sapo Webhook] Nhận sự kiện XÓA SẢN PHẨM #${prodId} từ Sapo ===`);
        const delRes = await MongoShopeeProductModel.deleteMany({
          $or: [{ id: prodId }, { item_id: prodId }],
        });

        await LogModel.createLog({
          level: "warn",
          type: "product_delete",
          source: "sapo_webhook",
          shop_username: "sapo_omnichannel",
          message: `Đã xóa sản phẩm #${prodId} khỏi hệ thống nội bộ (Đồng bộ thời gian thực từ sự kiện xóa trên Sapo Admin)`,
          details: { prodId, deletedCount: delRes.deletedCount, raw: rawData },
        });

        return NextResponse.json(
          {
            success: true,
            message: `Đã xóa sản phẩm #${prodId} khỏi hệ thống thành công!`,
            deletedCount: delRes.deletedCount,
          },
          { status: 200, headers: corsHeaders }
        );
      }

      // SỰ KIỆN 2: CẬP NHẬT / TẠO MỚI SẢN PHẨM TRÊN SAPO ADMIN (products/update, products/create)
      if (topic.includes("update") || topic.includes("create")) {
        console.log(`=== [Sapo Webhook] Nhận sự kiện CẬP NHẬT SẢN PHẨM #${prodId} từ Sapo ===`);
        const variants = rawData.variants || [];
        const stock = variants.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0);
        const prices = variants.map((v: any) => v.price || 0).filter((pr: number) => pr > 0);
        const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
        const priceMax = prices.length > 0 ? Math.max(...prices) : 0;
        const priceDisplay =
          priceMin === priceMax
            ? `₫${priceMin.toLocaleString("vi-VN")}`
            : `₫${priceMin.toLocaleString("vi-VN")} - ₫${priceMax.toLocaleString("vi-VN")}`;

        const finalVariations = variants.map((v: any) => ({
          model_id: String(v.id),
          name: v.title || v.sku || "Phân loại",
          sku: v.sku || "",
          price: v.price || 0,
          stock: v.inventory_quantity || 0,
          image: rawData.image?.src || rawData.images?.[0]?.src || "",
        }));

        const now = new Date().toISOString();
        const prodDoc = {
          id: prodId,
          item_id: prodId,
          name: rawData.name,
          parent_sku: variants[0]?.sku || "",
          image: rawData.image?.src || rawData.images?.[0]?.src || "",
          product_url: `https://cua-hang-yen-sen.mysapo.net/admin/products/${prodId}`,
          price_min: priceMin,
          price_max: priceMax,
          price_display: priceDisplay,
          stock: stock,
          status: stock > 0 ? "Đang hoạt động" : "Hết hàng",
          options: rawData.options || [],
          variations: finalVariations,
          shop_username: "sapo_omnichannel",
          synced_at: now,
          updatedAt: now,
        };

        await MongoShopeeProductModel.updateOne(
          { $or: [{ id: prodId }, { item_id: prodId }] },
          { $set: prodDoc },
          { upsert: true }
        );

        invalidateInventoryStatsCache();

        return NextResponse.json(
          {
            success: true,
            message: `Đã cập nhật sản phẩm #${prodId} từ Sapo thành công!`,
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 1.5 XỬ LÝ SỰ KIỆN KHÁCH HÀNG TỪ SAPO (customers/create, customers/update)
    // =========================================================================
    if (topic.includes("customer")) {
      await connectToDatabase();
      const customerData = rawData;
      if (!customerData || !customerData.id) {
        return NextResponse.json(
          { success: false, message: "Thiếu thông tin khách hàng" },
          { status: 400, headers: corsHeaders }
        );
      }

      await CustomerModel.upsertSingleCustomer(customerData);
      invalidateCRMStatsCache();

      const custName =
        [customerData.last_name, customerData.first_name].filter(Boolean).join(" ").trim() ||
        customerData.name ||
        "Khách hàng";

      await LogModel.createLog({
        level: "success",
        type: topic.includes("create") ? "customer_create" : "customer_update",
        source: "sapo_webhook",
        shop_username: "sapo_omnichannel",
        message: `[Sapo Webhook] ${topic.includes("create") ? "Tạo mới" : "Cập nhật"} khách hàng #${customerData.id}: ${custName}`,
        details: { customerId: customerData.id, topic, phone: customerData.phone, name: custName },
      });

      return NextResponse.json(
        {
          success: true,
          message: `Đã đồng bộ thời gian thực khách hàng #${customerData.id} (${custName}) từ Sapo thành công!`,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // =========================================================================
    // 2. XỬ LÝ SỰ KIỆN ĐƠN HÀNG TỪ SAPO (orders/create, orders/updated, orders/cancelled)
    // =========================================================================
    const orderData = rawData;

    console.log(`=== [Sapo Webhook] Nhận sự kiện (${topic || "unknown"}) ===`);
    console.log("Mã đơn Sapo ID:", orderData.id);
    console.log("Số hiệu đơn:", orderData.order_number || orderData.name);
    console.log("Kênh phát sinh (source_name):", orderData.source_name || orderData.channel);
    console.log("Tổng tiền:", orderData.total_price);

    // Xác định mã đơn hàng duy nhất bằng hàm chuẩn hóa (ưu tiên mã sàn thực tế như Shopee 2610096RRSDNPS)
    const orderSn = resolveSapoOrderSn(orderData) || String(orderData.id || Date.now());

    // Xác định tên sàn / nguồn (Shopee, Lazada, TikTok, Website, POS...)
    const rawSource = String(orderData.source_name || orderData.channel || "sapo").toLowerCase();
    let shopSource = "sapo_web";
    if (rawSource.includes("shopee")) shopSource = "sapo_shopee";
    else if (rawSource.includes("tiktok")) shopSource = "sapo_tiktok";
    else if (rawSource.includes("lazada")) shopSource = "sapo_lazada";
    else if (rawSource === "admin" || rawSource.includes("pos")) shopSource = "sapo_pos";
    else if (rawSource.includes("facebook")) shopSource = "sapo_facebook";
    else if (rawSource.includes("zalo")) shopSource = "sapo_zalo";
    else if (rawSource.includes("web") || rawSource.includes("online")) shopSource = "sapo_web";
    else shopSource = `sapo_${rawSource}`;

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
      shop_username: shopSource,
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
      invalidateShopeeStatsCache();

      // Tự động đồng bộ / cập nhật thông tin khách hàng từ đơn hàng vào CRM
      if (orderData.customer && orderData.customer.id) {
        try {
          await CustomerModel.syncFromOrder(orderData.customer, orderData);
          invalidateCRMStatsCache();
        } catch (custErr: any) {
          console.warn("[Sapo Webhook] Lỗi khi đồng bộ khách hàng từ đơn hàng:", custErr.message);
        }
      }

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

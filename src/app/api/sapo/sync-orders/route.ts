import { NextRequest, NextResponse } from "next/server";
import { OrderModel, resolveSapoOrderSn } from "@/server/models/order.model";
import { LogModel } from "@/server/models/log.model";
import { ShopeeOrder } from "@/types";

const SAPO_DOMAIN = process.env.SAPO_STORE_DOMAIN || "cua-hang-yen-sen.mysapo.net";
const SAPO_API_KEY = process.env.SAPO_API_KEY || "9e84e8ba383f4f99a8cf2487932d4afe";
const SAPO_API_SECRET = process.env.SAPO_API_SECRET || "b4ddea44a45447a1ab29e3680fc76c16";

function getAuthHeader(): string {
  const token = Buffer.from(`${SAPO_API_KEY}:${SAPO_API_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = getAuthHeader();
    const headers = {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };

    let limit = 100;
    try {
      const body = await request.json();
      if (body && body.limit) limit = Math.min(250, Number(body.limit));
    } catch {}

    // Lấy song song đơn hàng mở, đơn đã đóng và đơn đã hủy từ Sapo
    const [openRes, closedRes, cancelledRes] = await Promise.all([
      fetch(`https://${SAPO_DOMAIN}/admin/orders.json?status=open&limit=${limit}`, {
        headers,
        cache: "no-store",
      }),
      fetch(`https://${SAPO_DOMAIN}/admin/orders.json?status=closed&limit=${limit}`, {
        headers,
        cache: "no-store",
      }),
      fetch(`https://${SAPO_DOMAIN}/admin/orders.json?status=cancelled&limit=${limit}`, {
        headers,
        cache: "no-store",
      }),
    ]);

    if (!openRes.ok && !closedRes.ok && !cancelledRes.ok) {
      throw new Error(`Sapo API lỗi kết nối: ${openRes.status} / ${closedRes.status} / ${cancelledRes.status}`);
    }

    const openOrders = openRes.ok ? (await openRes.json()).orders || [] : [];
    const closedOrders = closedRes.ok ? (await closedRes.json()).orders || [] : [];
    const cancelledOrders = cancelledRes.ok ? (await cancelledRes.json()).orders || [] : [];
    const combinedOrders = [...openOrders, ...closedOrders, ...cancelledOrders];

    // Chống trùng lặp và ưu tiên bản ghi có trạng thái hủy
    const seenMap = new Map<string, any>();
    for (const o of combinedOrders) {
      const key = String(o.order_number || o.name || o.id);
      if (!seenMap.has(key)) {
        seenMap.set(key, o);
      } else {
        if (o.cancelled_on || o.cancel_reason || o.status === "cancelled") {
          seenMap.set(key, o);
        }
      }
    }
    const rawOrders = Array.from(seenMap.values());

    const now = new Date().toISOString();
    const mappedOrders: ShopeeOrder[] = [];

    for (const o of rawOrders) {
      const orderSn = resolveSapoOrderSn(o) || String(o.id || Date.now());
      const rawSource = String(o.source_name || o.channel || "sapo").toLowerCase();

      let shopSource = "sapo_web";
      if (rawSource.includes("shopee")) shopSource = "sapo_shopee";
      else if (rawSource.includes("tiktok")) shopSource = "sapo_tiktok";
      else if (rawSource.includes("lazada")) shopSource = "sapo_lazada";
      else if (rawSource === "admin" || rawSource.includes("pos")) shopSource = "sapo_pos";
      else if (rawSource.includes("facebook")) shopSource = "sapo_facebook";
      else if (rawSource.includes("zalo")) shopSource = "sapo_zalo";
      else if (rawSource.includes("web") || rawSource.includes("online")) shopSource = "sapo_web";
      else shopSource = `sapo_${rawSource}`;

      const buyerName =
        o.shipping_address?.name ||
        [o.customer?.last_name, o.customer?.first_name].filter(Boolean).join(" ").trim() ||
        o.customer?.name ||
        "Khách lẻ";

      let orderStatus = "Chờ xử lý";
      if (o.cancelled_on || o.cancel_reason || o.status === "cancelled" || o.financial_status === "voided") {
        orderStatus = "Đã hủy";
      } else if (o.fulfillment_status === "fulfilled" || o.status === "closed") {
        orderStatus = "Đã giao";
      } else if (o.fulfillment_status === "partial") {
        orderStatus = "Đang giao";
      } else if (o.financial_status === "paid") {
        orderStatus = "Đã thanh toán";
      }

      const items = Array.isArray(o.line_items)
        ? o.line_items.map((item: any) => ({
            product_name: String(item.title || item.name || "Sản phẩm"),
            variation: String(item.variant_title || ""),
            quantity: Number(item.quantity) || 1,
          }))
        : [];

      mappedOrders.push({
        order_sn: orderSn,
        shop_username: shopSource,
        buyer_username: buyerName,
        total_amount: Number(o.total_price) || 0,
        payment_method: o.gateway || o.payment_gateway_names?.[0] || "Chưa rõ",
        order_status: orderStatus,
        status_description: `Kênh: ${rawSource.toUpperCase()} | Thanh toán: ${o.financial_status || "N/A"} | Giao hàng: ${o.fulfillment_status || "Chưa giao"}`,
        shipping_carrier: o.fulfillments?.[0]?.tracking_company || "",
        tracking_number: o.fulfillments?.[0]?.tracking_number || "",
        items,
        raw_text: JSON.stringify(o),
        synced_at: now,
        createdAt: o.created_on || o.created_at || now,
        updatedAt: now,
      });
    }

    const result = await OrderModel.upsertOrders(mappedOrders, "sapo_omnichannel");

    // Ghi log đồng bộ
    try {
      await LogModel.createLog({
        level: "success",
        type: "order_sync",
        source: "sapo_manual_sync",
        shop_username: "sapo_omnichannel",
        message: `[Sapo Sync] Đã đồng bộ thành công ${result.total} đơn hàng đa kênh (Thêm mới: ${result.inserted}, Cập nhật: ${result.updated})`,
        details: {
          total: result.total,
          inserted: result.inserted,
          updated: result.updated,
          sample_channels: ["shopee", "tiktok", "facebook", "zalo", "pos", "web"],
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Đồng bộ thành công ${result.total} đơn hàng từ Sapo Omnichannel (Mới: ${result.inserted}, Cập nhật: ${result.updated})`,
      data: result,
    });
  } catch (error: any) {
    console.error("[Sapo Sync Orders Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi đồng bộ đơn hàng từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

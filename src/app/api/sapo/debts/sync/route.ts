import { NextRequest, NextResponse } from "next/server";
import { OrderModel, resolveSapoOrderSn } from "@/server/models/order.model";
import { LogModel } from "@/server/models/log.model";
import { ShopeeOrder } from "@/types";
import { MongoShopeeOrderModel } from "@/server/db/schema";
import { connectToDatabase } from "@/server/db";
import { invalidateCustomerDebtCache } from "@/app/api/sapo/debts/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SAPO_DOMAIN = process.env.SAPO_STORE_DOMAIN || "cua-hang-yen-sen.mysapo.net";
const SAPO_API_KEY = process.env.SAPO_API_KEY || "9e84e8ba383f4f99a8cf2487932d4afe";
const SAPO_API_SECRET = process.env.SAPO_API_SECRET || "b4ddea44a45447a1ab29e3680fc76c16";

function getAuthHeader(): string {
  const token = Buffer.from(`${SAPO_API_KEY}:${SAPO_API_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * POST /api/sapo/debts/sync
 * Đồng bộ danh sách đơn hàng và công nợ khách hàng từ Sapo Omnichannel
 * Quét toàn diện phân trang: Đơn nợ (pending/partially_paid) + Đơn mở (open) + Đơn hoàn tất (closed)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    await connectToDatabase();
    const authHeader = getAuthHeader();
    const headers = {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };

    const limit = 250;
    const sapoOrders: any[] = [];

    // Helper: Tải toàn bộ các trang đơn hàng theo query
    async function fetchAllOrders(queryStr: string, maxPages = 10): Promise<any[]> {
      const results: any[] = [];
      let page = 1;
      while (page <= maxPages) {
        try {
          const res = await fetch(
            `https://${SAPO_DOMAIN}/admin/orders.json?${queryStr}&limit=${limit}&page=${page}`,
            { headers, cache: "no-store" }
          );
          if (!res.ok) break;
          const data = await res.json();
          const list = data.orders || [];
          results.push(...list);
          if (list.length < limit) break;
          page++;
        } catch {
          break;
        }
      }
      return results;
    }

    // Quét song song toàn bộ các trạng thái công nợ trên Sapo
    const [openPending, openPartPaid, closedPending, closedPartPaid, openRecent] = await Promise.all([
      fetchAllOrders("status=open&financial_status=pending"),
      fetchAllOrders("status=open&financial_status=partially_paid"),
      fetchAllOrders("status=closed&financial_status=pending"),
      fetchAllOrders("status=closed&financial_status=partially_paid"),
      fetchAllOrders("status=open", 2),
    ]);

    sapoOrders.push(...openPending, ...openPartPaid, ...closedPending, ...closedPartPaid, ...openRecent);

    // Tập hợp mã đơn nợ hợp lệ đang còn nợ trên Sapo
    const activeDebtSnSet = new Set<string>();
    const seenMap = new Map<string, any>();
    let debtOrdersCount = 0;

    for (const o of sapoOrders) {
      const key = String(o.order_number || o.name || o.id);
      if (!seenMap.has(key)) {
        seenMap.set(key, o);
      } else if (o.cancelled_on || o.cancel_reason || o.status === "cancelled") {
        seenMap.set(key, o);
      }

      if (!o.cancelled_on && o.status !== "cancelled" && o.financial_status !== "voided") {
        const total = Number(o.total_price) || 0;
        const received = Number(o.total_received) || 0;
        const out = Number(o.total_outstanding ?? (total > received ? total - received : 0));
        if (out > 0) {
          const sn = String(o.order_number || o.name || o.id).replace(/^#/, "").trim();
          activeDebtSnSet.add(sn);
          activeDebtSnSet.add(String(o.id));
          debtOrdersCount++;
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

      const totalPrice = Number(o.total_price) || 0;
      const rawReceived = Number(o.total_received) || 0;
      const outstanding = Number(
        o.total_outstanding ?? o.unpaid_amount ?? (totalPrice > rawReceived ? totalPrice - rawReceived : 0)
      );
      const totalReceived = rawReceived > 0 ? rawReceived : Math.max(0, totalPrice - outstanding);

      const phone =
        o.customer?.phone ||
        o.shipping_address?.phone ||
        o.billing_address?.phone ||
        "";

      const address =
        o.shipping_address?.address1 ||
        [o.shipping_address?.address1, o.shipping_address?.ward, o.shipping_address?.district, o.shipping_address?.city]
          .filter(Boolean)
          .join(", ") ||
        "";

      mappedOrders.push({
        order_sn: orderSn,
        shop_username: shopSource,
        buyer_username: buyerName,
        total_amount: totalPrice,
        payment_method: o.gateway || o.payment_gateway_names?.[0] || "Chưa rõ",
        order_status: orderStatus,
        status_description: `Kênh: ${rawSource.toUpperCase()} | Thanh toán: ${o.financial_status || "N/A"} | Giao hàng: ${o.fulfillment_status || "Chưa giao"}`,
        shipping_carrier: o.fulfillments?.[0]?.tracking_company || "",
        tracking_number: o.fulfillments?.[0]?.tracking_number || "",
        customer_phone: phone,
        customer_name: buyerName,
        customer_address: address,
        customer_id: o.customer?.id || null,
        sapo_id: o.id || null,
        financial_status: o.financial_status || "",
        total_received: totalReceived,
        unpaid_amount: outstanding,
        paid_on: o.paid_on || null,
        items,
        raw_text: JSON.stringify(o),
        synced_at: now,
        createdAt: o.created_on || o.created_at || now,
        updatedAt: now,
      });
    }

    const result = await OrderModel.upsertOrders(mappedOrders, "sapo_omnichannel");

    // Quét và cập nhật các đơn cũ trong MongoDB đã được thanh toán trên Sapo
    let updatedPaidCount = 0;
    const dbDebtDocs = await MongoShopeeOrderModel.find({
      order_status: { $ne: "Đã hủy" },
      $or: [
        { unpaid_amount: { $gt: 0 } },
        { status_description: { $regex: /pending|partially_paid/i } },
        { raw_text: { $regex: /"financial_status":"(pending|partially_paid)"/ } }
      ]
    }).lean();

    for (const doc of dbDebtDocs) {
      let raw: any = {};
      try {
        if (doc.raw_text) raw = JSON.parse(doc.raw_text);
      } catch {}
      const sn = String(doc.order_sn || raw.order_number || doc.id).replace(/^#/, "").trim();
      const sapoId = String(raw.id || doc.id);

      // Không tự động xóa nợ của các đơn sàn TMĐT (Shopee, Lazada, TikTok) hoặc đơn có ghi chú công nợ
      if (
        (doc.shop_username && /shopee|lazada|tiktok/i.test(doc.shop_username)) ||
        (raw.source_name && /shopee|lazada|tiktok/i.test(raw.source_name)) ||
        doc.status_description?.includes("Công nợ")
      ) {
        continue;
      }

      if (!activeDebtSnSet.has(sn) && !activeDebtSnSet.has(sapoId)) {
        raw.financial_status = "paid";
        raw.total_received = Number(raw.total_price || doc.total_amount) || 0;
        raw.total_outstanding = 0;
        raw.unpaid_amount = 0;
        raw.paid_on = raw.paid_on || now;

        await MongoShopeeOrderModel.updateOne(
          { _id: doc._id },
          {
            $set: {
              order_status: "Đã thanh toán",
              status_description: `Kênh: ${(doc.shop_username || "sapo").toUpperCase()} | Thanh toán: paid | Đã thanh toán`,
              financial_status: "paid",
              total_received: Number(raw.total_price || doc.total_amount) || 0,
              unpaid_amount: 0,
              paid_on: raw.paid_on || now,
              raw_text: JSON.stringify(raw),
              updatedAt: now,
            }
          }
        );
        updatedPaidCount++;
      }
    }

    const durationMs = Date.now() - startTime;

    // Ghi log đồng bộ
    try {
      await LogModel.createLog({
        level: "success",
        type: "customer_debt_sync",
        source: "sapo_debts_sync",
        shop_username: "sapo_omnichannel",
        message: `[Sapo Debts Sync] Đã đồng bộ ${result.total} đơn hàng (gồm ${activeDebtSnSet.size} đơn có công nợ, mới: ${result.inserted}, cập nhật: ${result.updated}, giải tỏa nợ đã trả: ${updatedPaidCount}) trong ${durationMs}ms`,
        details: {
          total: result.total,
          debt_orders: activeDebtSnSet.size,
          inserted: result.inserted,
          updated: result.updated,
          updated_to_paid: updatedPaidCount,
          duration_ms: durationMs,
        },
      });
    } catch {}

    // Xóa cache công nợ để hiển thị số liệu mới nhất
    invalidateCustomerDebtCache();

    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ thành công ${result.total} đơn hàng Sapo (gồm ${activeDebtSnSet.size} đơn nợ: ${result.inserted} mới, ${result.updated} cập nhật, ${updatedPaidCount} đơn đã thanh toán)`,
      data: {
        total: result.total,
        debt_orders: activeDebtSnSet.size,
        inserted: result.inserted,
        updated: result.updated,
        updated_to_paid: updatedPaidCount,
        duration_ms: durationMs,
      },
    });
  } catch (error: any) {
    console.error("[Customer Debt Sync Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi đồng bộ công nợ khách hàng từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sapo/debts/sync
 * Cho phép Vercel Cron Job tự động kích hoạt đồng bộ định kỳ
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

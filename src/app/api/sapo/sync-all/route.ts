import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel, MongoShopeeProductModel } from "@/server/db/schema";
import { LogModel } from "@/server/models/log.model";

export const maxDuration = 60;

const SAPO_DOMAIN = process.env.SAPO_STORE_DOMAIN || "cua-hang-yen-sen.mysapo.net";
const SAPO_API_KEY = process.env.SAPO_API_KEY || "9e84e8ba383f4f99a8cf2487932d4afe";
const SAPO_API_SECRET = process.env.SAPO_API_SECRET || "b4ddea44a45447a1ab29e3680fc76c16";

function getAuthHeader(): string {
  const token = Buffer.from(`${SAPO_API_KEY}:${SAPO_API_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

async function sapoGet(endpoint: string) {
  const res = await fetch(`https://${SAPO_DOMAIN}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, {
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Sapo API lỗi [${res.status}]: ${res.statusText}`);
  }
  return res.json();
}

function mapSapoOrder(o: any, now: string) {
  const orderSn = String(o.order_number || o.name || o.reference_order_number || o.id);
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
  if (o.cancelled_on || o.status === "cancelled" || o.financial_status === "voided") {
    orderStatus = "Đã hủy";
  } else if (o.fulfillment_status === "fulfilled") {
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

  return {
    id: orderSn,
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
  };
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const now = new Date().toISOString();

    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const step = body.step || "all";

    // 0. STEP COUNT: Đếm nhanh tổng số đơn trên Sapo theo từng trạng thái
    if (step === "count") {
      const [openCount, cancelledCount, closedCount] = await Promise.all([
        sapoGet("/admin/orders/count.json?status=open"),
        sapoGet("/admin/orders/count.json?status=cancelled"),
        sapoGet("/admin/orders/count.json?status=closed"),
      ]);

      const open = openCount.count || 0;
      const cancelled = cancelledCount.count || 0;
      const closed = closedCount.count || 0;
      const total = open + cancelled + closed;

      return NextResponse.json({
        success: true,
        data: {
          open,
          cancelled,
          closed,
          total,
        },
      });
    }

    // 1. STEP LATEST 200: Đồng bộ 200 đơn mới nhất từ Sapo
    if (step === "latest_200" || step === "recent_200") {
      const [openRes, closedRes, cancelledRes] = await Promise.all([
        sapoGet("/admin/orders.json?status=open&limit=150&page=1"),
        sapoGet("/admin/orders.json?status=closed&limit=50&page=1"),
        sapoGet("/admin/orders.json?status=cancelled&limit=50&page=1"),
      ]);

      const combined = [
        ...(openRes.orders || []),
        ...(closedRes.orders || []),
        ...(cancelledRes.orders || []),
      ];

      // Sắp xếp giảm dần theo thời gian tạo
      combined.sort((a: any, b: any) => {
        const timeA = new Date(a.created_on || a.created_at || 0).getTime();
        const timeB = new Date(b.created_on || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      const top200 = combined.slice(0, 200);

      const bulkOps = top200.map((o: any) => {
        const doc = mapSapoOrder(o, now);
        return {
          updateOne: {
            filter: { order_sn: doc.order_sn },
            update: { $set: doc },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        await MongoShopeeOrderModel.bulkWrite(bulkOps, { ordered: false });
      }

      await LogModel.createLog({
        level: "success",
        type: "order_sync",
        source: "sapo_recent_200",
        shop_username: "sapo_omnichannel",
        message: `[Sapo Sync] Đã đồng bộ ${bulkOps.length} đơn hàng mới nhất từ Sapo`,
        details: { syncedOrders: bulkOps.length },
      });

      return NextResponse.json({
        success: true,
        step: "latest_200",
        syncedOrders: bulkOps.length,
        message: `Đã đồng bộ thành công ${bulkOps.length} đơn hàng mới nhất từ Sapo!`,
      });
    }

    // 2. STEP PRODUCTS: Dọn dẹp extension cũ + đồng bộ 432 sản phẩm Sapo
    if (step === "products") {
      const deleteRes = await MongoShopeeOrderModel.deleteMany({
        $or: [
          { shop_username: "baobiyensen" },
          { shop_username: { $not: /^sapo_/ } },
          { raw_text: { $regex: /chrome_extension/i } },
        ],
      });

      const deleteProdRes = await MongoShopeeProductModel.deleteMany({
        $or: [
          { shop_username: "baobiyensen" },
          { shop_username: { $not: /^sapo/ } },
        ],
      });

      let page = 1;
      const allProducts: any[] = [];
      while (true) {
        const data = await sapoGet(`/admin/products.json?page=${page}&limit=250`);
        const prods = data.products || [];
        if (prods.length === 0) break;
        allProducts.push(...prods);
        if (prods.length < 250) break;
        page++;
        await new Promise((r) => setTimeout(r, 150));
      }

      const bulkOps = allProducts.map((p: any) => {
        const itemId = String(p.id);
        const variants = p.variants || [];
        const stock = variants.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0);
        const prices = variants.map((v: any) => v.price || 0).filter((pr: number) => pr > 0);
        const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
        const priceMax = prices.length > 0 ? Math.max(...prices) : 0;
        const priceDisplay =
          priceMin === priceMax
            ? `₫${priceMin.toLocaleString("vi-VN")}`
            : `₫${priceMin.toLocaleString("vi-VN")} - ₫${priceMax.toLocaleString("vi-VN")}`;

        const variations = variants.map((v: any) => ({
          model_id: String(v.id),
          name: v.title || v.sku || "Phân loại",
          sku: v.sku || "",
          price: v.price || 0,
          stock: v.inventory_quantity || 0,
          image: p.image?.src || "",
        }));

        const prodDoc = {
          id: itemId,
          item_id: itemId,
          name: p.name,
          parent_sku: variants[0]?.sku || "",
          image: p.image?.src || p.images?.[0]?.src || "",
          product_url: `https://${SAPO_DOMAIN}/admin/products/${p.id}`,
          price_min: priceMin,
          price_max: priceMax,
          price_display: priceDisplay,
          stock: stock,
          sales_30d: 0,
          views_30d: "0",
          status: stock > 0 ? "Đang hoạt động" : "Hết hàng",
          variations: variations,
          shop_username: "sapo_omnichannel",
          synced_at: now,
          createdAt: p.created_on || now,
          updatedAt: now,
        };

        return {
          updateOne: {
            filter: { item_id: itemId },
            update: { $set: prodDoc },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        await MongoShopeeProductModel.bulkWrite(bulkOps, { ordered: false });
      }

      return NextResponse.json({
        success: true,
        step: "products",
        message: `Đã dọn dẹp ${deleteRes.deletedCount} đơn extension cũ và cập nhật ${bulkOps.length} sản phẩm từ Sapo!`,
        data: {
          deletedExtensionOrders: deleteRes.deletedCount,
          deletedExtensionProducts: deleteProdRes.deletedCount,
          syncedProducts: bulkOps.length,
        },
      });
    }

    // 2. STEP ORDERS: Đồng bộ đơn hàng theo từng trạng thái và trang
    if (step === "orders") {
      const status = body.status || "open"; // 'open', 'cancelled', 'closed'
      const pageStart = Math.max(1, Number(body.pageStart) || 1);
      const pageEnd = Math.max(pageStart, Number(body.pageEnd) || pageStart);

      let totalSyncedInChunk = 0;

      for (let p = pageStart; p <= pageEnd; p++) {
        try {
          const data = await sapoGet(`/admin/orders.json?status=${status}&limit=250&page=${p}`);
          const orders = data.orders || [];
          if (orders.length === 0) break;

          const bulkOps = orders.map((o: any) => {
            const doc = mapSapoOrder(o, now);
            return {
              updateOne: {
                filter: { order_sn: doc.order_sn },
                update: { $set: doc },
                upsert: true,
              },
            };
          });

          if (bulkOps.length > 0) {
            await MongoShopeeOrderModel.bulkWrite(bulkOps, { ordered: false });
          }

          totalSyncedInChunk += orders.length;
          if (orders.length < 250) break;
          await new Promise((r) => setTimeout(r, 100));
        } catch (err: any) {
          console.error(`[Sapo Sync Orders Chunk Error] Status ${status} Page ${p}:`, err);
        }
      }

      return NextResponse.json({
        success: true,
        step: "orders",
        status,
        pageStart,
        pageEnd,
        syncedOrders: totalSyncedInChunk,
        message: `Đã đồng bộ ${totalSyncedInChunk} đơn hàng (${status}, trang ${pageStart}-${pageEnd})`,
      });
    }

    // 3. STEP ALL (Dành cho việc gọi trực tiếp API hoặc các môi trường không lo timeout)
    const [openP1, openP2, openP3, openP4] = await Promise.all([
      sapoGet("/admin/orders.json?status=open&limit=250&page=1"),
      sapoGet("/admin/orders.json?status=open&limit=250&page=2"),
      sapoGet("/admin/orders.json?status=open&limit=250&page=3"),
      sapoGet("/admin/orders.json?status=open&limit=250&page=4"),
    ]);

    const rawOrders = [
      ...(openP1.orders || []),
      ...(openP2.orders || []),
      ...(openP3.orders || []),
      ...(openP4.orders || []),
    ];

    const bulkOps = rawOrders.map((o: any) => {
      const doc = mapSapoOrder(o, now);
      return {
        updateOne: {
          filter: { order_sn: doc.order_sn },
          update: { $set: doc },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      await MongoShopeeOrderModel.bulkWrite(bulkOps, { ordered: false });
    }

    return NextResponse.json({
      success: true,
      message: `Đồng bộ nhanh Sapo thành công! Đã cập nhật ${bulkOps.length} đơn hàng đang mở. Để đồng bộ trọn vẹn 14.380 đơn, vui lòng dùng tính năng Đồng bộ toàn diện trên giao diện.`,
      data: {
        syncedOrders: bulkOps.length,
      },
    });
  } catch (error: any) {
    console.error("[Sapo Sync All Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi đồng bộ từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

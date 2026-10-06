import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel, MongoShopeeProductModel } from "@/server/db/schema";
import { LogModel } from "@/server/models/log.model";
import { ShopeeOrder } from "@/types";

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

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const now = new Date().toISOString();

    // 1. LOẠI BỎ TOÀN BỘ ĐƠN HÀNG VÀ SẢN PHẨM EXTENSION CŨ
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

    // 2. KÉO TOÀN BỘ SẢN PHẨM TỪ SAPO (432 SKU)
    let page = 1;
    const allProducts: any[] = [];
    while (true) {
      const data = await sapoGet(`/admin/products.json?page=${page}&limit=250`);
      const prods = data.products || [];
      if (prods.length === 0) break;
      allProducts.push(...prods);
      if (prods.length < 250) break;
      page++;
      await new Promise((r) => setTimeout(r, 200));
    }

    let prodCount = 0;
    for (const p of allProducts) {
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

      await MongoShopeeProductModel.updateOne(
        { item_id: itemId },
        { $set: prodDoc },
        { upsert: true }
      );
      prodCount++;
    }

    // 3. KÉO TOÀN BỘ ĐƠN HÀNG TỪ SAPO (MỞ RỘNG: 4 TRANG OPEN + 4 TRANG CLOSED = ~2.000 ĐƠN)
    const [openP1, openP2, openP3, openP4, closedP1, closedP2, closedP3, closedP4] = await Promise.all([
      sapoGet("/admin/orders.json?status=open&limit=250&page=1"),
      sapoGet("/admin/orders.json?status=open&limit=250&page=2"),
      sapoGet("/admin/orders.json?status=open&limit=250&page=3"),
      sapoGet("/admin/orders.json?status=open&limit=250&page=4"),
      sapoGet("/admin/orders.json?status=closed&limit=250&page=1"),
      sapoGet("/admin/orders.json?status=closed&limit=250&page=2"),
      sapoGet("/admin/orders.json?status=closed&limit=250&page=3"),
      sapoGet("/admin/orders.json?status=closed&limit=250&page=4"),
    ]);

    const rawOrders = [
      ...(openP1.orders || []),
      ...(openP2.orders || []),
      ...(openP3.orders || []),
      ...(openP4.orders || []),
      ...(closedP1.orders || []),
      ...(closedP2.orders || []),
      ...(closedP3.orders || []),
      ...(closedP4.orders || []),
    ];
    let orderCount = 0;

    for (const o of rawOrders) {
      const orderSn = String(o.order_number || o.name || o.reference_order_number || o.id);
      const rawSource = String(o.source_name || o.channel || "sapo").toLowerCase();

      let shopSource = "sapo_web";
      if (rawSource.includes("shopee")) shopSource = "sapo_shopee";
      else if (rawSource.includes("tiktok")) shopSource = "sapo_tiktok";
      else if (rawSource.includes("lazada")) shopSource = "sapo_lazada";
      else if (rawSource === "admin" || rawSource.includes("pos")) shopSource = "sapo_pos";
      else if (rawSource.includes("facebook")) shopSource = "sapo_facebook";
      else if (rawSource.includes("zalo")) shopSource = "sapo_zalo";
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

      const orderDoc = {
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

      await MongoShopeeOrderModel.updateOne(
        { order_sn: orderSn },
        { $set: orderDoc },
        { upsert: true }
      );
      orderCount++;
    }

    // Ghi log
    await LogModel.createLog({
      level: "success",
      type: "order_sync",
      source: "sapo_full_sync",
      shop_username: "sapo_omnichannel",
      message: `[Sapo Sync Toàn Diện] Đã đồng bộ ${orderCount} đơn hàng, ${prodCount} sản phẩm, xóa ${deleteRes.deletedCount} đơn extension cũ`,
      details: {
        deletedExtensionOrders: deleteRes.deletedCount,
        syncedProducts: prodCount,
        syncedOrders: orderCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đồng bộ toàn diện Sapo thành công! Đã loại bỏ ${deleteRes.deletedCount} đơn extension, cập nhật ${orderCount} đơn hàng và ${prodCount} sản phẩm Sapo.`,
      data: {
        deletedExtensionOrders: deleteRes.deletedCount,
        syncedProducts: prodCount,
        syncedOrders: orderCount,
      },
    });
  } catch (error: any) {
    console.error("[Sapo Sync All Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi đồng bộ toàn diện Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeProductModel } from "@/server/db/schema";
import { LogModel } from "@/server/models/log.model";

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
 * POST /api/sapo/inventory/sync
 * Kéo toàn bộ danh sách sản phẩm, phân loại hàng hóa và số lượng tồn kho thực tế từ Sapo Omnichannel
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    await connectToDatabase();
    const headers = {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    let page = 1;
    const allProducts: any[] = [];

    // 1. Quét toàn bộ sản phẩm từ Sapo với limit=250/trang
    while (true) {
      const res = await fetch(`https://${SAPO_DOMAIN}/admin/products.json?page=${page}&limit=250`, {
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Sapo API lỗi [${res.status}]: ${res.statusText} ${errorText}`);
      }

      const data = await res.json();
      const prods = data.products || [];
      if (prods.length === 0) break;
      allProducts.push(...prods);
      if (prods.length < 250) break;
      page++;
    }

    const now = new Date().toISOString();
    let totalStockAcrossAll = 0;
    const activeSapoIds: string[] = [];

    // 2. Chuyển đổi và chuẩn hóa cấu trúc dữ liệu ShopeeProduct
    const bulkOps = allProducts.map((p: any) => {
      const itemId = String(p.id);
      activeSapoIds.push(itemId);

      const variants = p.variants || [];
      const stock = variants.reduce(
        (sum: number, v: any) => sum + (Number(v.inventory_quantity) || 0),
        0
      );
      totalStockAcrossAll += stock;

      const prices = variants
        .map((v: any) => Number(v.price) || 0)
        .filter((pr: number) => pr > 0);
      const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
      const priceMax = prices.length > 0 ? Math.max(...prices) : 0;
      const priceDisplay =
        priceMin === priceMax
          ? priceMin > 0
            ? `₫${priceMin.toLocaleString("vi-VN")}`
            : "--"
          : `₫${priceMin.toLocaleString("vi-VN")} - ₫${priceMax.toLocaleString("vi-VN")}`;

      const variations = variants.map((v: any) => {
        let variantImg = p.image?.src || p.images?.[0]?.src || "";
        if (v.image_id && p.images?.length) {
          const matched = p.images.find((img: any) => img.id === v.image_id);
          if (matched?.src) variantImg = matched.src;
        }

        return {
          model_id: String(v.id),
          name: v.title || v.sku || "Mặc định",
          sku: v.sku || "",
          price: Number(v.price) || 0,
          stock: Number(v.inventory_quantity) || 0,
          image: variantImg,
        };
      });

      const prodDoc = {
        id: itemId,
        item_id: itemId,
        name: p.name || "Sản phẩm chưa đặt tên",
        parent_sku: variants[0]?.sku || p.sku || "",
        image: p.image?.src || p.images?.[0]?.src || "",
        product_url: `https://${SAPO_DOMAIN}/admin/products/${p.id}`,
        price_min: priceMin,
        price_max: priceMax,
        price_display: priceDisplay,
        stock: stock,
        sales_30d: 0,
        views_30d: "0",
        status: stock > 0 ? "Đang hoạt động" : "Hết hàng",
        options: p.options || [],
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

    // 3. Thực hiện bulkWrite cập nhật vào MongoDB
    let insertedCount = 0;
    let modifiedCount = 0;
    if (bulkOps.length > 0) {
      const bulkRes = await MongoShopeeProductModel.bulkWrite(bulkOps, { ordered: false });
      insertedCount = bulkRes.upsertedCount || 0;
      modifiedCount = bulkRes.modifiedCount || 0;
    }

    // 4. Dọn dẹp những sản phẩm đã bị xóa hoàn toàn trên Sapo khỏi MongoDB
    let deletedCount = 0;
    if (activeSapoIds.length > 0) {
      const delRes = await MongoShopeeProductModel.deleteMany({
        shop_username: "sapo_omnichannel",
        item_id: { $nin: activeSapoIds },
      });
      deletedCount = delRes.deletedCount || 0;
    }

    const durationMs = Date.now() - startTime;

    // 5. Ghi log hệ thống
    try {
      await LogModel.createLog({
        level: "success",
        type: "inventory_sync",
        source: "sapo_inventory_sync",
        shop_username: "sapo_omnichannel",
        message: `Đã đồng bộ thành công ${allProducts.length} sản phẩm, tồn kho ${totalStockAcrossAll.toLocaleString("vi-VN")} cái từ Sapo Omnichannel (${durationMs}ms)`,
        details: {
          total_products: allProducts.length,
          total_stock: totalStockAcrossAll,
          inserted: insertedCount,
          updated: modifiedCount,
          deleted_orphan: deletedCount,
          duration_ms: durationMs,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ thành công ${allProducts.length} sản phẩm và tồn kho từ Sapo Omnichannel!`,
      data: {
        total_products: allProducts.length,
        total_stock: totalStockAcrossAll,
        inserted: insertedCount,
        updated: modifiedCount,
        deleted_orphan: deletedCount,
        duration_ms: durationMs,
        synced_at: now,
      },
    });
  } catch (error: any) {
    console.error("[Sapo Inventory Sync API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi đồng bộ sản phẩm và kho hàng từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

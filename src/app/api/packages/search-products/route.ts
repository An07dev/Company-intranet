import { NextRequest } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeProductModel } from "@/server/db/schema";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

/**
 * GET /api/packages/search-products?q=...&limit=20
 * Tìm kiếm nhanh sản phẩm từ kho hàng để thêm vào kiện hàng
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập", 401);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    await connectToDatabase();

    const filter: Record<string, any> = {};

    if (query.trim()) {
      const q = query.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { parent_sku: { $regex: q, $options: "i" } },
        { item_id: { $regex: q, $options: "i" } },
        { "variations.name": { $regex: q, $options: "i" } },
        { "variations.sku": { $regex: q, $options: "i" } },
      ];
    }

    const docs = await MongoShopeeProductModel.find(filter)
      .select("item_id name parent_sku image price_min price_display stock variations")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    // Chuẩn hóa danh sách sản phẩm và phân loại để giao diện dễ dùng
    const products: Array<{
      product_id: string;
      model_id?: string;
      product_name: string;
      variation_name?: string;
      sku: string;
      image: string;
      stock: number;
      price: number;
      price_display: string;
      has_variations: boolean;
      all_variations?: Array<{
        model_id: string;
        name: string;
        sku: string;
        price: number;
        stock: number;
        image: string;
      }>;
    }> = [];

    for (const doc of docs) {
      const hasVariations = Array.isArray(doc.variations) && doc.variations.length > 0;

      if (!hasVariations) {
        products.push({
          product_id: String(doc.item_id),
          product_name: doc.name || `Sản phẩm ${doc.item_id}`,
          sku: doc.parent_sku || `SKU-${doc.item_id}`,
          image: doc.image || "",
          stock: doc.stock || 0,
          price: doc.price_min || 0,
          price_display: doc.price_display || `₫${Number(doc.price_min || 0).toLocaleString("vi-VN")}`,
          has_variations: false,
        });
      } else {
        // Thêm sản phẩm cha kèm danh sách các phân loại
        products.push({
          product_id: String(doc.item_id),
          product_name: doc.name || `Sản phẩm ${doc.item_id}`,
          sku: doc.parent_sku || `SKU-${doc.item_id}`,
          image: doc.image || "",
          stock: doc.stock || 0,
          price: doc.price_min || 0,
          price_display: doc.price_display || "",
          has_variations: true,
          all_variations: doc.variations.map((v: any) => ({
            model_id: String(v.model_id),
            name: v.name || "",
            sku: v.sku || doc.parent_sku || "",
            price: Number(v.price) || 0,
            stock: Number(v.stock) || 0,
            image: v.image || doc.image || "",
          })),
        });
      }
    }

    return apiSuccess({ products });
  } catch (error: any) {
    console.error("GET /api/packages/search-products error:", error);
    return apiError(error.message || "Lỗi khi tìm sản phẩm", 500);
  }
}

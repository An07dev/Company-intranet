import { connectToDatabase } from "@/server/db";
import { MongoShopeeProductModel, IShopeeProductDocument } from "@/server/db/schema";
import { ShopeeProduct, ShopeeProductVariation } from "@/types";

function cleanText(text?: string): string {
  return text ? text.replace(/\s+/g, " ").trim() : "";
}

function isValidImageUrl(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  if (/default-item-model-image/i.test(u)) return false;
  if (u.startsWith("blob:")) return false;
  if (u.startsWith("data:image")) return true;
  if (/^https?:\/\/|^\/\//i.test(u)) return true;
  if (/^\/uploads\//i.test(u)) return true;
  return false;
}

function sanitizeProductName(name?: string, itemId?: string): string {
  if (!name) return itemId ? `Sản phẩm ${itemId}` : "";

  let s = name.trim();
  s = s.replace(/^SSP\d+\s*/i, "");
  s = s.replace(/\s*SKU\s*sản\s*phẩm:\s*.*$/i, "");
  s = s.replace(/\s*ID\s*Sản\s*phẩm:\s*.*$/i, "");
  s = s.replace(/\s*Item\s*ID:\s*.*$/i, "");
  s = s.replace(/\s*Model\s*ID:\s*.*$/i, "");
  s = s.replace(/\s+/g, " ").trim();

  // Khử lặp chuỗi nếu tên bị nhân đôi (do popover tooltip + link text)
  if (s.length >= 6) {
    if (s.length % 2 === 0) {
      const half = s.length / 2;
      if (s.slice(0, half) === s.slice(half)) {
        s = s.slice(0, half).trim();
      }
    }
    const words = s.split(" ");
    if (words.length >= 2 && words.length % 2 === 0) {
      const half = words.length / 2;
      const part1 = words.slice(0, half).join(" ");
      const part2 = words.slice(half).join(" ");
      if (part1 === part2) {
        s = part1;
      }
    }
  }

  return s || (itemId ? `Sản phẩm ${itemId}` : "");
}

export function toSafeProduct(doc: IShopeeProductDocument): ShopeeProduct {
  const cleanName = sanitizeProductName(doc.name, doc.item_id);

  let image = isValidImageUrl(doc.image) ? doc.image : "";

  const variations: ShopeeProductVariation[] = (doc.variations || []).map((v) => ({
    model_id: v.model_id,
    name: v.name || "",
    sku: v.sku || "",
    price: v.price || 0,
    price_display: v.price_display || (v.price ? `₫${Number(v.price).toLocaleString("vi-VN")}` : ""),
    stock: v.stock ?? 0,
    sales: v.sales || 0,
    image: isValidImageUrl(v.image) ? v.image : "",
  }));

  // Nếu ảnh chính cấp cha rỗng, thử lấy ảnh từ biến thể đầu tiên có ảnh
  if (!image && variations.length > 0) {
    const varWithImg = variations.find((v) => v.image && isValidImageUrl(v.image));
    if (varWithImg && varWithImg.image) {
      image = varWithImg.image;
    }
  }

  let priceMin = doc.price_min || 0;
  let priceMax = doc.price_max || 0;
  let priceDisplay = doc.price_display || "";

  // Tự động suy ra khoảng giá từ phân loại hàng nếu giá cấp cha bị thiếu hoặc bằng 0
  if (variations.length > 0) {
    const validPrices = variations.map((v) => v.price).filter((p) => p > 0);
    if (validPrices.length > 0) {
      const minV = Math.min(...validPrices);
      const maxV = Math.max(...validPrices);
      if (priceMin === 0) priceMin = minV;
      if (priceMax === 0) priceMax = maxV;
      if (!priceDisplay || priceDisplay === "₫0" || priceDisplay === "₫") {
        priceDisplay =
          minV === maxV
            ? `₫${minV.toLocaleString("vi-VN")}`
            : `₫${minV.toLocaleString("vi-VN")} - ₫${maxV.toLocaleString("vi-VN")}`;
      }
    }

    // Bổ sung giá cho các phân loại còn bị 0 từ giá cha
    if (priceMin > 0) {
      variations.forEach((v) => {
        if (v.price === 0) {
          v.price = priceMin;
          v.price_display = `₫${priceMin.toLocaleString("vi-VN")}`;
        }
      });
    }
  }

  if (!priceDisplay || priceDisplay === "₫0" || priceDisplay === "₫") {
    if (priceMin > 0) {
      priceDisplay =
        priceMin === priceMax
          ? `₫${priceMin.toLocaleString("vi-VN")}`
          : `₫${priceMin.toLocaleString("vi-VN")} - ₫${priceMax.toLocaleString("vi-VN")}`;
    } else {
      priceDisplay = "--";
    }
  }

  // Ảnh đại diện dự phòng từ phân loại đầu tiên nếu ảnh cha bị trống
  if (!image && variations.length > 0) {
    const firstVarImg = variations.find((v) => isValidImageUrl(v.image))?.image;
    if (firstVarImg) image = firstVarImg;
  }

  // Nếu cha có ảnh nhưng phân loại thiếu -> gán ảnh cha
  if (image) {
    variations.forEach((v) => {
      if (!v.image) v.image = image;
    });
  }

  // Tự động tính tồn kho nếu = 0 nhưng phân loại có hàng
  let stock = doc.stock ?? 0;
  if (variations.length > 0) {
    const sumVarStock = variations.reduce((acc, v) => acc + (v.stock || 0), 0);
    if (sumVarStock > 0 && stock === 0) {
      stock = sumVarStock;
    }
  }

  return {
    id: doc.id,
    item_id: doc.item_id,
    name: cleanName,
    parent_sku: doc.parent_sku || "",
    image: image,
    product_url: doc.product_url || `https://banhang.shopee.vn/portal/product/${doc.item_id}`,
    price_min: priceMin,
    price_max: priceMax,
    price_display: priceDisplay,
    stock: stock,
    sales_30d: doc.sales_30d || 0,
    views_30d: doc.views_30d || "0",
    status: stock > 0 ? (doc.status || "Đang hoạt động") : "Hết hàng",
    variations: variations,
    shop_username: doc.shop_username || "baobiyensen",
    synced_at: doc.synced_at,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class ProductModel {
  /**
   * Lưu hoặc cập nhật hàng loạt sản phẩm từ Shopee (chống trùng lặp theo item_id)
   */
  static async upsertProducts(products: ShopeeProduct[], shopUsername = "baobiyensen") {
    await connectToDatabase();

    const now = new Date().toISOString();
    let insertedCount = 0;
    let updatedCount = 0;

    for (const prod of products) {
      if (!prod.item_id) continue;

      const targetShop = prod.shop_username || shopUsername || "baobiyensen";
      const existing = await MongoShopeeProductModel.findOne({ item_id: String(prod.item_id) });

      const cleanName = sanitizeProductName(prod.name, prod.item_id);

      const variationsData = (prod.variations || []).map((v) => ({
        model_id: String(v.model_id || `model_${Date.now()}`),
        name: v.name || "",
        sku: v.sku || "",
        price: Number(v.price) || 0,
        price_display: v.price_display || (v.price ? `₫${Number(v.price).toLocaleString("vi-VN")}` : ""),
        stock: Number(v.stock) || 0,
        sales: Number(v.sales) || 0,
        image: isValidImageUrl(v.image) ? v.image : "",
      }));

      // Tính tổng stock từ các phân loại nếu stock cha chưa có hoặc = 0
      let totalStock = Number(prod.stock) || 0;
      if (variationsData.length > 0) {
        const sumVarStock = variationsData.reduce((acc, v) => acc + (v.stock || 0), 0);
        if (sumVarStock > 0 && totalStock === 0) {
          totalStock = sumVarStock;
        }
      }

      // Tự động tính giá từ phân loại nếu giá cấp cha bị thiếu hoặc = 0
      let pMin = Number(prod.price_min) || 0;
      let pMax = Number(prod.price_max) || 0;
      let pDisplay = prod.price_display || "";

      if (variationsData.length > 0) {
        const validPrices = variationsData.map((v) => v.price).filter((p) => p > 0);
        if (validPrices.length > 0) {
          const minV = Math.min(...validPrices);
          const maxV = Math.max(...validPrices);
          if (pMin === 0) pMin = minV;
          if (pMax === 0) pMax = maxV;
          if (!pDisplay || pDisplay === "₫0" || pDisplay === "₫") {
            pDisplay =
              minV === maxV
                ? `₫${minV.toLocaleString("vi-VN")}`
                : `₫${minV.toLocaleString("vi-VN")} - ₫${maxV.toLocaleString("vi-VN")}`;
          }
        }

        // Bổ sung giá cho các phân loại còn bị 0 từ giá cha
        if (pMin > 0) {
          variationsData.forEach((v) => {
            if (v.price === 0) {
              v.price = pMin;
              v.price_display = `₫${pMin.toLocaleString("vi-VN")}`;
            }
          });
        }
      }

      // Ảnh đại diện hợp lệ
      let pImage = isValidImageUrl(prod.image) ? prod.image : "";
      if (!pImage && variationsData.length > 0) {
        const firstVarImg = variationsData.find((v) => isValidImageUrl(v.image))?.image;
        if (firstVarImg) pImage = firstVarImg;
      }

      // Đồng bộ ảnh cha cho các phân loại thiếu ảnh
      if (pImage) {
        variationsData.forEach((v) => {
          if (!v.image) v.image = pImage;
        });
      }

      if (existing) {
        // Cập nhật sản phẩm cũ
        existing.shop_username = targetShop;
        existing.name = cleanName || existing.name;
        existing.parent_sku = prod.parent_sku !== undefined ? prod.parent_sku : existing.parent_sku;
        if (pImage) existing.image = pImage;
        if (prod.product_url) existing.product_url = prod.product_url;
        if (pMin > 0) existing.price_min = pMin;
        if (pMax > 0) existing.price_max = pMax;
        if (pDisplay && pDisplay !== "--") existing.price_display = pDisplay;
        existing.stock = totalStock;
        existing.sales_30d = prod.sales_30d !== undefined ? Number(prod.sales_30d) : existing.sales_30d;
        existing.views_30d = prod.views_30d !== undefined ? String(prod.views_30d) : existing.views_30d;
        existing.status = totalStock > 0 ? (prod.status || existing.status || "Đang hoạt động") : "Hết hàng";
        if (variationsData.length > 0) {
          existing.variations = variationsData;
        }
        existing.synced_at = now;
        existing.updatedAt = now;
        await existing.save();
        updatedCount++;
      } else {
        // Tạo sản phẩm mới
        await MongoShopeeProductModel.create({
          id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          item_id: String(prod.item_id),
          name: cleanName || "Sản phẩm Shopee",
          parent_sku: prod.parent_sku || "",
          image: pImage,
          product_url: prod.product_url || `https://banhang.shopee.vn/portal/product/${prod.item_id}`,
          price_min: pMin,
          price_max: pMax,
          price_display: pDisplay || (pMin > 0 ? `₫${pMin.toLocaleString("vi-VN")}` : "--"),
          stock: totalStock,
          sales_30d: Number(prod.sales_30d) || 0,
          views_30d: String(prod.views_30d || "0"),
          status: totalStock > 0 ? (prod.status || "Đang hoạt động") : "Hết hàng",
          variations: variationsData,
          shop_username: targetShop,
          synced_at: now,
          createdAt: now,
          updatedAt: now,
        });
        insertedCount++;
      }
    }

    return {
      total: products.length,
      inserted: insertedCount,
      updated: updatedCount,
    };
  }

  /**
   * Lấy danh sách sản phẩm có phân trang, bộ lọc và tìm kiếm
   */
  static async getProducts(params: {
    page?: number;
    limit?: number;
    status?: string;
    stock_status?: string; // "in_stock" | "out_of_stock" | "all"
    search?: string;
    shop_username?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    await connectToDatabase();

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (params.shop_username && params.shop_username !== "all") {
      query.shop_username = { $regex: params.shop_username, $options: "i" };
    }

    if (params.status && params.status !== "all") {
      query.status = { $regex: params.status, $options: "i" };
    }

    if (params.stock_status === "in_stock") {
      query.stock = { $gt: 0 };
    } else if (params.stock_status === "out_of_stock") {
      query.stock = { $lte: 0 };
    } else if (params.stock_status === "low_stock") {
      query.stock = { $gt: 0, $lte: 10 };
    }

    if (params.search) {
      const s = params.search.trim();
      query.$or = [
        { name: { $regex: s, $options: "i" } },
        { item_id: { $regex: s, $options: "i" } },
        { parent_sku: { $regex: s, $options: "i" } },
        { "variations.sku": { $regex: s, $options: "i" } },
        { "variations.name": { $regex: s, $options: "i" } },
      ];
    }

    const sortOptions: Record<string, 1 | -1> = {};
    const sortField = params.sortBy || "createdAt";
    const sortDir = params.sortOrder === "asc" ? 1 : -1;
    sortOptions[sortField] = sortDir;

    const [docs, total] = await Promise.all([
      MongoShopeeProductModel.find(query).sort(sortOptions).skip(skip).limit(limit).lean(),
      MongoShopeeProductModel.countDocuments(query),
    ]);

    return {
      products: docs.map(toSafeProduct),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Thống kê tổng quan sản phẩm
   */
  static async getStats(shopUsername?: string) {
    await connectToDatabase();

    const filter: Record<string, any> = {};
    if (shopUsername && shopUsername !== "all") {
      filter.shop_username = { $regex: shopUsername, $options: "i" };
    }

    const [totalProducts, inStockCount, outOfStockCount, lowStockCount, allProducts, uniqueShops] = await Promise.all([
      MongoShopeeProductModel.countDocuments(filter),
      MongoShopeeProductModel.countDocuments({ ...filter, stock: { $gt: 0 } }),
      MongoShopeeProductModel.countDocuments({ ...filter, stock: { $lte: 0 } }),
      MongoShopeeProductModel.countDocuments({ ...filter, stock: { $gt: 0, $lte: 10 } }),
      MongoShopeeProductModel.find(filter).select("stock sales_30d variations").lean(),
      MongoShopeeProductModel.distinct("shop_username"),
    ]);

    let totalStock = 0;
    let totalSales30d = 0;
    let totalVariations = 0;

    for (const p of allProducts) {
      totalStock += p.stock || 0;
      totalSales30d += p.sales_30d || 0;
      totalVariations += (p.variations || []).length;
    }

    return {
      totalProducts,
      inStockCount,
      outOfStockCount,
      lowStockCount,
      totalStock,
      totalSales30d,
      totalVariations,
      uniqueShops: uniqueShops.filter(Boolean),
    };
  }

  /**
   * Xóa sản phẩm theo item_id hoặc xóa toàn bộ
   */
  static async deleteProducts(itemIds?: string[]) {
    await connectToDatabase();
    if (itemIds && itemIds.length > 0) {
      const res = await MongoShopeeProductModel.deleteMany({ item_id: { $in: itemIds } });
      return { deletedCount: res.deletedCount };
    }
    const res = await MongoShopeeProductModel.deleteMany({});
    return { deletedCount: res.deletedCount };
  }
}

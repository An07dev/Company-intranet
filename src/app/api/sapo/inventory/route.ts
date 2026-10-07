import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeProductModel } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";
import fs from "fs/promises";
import path from "path";

export const maxDuration = 30;

/**
 * Helper: Chuyển đổi dữ liệu ảnh (Base64 hoặc URL) thành link public trực tiếp
 * để máy chủ Sapo có thể tải về và lưu trữ vào CDN Bizweb
 */
async function uploadToPublicStorage(imageInput: string): Promise<string> {
  if (!imageInput || !imageInput.trim()) return "";
  const clean = imageInput.trim();

  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  if (clean.startsWith("data:image/")) {
    try {
      const matches = clean.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        let ext = "jpg";
        if (mimeType.includes("png")) ext = "png";
        else if (mimeType.includes("webp")) ext = "webp";
        else if (mimeType.includes("gif")) ext = "gif";

        const form = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", blob, `prod_${Date.now()}.${ext}`);

        const catboxRes = await fetch("https://catbox.moe/user/api.php", {
          method: "POST",
          body: form,
        });

        if (catboxRes.ok) {
          const text = (await catboxRes.text()).trim();
          if (text.startsWith("http")) {
            console.log(`[Upload Public Storage] Đã tải ảnh lên trung gian thành công: ${text}`);
            return text;
          }
        } else {
          console.warn("[Upload Public Storage] Phản hồi lỗi từ Catbox:", catboxRes.status);
        }
      }
    } catch (err: any) {
      console.warn("[Upload Public Storage Error]:", err.message);
    }
  }

  return clean;
}

/**
 * Helper: Tải ảnh (Base64 hoặc URL) lên Sapo để lưu trữ trên Sapo Bizweb CDN
 * và gắn trực tiếp vào các biến thể (variant_ids) của sản phẩm
 */
async function syncImageToSapo(
  sapoProductId: string | number,
  imageInput: string,
  variantIds?: (string | number)[]
): Promise<string> {
  if (!imageInput || !imageInput.trim()) return "";
  const clean = imageInput.trim();

  try {
    const publicUrl = await uploadToPublicStorage(clean);

    // Đồng bộ URL ảnh lên Sapo qua API POST /admin/products/{id}/images.json
    if (publicUrl && (publicUrl.startsWith("http://") || publicUrl.startsWith("https://"))) {
      const imagePayload: any = { src: publicUrl };
      if (variantIds && variantIds.length > 0) {
        imagePayload.variant_ids = variantIds.map(Number).filter(Boolean);
      }

      const sapoImgRes = await SapoService.uploadProductImage(sapoProductId, imagePayload);
      if (sapoImgRes?.image?.src) {
        return sapoImgRes.image.src; // URL CDN chính thức của Sapo: https://bizweb.dktcdn.net/...
      }
    }
  } catch (err: any) {
    console.warn(`[Sync Image To Sapo Error] Product #${sapoProductId}:`, err.message);
  }

  // Dự phòng: trả về chuỗi ảnh ban đầu (Base64 hoặc URL gốc) để hiển thị trong nội bộ
  return clean;
}

/**
 * PUT /api/sapo/inventory
 * Điều chỉnh tồn kho thực tế (Kiểm kho / Cập nhật số lượng khả dụng) 2 chiều lên Sapo
 */
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const now = new Date().toISOString();
    const body = await request.json();

    const { item_id, model_id, new_stock, reason = "Kiểm kê định kỳ" } = body;

    if (!item_id) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã sản phẩm item_id" },
        { status: 400 }
      );
    }

    if (new_stock === undefined || isNaN(Number(new_stock)) || Number(new_stock) < 0) {
      return NextResponse.json(
        { success: false, message: "Số lượng tồn kho mới không hợp lệ" },
        { status: 400 }
      );
    }

    const targetStock = Number(new_stock);

    const product = await MongoShopeeProductModel.findOne({ item_id: String(item_id) });
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy sản phẩm trong cơ sở dữ liệu" },
        { status: 404 }
      );
    }

    // Xác định biến thể cần cập nhật trên Sapo
    const targetModelId =
      model_id || product.variations?.[0]?.model_id || String(item_id);

    // Cập nhật lên Sapo API
    let sapoResponse: any = null;
    try {
      sapoResponse = await SapoService.updateVariantInventory(targetModelId, targetStock);
    } catch (sapoErr: any) {
      console.warn(`[Sapo Inventory Update Warning] Variant ${targetModelId}:`, sapoErr.message);
    }

    // Cập nhật trong MongoDB
    let totalStock = 0;
    if (product.variations && product.variations.length > 0) {
      product.variations = product.variations.map((v: any) => {
        if (String(v.model_id) === String(targetModelId) || product.variations.length === 1) {
          v.stock = targetStock;
        }
        totalStock += v.stock || 0;
        return v;
      });
    } else {
      totalStock = targetStock;
    }

    const newStatus = totalStock > 0 ? "Đang hoạt động" : "Hết hàng";

    await MongoShopeeProductModel.updateOne(
      { item_id: String(item_id) },
      {
        $set: {
          stock: totalStock,
          status: newStatus,
          variations: product.variations,
          updatedAt: now,
        },
      }
    );

    // Ghi log kiểm kê
    await LogModel.createLog({
      level: "success",
      type: "inventory_adjustment",
      source: "sapo_inventory_adjust",
      shop_username: product.shop_username || "sapo_omnichannel",
      message: `Đã điều chỉnh tồn kho SKU ${product.parent_sku || item_id} thành ${targetStock} (Lý do: ${reason})`,
      details: {
        item_id,
        model_id: targetModelId,
        new_stock: targetStock,
        reason,
        sapo_status: sapoResponse ? "synced" : "local_updated",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật tồn kho SKU ${product.parent_sku || item_id} thành ${targetStock} cái thành công lên Sapo!`,
      data: {
        item_id,
        stock: totalStock,
        status: newStatus,
      },
    });
  } catch (error: any) {
    console.error("[Sapo Inventory Update Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi điều chỉnh tồn kho trên Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sapo/inventory
 * Cập nhật thông tin hàng hóa, mã SKU, giá bán niêm yết lên Sapo
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const now = new Date().toISOString();
    const body = await request.json();

    const { item_id, name, price, parent_sku } = body;

    if (!item_id) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã sản phẩm item_id" },
        { status: 400 }
      );
    }

    const product = await MongoShopeeProductModel.findOne({ item_id: String(item_id) });
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy sản phẩm trong hệ thống" },
        { status: 404 }
      );
    }

    // 1. Cập nhật tên sản phẩm trên Sapo
    if (name) {
      try {
        await SapoService.updateProduct(item_id, { name: name.trim() });
      } catch (err: any) {
        console.warn(`[Sapo Product Name Update Warning]:`, err.message);
      }
    }

    // 2. Cập nhật biến thể (giá, SKU) trên Sapo
    const targetModelId = product.variations?.[0]?.model_id;
    if (targetModelId && (price !== undefined || parent_sku)) {
      try {
        const variantUpdate: any = {};
        if (price !== undefined) variantUpdate.price = Number(price);
        if (parent_sku) variantUpdate.sku = parent_sku.trim();
        await SapoService.updateVariant(targetModelId, variantUpdate);
      } catch (err: any) {
        console.warn(`[Sapo Variant Update Warning]:`, err.message);
      }
    }

    // 3. Khởi tạo đối tượng cập nhật MongoDB
    const updateDoc: any = { updatedAt: now };

    // Cập nhật ảnh nếu có
    if (body.image !== undefined) {
      const cleanImg = String(body.image || "").trim();
      const variantIds = (product.variations || []).map((v: any) => v.model_id).filter(Boolean);
      const finalImageUrl = cleanImg ? await syncImageToSapo(item_id, cleanImg, variantIds) : "";

      updateDoc.image = finalImageUrl;
      if (product.variations && product.variations.length > 0) {
        updateDoc.variations = product.variations.map((v: any) => ({
          ...v,
          image: finalImageUrl,
        }));
      }
    }

    // 4. Cập nhật thông tin chi tiết MongoDB
    if (name) updateDoc.name = name.trim();
    if (parent_sku) updateDoc.parent_sku = parent_sku.trim();
    if (price !== undefined) {
      const numPrice = Number(price);
      updateDoc.price_min = numPrice;
      updateDoc.price_max = numPrice;
      updateDoc.price_display = `₫${numPrice.toLocaleString("vi-VN")}`;
    }

    await MongoShopeeProductModel.updateOne({ item_id: String(item_id) }, { $set: updateDoc });

    await LogModel.createLog({
      level: "info",
      type: "product_update",
      source: "sapo_inventory_edit",
      shop_username: product.shop_username || "sapo_omnichannel",
      message: `Đã cập nhật thông tin sản phẩm #${item_id}`,
      details: body,
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thông tin hàng hóa #${item_id} thành công lên Sapo!`,
    });
  } catch (error: any) {
    console.error("[Sapo Inventory Edit Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi cập nhật thông tin hàng hóa",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sapo/inventory
 * Tạo mới mã hàng hóa / SKU trực tiếp lên Sapo & đồng bộ tồn kho ban đầu
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const now = new Date().toISOString();
    const body = await request.json();

    const {
      name,
      sku,
      price = 0,
      stock = 0,
      description = "",
      branch = "Kho Tổng Yến Sen",
      image = "",
      options = [],
      variants = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên hàng hóa" },
        { status: 400 }
      );
    }

    const cleanSku = (sku || `SKU-${Date.now()}`).trim();
    const numPrice = Math.max(0, Number(price) || 0);
    const numStock = Math.max(0, Number(stock) || 0);

    // Kiểm tra xem người dùng có nhập thuộc tính (Options / Variants) không
    const hasAttributes =
      Array.isArray(options) &&
      options.length > 0 &&
      options.some((o: any) => o.name?.trim() && Array.isArray(o.values) && o.values.length > 0) &&
      Array.isArray(variants) &&
      variants.length > 0;

    // Chuẩn bị URL ảnh công khai trước khi tạo sản phẩm trên Sapo
    let publicImageUrl = "";
    if (image && typeof image === "string" && image.trim()) {
      publicImageUrl = await uploadToPublicStorage(image.trim());
    }

    // 1. Tạo sản phẩm trên Sapo REST API
    const sapoProductPayload: any = {
      name: name.trim(),
      tags: "kho_tong_yen_sen,internal_website",
      description: description.trim(),
    };

    // Nếu đã có link ảnh công khai, gán trực tiếp vào sapoProductPayload.images
    // Sapo sẽ tự động tải về, lưu CDN và liên kết tự động tới các biến thể (variant_ids, image_id)
    if (publicImageUrl && (publicImageUrl.startsWith("http://") || publicImageUrl.startsWith("https://"))) {
      sapoProductPayload.images = [{ src: publicImageUrl }];
    }

    let formattedOptions: any[] = [];
    if (hasAttributes) {
      formattedOptions = options
        .filter((o: any) => o.name?.trim() && Array.isArray(o.values) && o.values.length > 0)
        .map((opt: any, idx: number) => ({
          name: String(opt.name).trim(),
          values: opt.values.map((v: any) => String(v).trim()).filter(Boolean),
          position: idx + 1,
        }));

      sapoProductPayload.options = formattedOptions;
      sapoProductPayload.variants = variants.map((v: any, idx: number) => {
        const vPrice = Math.max(0, Number(v.price) || numPrice);
        const vSku = (v.sku || `${cleanSku}-${idx + 1}`).trim();
        const vPayload: any = {
          sku: vSku,
          price: vPrice,
          inventory_quantity: 0,
        };
        if (v.option1) vPayload.option1 = String(v.option1).trim();
        if (v.option2) vPayload.option2 = String(v.option2).trim();
        if (v.option3) vPayload.option3 = String(v.option3).trim();
        return vPayload;
      });
    } else {
      sapoProductPayload.variants = [
        {
          sku: cleanSku,
          price: numPrice,
          inventory_quantity: 0,
        },
      ];
    }

    const createRes = await SapoService.createProduct(sapoProductPayload);
    const sapoProd = createRes.product;

    if (!sapoProd) {
      throw new Error("Sapo không phản hồi thông tin sản phẩm vừa tạo");
    }

    const sapoItemId = String(sapoProd.id);

    // Xác định URL ảnh chính thức từ Sapo Bizweb CDN
    let finalImageUrl = "";
    if (sapoProd.images && sapoProd.images.length > 0 && sapoProd.images[0]?.src) {
      finalImageUrl = sapoProd.images[0].src;
    } else if (publicImageUrl && (publicImageUrl.startsWith("http://") || publicImageUrl.startsWith("https://"))) {
      // Nếu Sapo chưa xử lý kịp ảnh trong payload tạo sản phẩm, gọi API upload kèm variant_ids
      const variantIds = (sapoProd.variants || []).map((v: any) => v.id).filter(Boolean);
      try {
        const uploadImgRes = await SapoService.uploadProductImage(sapoItemId, {
          src: publicImageUrl,
          variant_ids: variantIds,
        });
        if (uploadImgRes?.image?.src) {
          finalImageUrl = uploadImgRes.image.src;
        }
      } catch (uploadErr: any) {
        console.warn("[Sapo Image Fallback Upload Warning]:", uploadErr.message);
      }
    }

    if (!finalImageUrl) {
      finalImageUrl = image && typeof image === "string" ? image.trim() : "";
    }

    // 2. Xử lý tồn kho và biến thể
    let finalVariations: any[] = [];
    let totalStock = 0;
    let minPrice = numPrice;
    let maxPrice = numPrice;

    if (hasAttributes && sapoProd.variants && sapoProd.variants.length > 0) {
      finalVariations = sapoProd.variants.map((sv: any, idx: number) => {
        const orig =
          variants.find((v: any) => v.sku?.trim() === sv.sku?.trim()) ||
          variants.find((v: any) => v.option1 === sv.option1 && (!v.option2 || v.option2 === sv.option2)) ||
          variants[idx] ||
          {};
        const vStock = Math.max(0, Number(orig.stock) || 0);
        totalStock += vStock;

        return {
          model_id: String(sv.id),
          name: sv.title || orig.name || `Phân loại ${idx + 1}`,
          sku: sv.sku || orig.sku || `${cleanSku}-${idx + 1}`,
          price: Number(sv.price) || Number(orig.price) || numPrice,
          stock: vStock,
          sales: 0,
          image: finalImageUrl,
        };
      });

      // Cập nhật tồn kho từng biến thể lên Sapo
      for (let i = 0; i < sapoProd.variants.length; i++) {
        const sv = sapoProd.variants[i];
        const fv = finalVariations[i];
        if (sv.id && fv.stock > 0) {
          try {
            await SapoService.updateVariantInventory(sv.id, fv.stock);
          } catch (err: any) {
            console.warn(`[Sapo Set Variant Stock Warning] ${sv.id}:`, err.message);
          }
        }
      }

      const prices = finalVariations.map((v) => v.price).filter((p) => p > 0);
      if (prices.length > 0) {
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
      }
    } else {
      const variantId = sapoProd.variants?.[0]?.id;
      totalStock = numStock;
      if (variantId && numStock > 0) {
        try {
          await SapoService.updateVariantInventory(variantId, numStock);
        } catch (err: any) {
          console.warn("[Sapo Set Initial Stock Warning]:", err.message);
        }
      }

      finalVariations = [
        {
          model_id: String(variantId || `model_${Date.now()}`),
          name: "Mặc định",
          sku: cleanSku,
          price: numPrice,
          stock: numStock,
          image: finalImageUrl,
        },
      ];
    }

    const priceDisplay =
      minPrice === maxPrice
        ? minPrice > 0
          ? `₫${minPrice.toLocaleString("vi-VN")}`
          : "--"
        : `₫${minPrice.toLocaleString("vi-VN")} - ₫${maxPrice.toLocaleString("vi-VN")}`;

    // 3. Lưu vào MongoDB
    const prodDoc = {
      id: sapoItemId,
      item_id: sapoItemId,
      name: name.trim(),
      parent_sku: cleanSku,
      image: finalImageUrl,
      product_url: `https://cua-hang-yen-sen.mysapo.net/admin/products/${sapoItemId}`,
      price_min: minPrice,
      price_max: maxPrice,
      price_display: priceDisplay,
      stock: totalStock,
      sales_30d: 0,
      views_30d: "0",
      status: totalStock > 0 ? "Đang hoạt động" : "Hết hàng",
      options: sapoProd.options || (hasAttributes ? formattedOptions : []),
      variations: finalVariations,
      shop_username: "sapo_omnichannel",
      synced_at: now,
      createdAt: now,
      updatedAt: now,
    };

    await MongoShopeeProductModel.updateOne(
      { item_id: sapoItemId },
      { $set: prodDoc },
      { upsert: true }
    );

    // 4. Ghi log
    await LogModel.createLog({
      level: "success",
      type: "product_create",
      source: "sapo_inventory_create",
      shop_username: "sapo_omnichannel",
      message: `Đã tạo hàng hóa mới lên Sapo: ${name} (SKU: ${cleanSku}, Tồn: ${numStock})`,
      details: { item_id: sapoItemId, sku: cleanSku, stock: numStock, branch },
    });

    return NextResponse.json({
      success: true,
      message: `Tạo mã hàng SKU ${cleanSku} thành công lên Sapo với số tồn ban đầu ${numStock} cái!`,
      data: prodDoc,
    });
  } catch (error: any) {
    console.error("[Sapo Create Product Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi tạo hàng hóa lên Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sapo/inventory
 * Xóa hàng hóa khỏi kho và hệ thống Sapo
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const item_id = searchParams.get("item_id");

    if (!item_id) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã sản phẩm item_id" },
        { status: 400 }
      );
    }

    // 1. Xóa trên Sapo
    try {
      await SapoService.deleteProduct(item_id);
    } catch (err: any) {
      console.warn(`[Sapo Delete Warning] Item ${item_id}:`, err.message);
    }

    // 2. Xóa trong MongoDB
    await MongoShopeeProductModel.deleteOne({ item_id: String(item_id) });

    await LogModel.createLog({
      level: "warn",
      type: "product_delete",
      source: "sapo_inventory_delete",
      shop_username: "sapo_omnichannel",
      message: `Đã xóa hàng hóa #${item_id} khỏi kho và hệ thống Sapo`,
      details: { item_id },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa sản phẩm #${item_id} thành công!`,
    });
  } catch (error: any) {
    console.error("[Sapo Delete Product Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi xóa hàng hóa",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

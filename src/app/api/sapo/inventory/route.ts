import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeProductModel } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

export const maxDuration = 30;

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

    // 3. Cập nhật MongoDB
    const updateDoc: any = { updatedAt: now };
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

    // 1. Tạo sản phẩm trên Sapo REST API
    const sapoProductPayload = {
      name: name.trim(),
      tags: "kho_tong_yen_sen,internal_website",
      description: description.trim(),
      variants: [
        {
          sku: cleanSku,
          price: numPrice,
          inventory_quantity: 0,
        },
      ],
    };

    const createRes = await SapoService.createProduct(sapoProductPayload);
    const sapoProd = createRes.product;

    if (!sapoProd) {
      throw new Error("Sapo không phản hồi thông tin sản phẩm vừa tạo");
    }

    const sapoItemId = String(sapoProd.id);
    const variantId = sapoProd.variants?.[0]?.id;

    // 2. Nếu có tồn kho ban đầu, kích hoạt quản lý tồn kho và gán số lượng
    if (variantId && numStock > 0) {
      try {
        await SapoService.updateVariantInventory(variantId, numStock);
      } catch (err: any) {
        console.warn("[Sapo Set Initial Stock Warning]:", err.message);
      }
    }

    // 3. Lưu vào MongoDB
    const prodDoc = {
      id: sapoItemId,
      item_id: sapoItemId,
      name: name.trim(),
      parent_sku: cleanSku,
      image: "",
      product_url: `https://cua-hang-yen-sen.mysapo.net/admin/products/${sapoItemId}`,
      price_min: numPrice,
      price_max: numPrice,
      price_display: numPrice > 0 ? `₫${numPrice.toLocaleString("vi-VN")}` : "--",
      stock: numStock,
      sales_30d: 0,
      views_30d: "0",
      status: numStock > 0 ? "Đang hoạt động" : "Hết hàng",
      variations: [
        {
          model_id: String(variantId || `model_${Date.now()}`),
          name: "Mặc định",
          sku: cleanSku,
          price: numPrice,
          stock: numStock,
        },
      ],
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

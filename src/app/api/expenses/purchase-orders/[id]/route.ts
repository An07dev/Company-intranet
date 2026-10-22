import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoPurchaseOrderModel, MongoShopeeProductModel } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

export const dynamic = "force-dynamic";

function getOrderFilter(idParam: string) {
  return { $or: [{ id: idParam }, { code: idParam }] };
}

/**
 * GET /api/expenses/purchase-orders/[id]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const order = await MongoPurchaseOrderModel.findOne(getOrderFilter(id)).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn nhập hàng" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { order },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi truy vấn đơn nhập hàng" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/expenses/purchase-orders/[id]
 * Cập nhật đơn nhập hàng & tự động đồng bộ tồn kho Sapo theo chênh lệch (Delta)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const body = await request.json();

    const {
      supplier_name,
      supplier_code,
      supplier_id,
      received_on,
      transaction_status,
      paid_amount,
      note,
      line_items,
    } = body;

    const existingOrder = await MongoPurchaseOrderModel.findOne(getOrderFilter(id));

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn nhập hàng để chỉnh sửa" },
        { status: 404 }
      );
    }

    // 1. Phân tích chênh lệch số lượng mặt hàng kho giữa đơn cũ và đơn mới
    const oldItems = existingOrder.line_items || [];
    const oldWarehouseQtyMap = new Map<string, { qty: number; name: string; sku: string; productId: string; variantId: string }>();

    for (const oi of oldItems) {
      const pId = oi.product_id ? String(oi.product_id) : "";
      const vId = oi.variant_id ? String(oi.variant_id) : "";
      const isWh = Boolean((pId && pId !== "0") || (vId && vId !== "0"));
      if (isWh) {
        const key = vId && vId !== "0" ? `v_${vId}` : `p_${pId}`;
        oldWarehouseQtyMap.set(key, {
          qty: Number(oi.quantity || 0),
          name: oi.name || "",
          sku: oi.sku || "",
          productId: pId,
          variantId: vId,
        });
      }
    }

    const newWarehouseQtyMap = new Map<string, { qty: number; name: string; sku: string; productId: string; variantId: string }>();
    let totalPrice = 0;
    let formattedLineItems: any[] = [];

    if (Array.isArray(line_items) && line_items.length > 0) {
      for (const ni of line_items) {
        const qty = Math.max(1, Number(ni.quantity || 1));
        const price = Math.max(0, Number(ni.price || 0));
        const lineAmount = qty * price;
        totalPrice += lineAmount;

        const pId = ni.product_id ? String(ni.product_id) : "";
        const vId = ni.variant_id ? String(ni.variant_id) : "";
        const isWh = Boolean((pId && pId !== "0") || (vId && vId !== "0"));

        if (isWh) {
          const key = vId && vId !== "0" ? `v_${vId}` : `p_${pId}`;
          const existingNew = newWarehouseQtyMap.get(key) || { qty: 0, name: ni.name || "", sku: ni.sku || "", productId: pId, variantId: vId };
          existingNew.qty += qty;
          newWarehouseQtyMap.set(key, existingNew);
        }

        formattedLineItems.push({
          product_id: isWh ? (ni.product_id || 0) : 0,
          variant_id: isWh ? (ni.variant_id || 0) : 0,
          name: (ni.name || "Sản phẩm").trim(),
          sku: (ni.sku || "").trim(),
          quantity: qty,
          price: price,
          line_amount: lineAmount,
          current_stock: ni.current_stock,
          sapo_synced: isWh,
        });
      }
    } else {
      totalPrice = existingOrder.total_price || 0;
      formattedLineItems = existingOrder.line_items || [];
    }

    // 2. Tính toán delta và đồng bộ tồn kho Sapo + MongoDB
    const allWarehouseKeys = new Set([...oldWarehouseQtyMap.keys(), ...newWarehouseQtyMap.keys()]);
    const syncResults: any[] = [];

    for (const key of allWarehouseKeys) {
      const oldInfo = oldWarehouseQtyMap.get(key);
      const newInfo = newWarehouseQtyMap.get(key);
      const oldQty = oldInfo?.qty || 0;
      const newQty = newInfo?.qty || 0;
      const delta = newQty - oldQty;

      if (delta !== 0) {
        const targetInfo = newInfo || oldInfo!;
        const targetVId = targetInfo.variantId;
        const targetPId = targetInfo.productId;
        const targetName = targetInfo.name;
        const targetSku = targetInfo.sku;

        try {
          let productDoc: any = null;
          if (targetPId && targetPId !== "0") {
            productDoc = await MongoShopeeProductModel.findOne({ item_id: targetPId });
          }
          if (!productDoc && targetVId && targetVId !== "0") {
            productDoc = await MongoShopeeProductModel.findOne({ "variations.model_id": targetVId });
          }

          if (productDoc) {
            let targetVariation: any = null;
            if (Array.isArray(productDoc.variations) && productDoc.variations.length > 0) {
              if (targetVId && targetVId !== "0") {
                targetVariation = productDoc.variations.find((v: any) => String(v.model_id) === String(targetVId));
              }
              if (!targetVariation && targetSku) {
                targetVariation = productDoc.variations.find((v: any) => String(v.sku).toLowerCase() === targetSku.toLowerCase());
              }
              if (!targetVariation) {
                targetVariation = productDoc.variations[0];
              }
            }

            if (targetVariation) {
              const prevVarStock = Number(targetVariation.stock || 0);
              const newVarStock = Math.max(0, prevVarStock + delta);
              targetVariation.stock = newVarStock;

              const newTotalStock = productDoc.variations.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
              const newStatus = newTotalStock > 0 ? "Đang hoạt động" : "Hết hàng";

              await MongoShopeeProductModel.updateOne(
                { _id: productDoc._id },
                {
                  $set: {
                    stock: newTotalStock,
                    status: newStatus,
                    variations: productDoc.variations,
                    updatedAt: new Date().toISOString(),
                  },
                }
              );

              // Cập nhật Sapo API
              let sapoSynced = false;
              let syncNote = "";
              const sapoVarId = String(targetVariation.model_id);

              try {
                await SapoService.updateVariantInventory(sapoVarId, newVarStock);
                sapoSynced = true;
                syncNote = `Đã đồng bộ Sapo (Variant: ${sapoVarId}, tồn: ${newVarStock})`;
              } catch (sapoErr: any) {
                console.error(`[Sapo Sync Error on Edit Variant ${sapoVarId}]:`, sapoErr);
                syncNote = `Lỗi Sapo: ${sapoErr?.message || "Không thể gọi API Sapo"}`;
              }

              // Ghi log kiểm kê
              await LogModel.createLog({
                level: sapoSynced ? "success" : "warn",
                type: "inventory_adjustment",
                source: "purchase_order_edit",
                shop_username: productDoc.shop_username || "sapo_omnichannel",
                message: `Chỉnh sửa đơn nhập ${existingOrder.code}: ${delta > 0 ? "Tăng" : "Giảm"} tồn "${targetName}" (${targetSku}) ${delta > 0 ? "+" : ""}${delta} cái (Tồn: ${prevVarStock} → ${newVarStock})`,
                details: {
                  purchase_order_code: existingOrder.code,
                  item_id: productDoc.item_id,
                  model_id: sapoVarId,
                  prev_stock: prevVarStock,
                  delta_qty: delta,
                  new_stock: newVarStock,
                  sapo_synced: sapoSynced,
                  sync_note: syncNote,
                },
              });

              syncResults.push({
                name: targetName,
                sku: targetSku,
                delta,
                new_stock: newVarStock,
                sapo_synced: sapoSynced,
              });
            } else {
              // Sản phẩm đơn không có variations
              const prevStock = Number(productDoc.stock || 0);
              const newStock = Math.max(0, prevStock + delta);
              const newStatus = newStock > 0 ? "Đang hoạt động" : "Hết hàng";

              await MongoShopeeProductModel.updateOne(
                { _id: productDoc._id },
                {
                  $set: {
                    stock: newStock,
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                  },
                }
              );

              let sapoSynced = false;
              const sapoId = (targetVId && targetVId !== "0") ? targetVId : targetPId;
              if (sapoId) {
                try {
                  await SapoService.updateVariantInventory(sapoId, newStock);
                  sapoSynced = true;
                } catch (sapoErr) {
                  console.error(`[Sapo Sync Error on Edit Product ${sapoId}]:`, sapoErr);
                }
              }

              syncResults.push({
                name: targetName,
                sku: targetSku,
                delta,
                new_stock: newStock,
                sapo_synced: sapoSynced,
              });
            }
          }
        } catch (itemErr) {
          console.error(`[Inventory sync error on edit item ${targetName}]:`, itemErr);
        }
      }
    }

    // Chuẩn hóa giao dịch thanh toán và số tiền đã trả
    let transactions = existingOrder.transactions || [];
    let targetPaid = 0;

    if (transaction_status === "paid") {
      targetPaid = totalPrice;
      transactions = [
        {
          id: `tx_${Date.now()}`,
          amount: totalPrice,
          payment_method_name: "Chuyển khoản",
          status: "success",
          processed_on: received_on || existingOrder.received_on,
          created_on: new Date().toISOString(),
        },
      ];
    } else if (transaction_status === "partially") {
      targetPaid = Math.min(totalPrice, Math.max(0, Number(paid_amount || 0)));
      transactions = [
        {
          id: `tx_${Date.now()}`,
          amount: targetPaid,
          payment_method_name: "Chuyển khoản",
          status: "success",
          processed_on: received_on || existingOrder.received_on,
          created_on: new Date().toISOString(),
        },
      ];
    } else {
      targetPaid = 0;
      transactions = [];
    }

    const unpaidAmount = Math.max(0, totalPrice - targetPaid);

    // Cập nhật thông tin vào document
    if (supplier_name) existingOrder.supplier_name = supplier_name.trim();
    if (supplier_code !== undefined) existingOrder.supplier_code = supplier_code;
    if (supplier_id) existingOrder.supplier_id = Number(supplier_id);
    if (received_on) existingOrder.received_on = received_on;
    if (transaction_status) existingOrder.transaction_status = transaction_status;
    existingOrder.total_price = totalPrice;
    existingOrder.subtotal_price = totalPrice;
    existingOrder.paid_amount = targetPaid;
    existingOrder.unpaid_amount = unpaidAmount;
    existingOrder.line_items = formattedLineItems;
    existingOrder.transactions = transactions;
    existingOrder.inventory_synced = existingOrder.inventory_synced || syncResults.length > 0;
    if (note !== undefined) existingOrder.note = note;
    existingOrder.updated_on = new Date().toISOString();

    await existingOrder.save();

    let msg = `Đã cập nhật đơn nhập hàng ${existingOrder.code} thành công!`;
    if (syncResults.length > 0) {
      msg += ` Đã đồng bộ chênh lệch tồn kho ${syncResults.length} sản phẩm lên Sapo.`;
    }

    return NextResponse.json({
      success: true,
      message: msg,
      data: { order: existingOrder, sync_results: syncResults },
    });
  } catch (error: any) {
    console.error("[Update Purchase Order API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi cập nhật đơn nhập hàng" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expenses/purchase-orders/[id]
 * Xóa đơn nhập hàng & tự động hoàn trừ tồn kho Sapo đối với các mặt hàng đã nhập
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const filter = getOrderFilter(id);
    const existing = await MongoPurchaseOrderModel.findOne(filter);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn nhập hàng để xóa" },
        { status: 404 }
      );
    }

    const orderCode = existing.code;

    // Hoàn tồn kho và đồng bộ Sapo trước khi xóa đơn nhập hàng
    const itemsToRollback = existing.line_items || [];
    const rollbackResults: any[] = [];

    for (const item of itemsToRollback) {
      const pId = item.product_id ? String(item.product_id) : "";
      const vId = item.variant_id ? String(item.variant_id) : "";
      const isWh = Boolean((pId && pId !== "0") || (vId && vId !== "0"));
      const qtyToRollback = Math.max(0, Number(item.quantity || 0));

      // Chỉ hoàn tồn kho với các mặt hàng đã đồng bộ từ kho Sapo
      if (isWh && qtyToRollback > 0 && (item.sapo_synced || existing.inventory_synced)) {
        try {
          let productDoc: any = null;
          if (pId && pId !== "0") {
            productDoc = await MongoShopeeProductModel.findOne({ item_id: pId });
          }
          if (!productDoc && vId && vId !== "0") {
            productDoc = await MongoShopeeProductModel.findOne({ "variations.model_id": vId });
          }

          if (productDoc) {
            let targetVariation: any = null;
            if (Array.isArray(productDoc.variations) && productDoc.variations.length > 0) {
              if (vId && vId !== "0") {
                targetVariation = productDoc.variations.find((v: any) => String(v.model_id) === String(vId));
              }
              if (!targetVariation && item.sku) {
                targetVariation = productDoc.variations.find((v: any) => String(v.sku).toLowerCase() === item.sku!.toLowerCase());
              }
              if (!targetVariation) {
                targetVariation = productDoc.variations[0];
              }
            }

            if (targetVariation) {
              const prevVarStock = Number(targetVariation.stock || 0);
              const newVarStock = Math.max(0, prevVarStock - qtyToRollback);
              targetVariation.stock = newVarStock;

              const newTotalStock = productDoc.variations.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
              const newStatus = newTotalStock > 0 ? "Đang hoạt động" : "Hết hàng";

              await MongoShopeeProductModel.updateOne(
                { _id: productDoc._id },
                {
                  $set: {
                    stock: newTotalStock,
                    status: newStatus,
                    variations: productDoc.variations,
                    updatedAt: new Date().toISOString(),
                  },
                }
              );

              // Hoàn tồn trên Sapo API
              let sapoSynced = false;
              const sapoVarId = String(targetVariation.model_id);
              try {
                await SapoService.updateVariantInventory(sapoVarId, newVarStock);
                sapoSynced = true;
              } catch (sapoErr) {
                console.error(`[Sapo Sync Error on Delete Variant ${sapoVarId}]:`, sapoErr);
              }

              await LogModel.createLog({
                level: sapoSynced ? "success" : "warn",
                type: "inventory_adjustment",
                source: "purchase_order_delete",
                shop_username: productDoc.shop_username || "sapo_omnichannel",
                message: `Xóa đơn nhập ${orderCode}: Hoàn trừ tồn kho "${item.name}" (${item.sku}) -${qtyToRollback} cái (Tồn: ${prevVarStock} → ${newVarStock})`,
                details: {
                  purchase_order_code: orderCode,
                  item_id: productDoc.item_id,
                  model_id: sapoVarId,
                  prev_stock: prevVarStock,
                  rollback_qty: qtyToRollback,
                  new_stock: newVarStock,
                  sapo_synced: sapoSynced,
                },
              });

              rollbackResults.push({
                name: item.name,
                sku: item.sku,
                rollback_qty: qtyToRollback,
                new_stock: newVarStock,
                sapo_synced: sapoSynced,
              });
            } else {
              // Sản phẩm không có biến thể riêng
              const prevStock = Number(productDoc.stock || 0);
              const newStock = Math.max(0, prevStock - qtyToRollback);
              const newStatus = newStock > 0 ? "Đang hoạt động" : "Hết hàng";

              await MongoShopeeProductModel.updateOne(
                { _id: productDoc._id },
                {
                  $set: {
                    stock: newStock,
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                  },
                }
              );

              const sapoId = (vId && vId !== "0") ? vId : pId;
              if (sapoId) {
                try {
                  await SapoService.updateVariantInventory(sapoId, newStock);
                } catch (sapoErr) {
                  console.error(`[Sapo Sync Error on Delete Product ${sapoId}]:`, sapoErr);
                }
              }

              rollbackResults.push({
                name: item.name,
                rollback_qty: qtyToRollback,
                new_stock: newStock,
              });
            }
          }
        } catch (itemErr) {
          console.error(`[Rollback error for item ${item.name}]:`, itemErr);
        }
      }
    }

    await MongoPurchaseOrderModel.deleteOne(filter);

    let msg = `Đã xóa đơn nhập hàng ${orderCode} thành công!`;
    if (rollbackResults.length > 0) {
      msg += ` Đã tự động hoàn trừ tồn kho và đồng bộ lại ${rollbackResults.length} sản phẩm lên Sapo.`;
    }

    return NextResponse.json({
      success: true,
      message: msg,
      data: { rollback_results: rollbackResults },
    });
  } catch (error: any) {
    console.error("[Delete Purchase Order API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xóa đơn nhập hàng" },
      { status: 500 }
    );
  }
}

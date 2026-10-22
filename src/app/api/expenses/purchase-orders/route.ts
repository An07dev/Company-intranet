import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import {
  MongoPurchaseOrderModel,
  MongoSapoSupplierModel,
  MongoShopeeProductModel,
} from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";
import { PurchaseOrder } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Trích xuất số tiền đã thanh toán của một đơn nhập kho
 */
function calculatePaidAmount(inv: any): number {
  if (inv.paid_amount !== undefined && inv.paid_amount > 0) {
    return Number(inv.paid_amount);
  }
  if (inv.transaction_status === "paid") {
    return Number(inv.total_price || 0);
  }
  if (inv.transactions && Array.isArray(inv.transactions) && inv.transactions.length > 0) {
    let paid = 0;
    for (const tx of inv.transactions) {
      if (tx.status === "success" || !tx.status) {
        paid += Number(tx.amount || 0);
      }
    }
    return Math.min(paid, Number(inv.total_price || 0));
  }
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "15", 10)));
    const search = (searchParams.get("search") || "").trim();
    const supplierId = searchParams.get("supplier_id")
      ? parseInt(searchParams.get("supplier_id")!, 10)
      : null;
    const transactionStatus = searchParams.get("status") || "all";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const sortBy = searchParams.get("sort_by") || "received_on_desc";

    // Xây dựng query MongoDB
    const query: any = { status: { $ne: "cancelled" } };

    if (supplierId) {
      query.supplier_id = supplierId;
    }

    if (transactionStatus && transactionStatus !== "all") {
      if (transactionStatus === "paid") {
        query.transaction_status = "paid";
      } else if (transactionStatus === "pending") {
        query.transaction_status = { $in: ["pending", "unpaid", null] };
      } else if (transactionStatus === "partially") {
        query.transaction_status = { $in: ["partially", "partial"] };
      }
    }

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.$gte = `${startDate}T00:00:00Z`;
      }
      if (endDate) {
        dateFilter.$lte = `${endDate}T23:59:59Z`;
      }
      query.received_on = dateFilter;
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { code: regex },
        { supplier_name: regex },
        { "line_items.name": regex },
        { "line_items.sku": regex },
      ];
    }

    // Sắp xếp
    let sortOptions: any = { received_on: -1, created_on: -1 };
    if (sortBy === "received_on_asc") {
      sortOptions = { received_on: 1, created_on: 1 };
    } else if (sortBy === "total_price_desc") {
      sortOptions = { total_price: -1 };
    } else if (sortBy === "total_price_asc") {
      sortOptions = { total_price: 1 };
    }

    const skip = (page - 1) * limit;

    // Thực hiện truy vấn danh sách đơn & tổng số lượng từ bảng purchase_orders
    const [rawOrders, totalRecords, allSuppliers, allActiveOrders] = await Promise.all([
      MongoPurchaseOrderModel.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      MongoPurchaseOrderModel.countDocuments(query),
      MongoSapoSupplierModel.find().select("id name code").lean(),
      MongoPurchaseOrderModel.find({ status: { $ne: "cancelled" } })
        .select("total_price paid_amount unpaid_amount transaction_status received_on created_on supplier_name supplier_id transactions line_items")
        .lean(),
    ]);

    // Chuẩn hóa danh sách đơn nhập hàng
    const orders: PurchaseOrder[] = rawOrders.map((inv: any) => {
      const totalPrice = Number(inv.total_price || 0);
      const paidAmount = calculatePaidAmount(inv);
      const unpaidAmount = Math.max(0, totalPrice - paidAmount);

      return {
        id: String(inv.id),
        code: inv.code,
        supplier_id: inv.supplier_id || 0,
        supplier_name: inv.supplier_name || "Chưa rõ",
        supplier_code: inv.supplier_code || "",
        total_price: totalPrice,
        subtotal_price: Number(inv.subtotal_price || totalPrice),
        paid_amount: paidAmount,
        unpaid_amount: unpaidAmount,
        transaction_status: inv.transaction_status || (unpaidAmount === 0 ? "paid" : "pending"),
        receipt_status: inv.receipt_status || "received",
        status: inv.status || "active",
        received_on: inv.received_on || inv.created_on || new Date().toISOString(),
        created_on: inv.created_on || new Date().toISOString(),
        line_items: (inv.line_items || []).map((li: any) => ({
          product_id: li.product_id,
          variant_id: li.variant_id,
          name: li.name || "Sản phẩm",
          sku: li.sku || "",
          quantity: Number(li.quantity || 0),
          price: Number(li.price || 0),
          line_amount: Number(li.line_amount || (li.quantity * li.price) || 0),
          current_stock: li.current_stock,
          sapo_synced: li.sapo_synced,
        })),
        transactions: (inv.transactions || []).map((tx: any) => ({
          id: String(tx.id),
          amount: Number(tx.amount || 0),
          payment_method_name: tx.payment_method_name || "Chuyển khoản",
          status: tx.status || "success",
          processed_on: tx.processed_on || tx.created_on,
          created_on: tx.created_on,
        })),
        note: inv.note || "",
        inventory_synced: Boolean(inv.inventory_synced || (inv.line_items || []).some((li: any) => li.sapo_synced)),
      };
    });

    // Thống kê tổng hợp toàn hệ thống
    let totalSpent = 0;
    let totalPaid = 0;
    let totalItemsReceived = 0;
    const supplierSpentMap = new Map<string, { total: number; count: number }>();
    const monthlyMap = new Map<string, { spent: number; paid: number; count: number }>();

    for (const ord of allActiveOrders) {
      const price = Number(ord.total_price || 0);
      const paid = calculatePaidAmount(ord);
      totalSpent += price;
      totalPaid += paid;

      if (ord.line_items && Array.isArray(ord.line_items)) {
        for (const item of ord.line_items) {
          totalItemsReceived += Number(item.quantity || 0);
        }
      }

      // Theo nhà cung cấp
      const supName = ord.supplier_name || "Khác";
      const existingSup = supplierSpentMap.get(supName) || { total: 0, count: 0 };
      existingSup.total += price;
      existingSup.count += 1;
      supplierSpentMap.set(supName, existingSup);

      // Theo tháng (YYYY-MM)
      const dateStr = ord.received_on || ord.created_on;
      if (dateStr) {
        const monthKey = dateStr.slice(0, 7);
        const existingMonth = monthlyMap.get(monthKey) || { spent: 0, paid: 0, count: 0 };
        existingMonth.spent += price;
        existingMonth.paid += paid;
        existingMonth.count += 1;
        monthlyMap.set(monthKey, existingMonth);
      }
    }

    const totalUnpaid = Math.max(0, totalSpent - totalPaid);

    // Top 5 nhà cung cấp
    const topSuppliers = Array.from(supplierSpentMap.entries())
      .map(([name, data]) => ({
        name,
        totalSpent: data.total,
        orderCount: data.count,
        percentage: totalSpent > 0 ? Math.round((data.total / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Xu hướng 6 tháng gần nhất
    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        spent: data.spent,
        paid: data.paid,
        orderCount: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total: totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
        },
        summary: {
          totalSpent,
          totalPaid,
          totalUnpaid,
          totalOrders: allActiveOrders.length,
          totalItemsReceived,
          topSuppliers,
          monthlyTrend,
        },
        suppliers: allSuppliers.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code || `SUP${s.id}`,
        })),
      },
    });
  } catch (error: any) {
    console.error("[Purchase Orders API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi truy vấn danh sách đơn nhập hàng" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses/purchase-orders
 * Tạo phiếu nhập hàng mới trực tiếp vào collection purchase_orders
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const {
      supplier_id,
      supplier_name,
      supplier_code,
      line_items,
      note,
      transaction_status,
      received_on,
      sync_inventory = true,
    } = body;

    if (!supplier_name || !supplier_name.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn hoặc nhập tên Nhà cung cấp" },
        { status: 400 }
      );
    }

    if (!Array.isArray(line_items) || line_items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Đơn nhập hàng phải có ít nhất 1 sản phẩm" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newId = `po_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const code = `PON-${datePrefix}-${Math.floor(100 + Math.random() * 900)}`;

    let totalPrice = 0;
    const formattedLineItems: any[] = [];
    const syncResults: any[] = [];

    // Xử lý từng mặt hàng: tính tiền, tăng tồn kho hệ thống và đồng bộ Sapo
    for (const li of line_items) {
      const qty = Math.max(1, Number(li.quantity || 1));
      const price = Math.max(0, Number(li.price || 0));
      const lineAmount = qty * price;
      totalPrice += lineAmount;

      let itemProductId = li.product_id ? String(li.product_id) : undefined;
      let itemVariantId = li.variant_id ? String(li.variant_id) : undefined;
      const itemSku = (li.sku || "").trim();
      const itemName = (li.name || "").trim();
      let currentStock: number | undefined = undefined;
      let sapoSynced = false;
      let syncNote = "";

      // Kiểm tra xem mặt hàng này có được chọn từ kho Sapo hay không
      const isWarehouseProduct = Boolean(
        (itemProductId && itemProductId !== "0" && itemProductId !== "undefined") ||
        (itemVariantId && itemVariantId !== "0" && itemVariantId !== "undefined")
      );

      // CHỈ đồng bộ Sapo và tăng tồn kho KHI:
      // 1. Cờ sync_inventory = true
      // 2. Mặt hàng được người dùng chọn từ sản phẩm có sẵn trong kho (isWarehouseProduct = true)
      // Các mặt hàng nhập tay tự do sẽ KHÔNG đồng bộ vào Sapo và KHÔNG thay đổi tồn kho
      if (sync_inventory && isWarehouseProduct) {
        try {
          // 1. Tìm chính xác sản phẩm trong catalog shopee_products bằng ID đã liên kết
          let productDoc: any = null;

          if (itemProductId && itemProductId !== "0") {
            productDoc = await MongoShopeeProductModel.findOne({ item_id: itemProductId });
          }
          if (!productDoc && itemVariantId && itemVariantId !== "0") {
            productDoc = await MongoShopeeProductModel.findOne({ "variations.model_id": itemVariantId });
          }

          if (productDoc) {
            itemProductId = String(productDoc.item_id);

            // Tìm biến thể phù hợp
            let targetVariation: any = null;
            if (Array.isArray(productDoc.variations) && productDoc.variations.length > 0) {
              if (itemVariantId && itemVariantId !== "0") {
                targetVariation = productDoc.variations.find(
                  (v: any) => String(v.model_id) === String(itemVariantId)
                );
              }
              if (!targetVariation && itemSku) {
                targetVariation = productDoc.variations.find(
                  (v: any) => String(v.sku).toLowerCase() === itemSku.toLowerCase()
                );
              }
              if (!targetVariation) {
                targetVariation = productDoc.variations[0];
              }
            }

            if (targetVariation) {
              itemVariantId = String(targetVariation.model_id);
              const prevVarStock = Number(targetVariation.stock || 0);
              const newVarStock = prevVarStock + qty;
              targetVariation.stock = newVarStock;

              // Tính lại tổng tồn kho sản phẩm từ tất cả biến thể
              const newTotalStock = productDoc.variations.reduce(
                (sum: number, v: any) => sum + (Number(v.stock) || 0),
                0
              );
              const newStatus = newTotalStock > 0 ? "Đang hoạt động" : "Hết hàng";

              await MongoShopeeProductModel.updateOne(
                { _id: productDoc._id },
                {
                  $set: {
                    stock: newTotalStock,
                    status: newStatus,
                    variations: productDoc.variations,
                    updatedAt: now,
                  },
                }
              );

              currentStock = newVarStock;

              // 2. Đồng bộ tồn kho lên Sapo API
              try {
                await SapoService.updateVariantInventory(itemVariantId, newVarStock);
                sapoSynced = true;
                syncNote = `Đã đồng bộ Sapo (Variant: ${itemVariantId}, tồn: ${newVarStock})`;
              } catch (sapoErr: any) {
                console.error(`[Sapo Sync Error on Variant ${itemVariantId}]:`, sapoErr);
                syncNote = `Lỗi Sapo: ${sapoErr?.message || "Không thể gọi API Sapo"}`;
              }

              // Ghi log kiểm kê / biến động tồn kho
              await LogModel.createLog({
                level: sapoSynced ? "success" : "warn",
                type: "inventory_adjustment",
                source: "purchase_order_import",
                shop_username: productDoc.shop_username || "sapo_omnichannel",
                message: `Nhập hàng đơn ${code}: Tăng tồn kho "${itemName}" (${itemSku || targetVariation.sku}) thêm +${qty} cái (Tồn: ${prevVarStock} → ${newVarStock})`,
                details: {
                  purchase_order_code: code,
                  item_id: productDoc.item_id,
                  model_id: itemVariantId,
                  prev_stock: prevVarStock,
                  added_qty: qty,
                  new_stock: newVarStock,
                  sapo_synced: sapoSynced,
                  sync_note: syncNote,
                },
              });

              syncResults.push({
                name: itemName,
                sku: itemSku || targetVariation.sku,
                added: qty,
                new_stock: newVarStock,
                sapo_synced: sapoSynced,
                sync_note: syncNote,
              });
            } else {
              // Sản phẩm không có variations riêng
              const prevStock = Number(productDoc.stock || 0);
              const newStock = prevStock + qty;
              const newStatus = newStock > 0 ? "Đang hoạt động" : "Hết hàng";

              await MongoShopeeProductModel.updateOne(
                { _id: productDoc._id },
                {
                  $set: {
                    stock: newStock,
                    status: newStatus,
                    updatedAt: now,
                  },
                }
              );

              currentStock = newStock;
              const targetSapoId = (itemVariantId && itemVariantId !== "0") ? itemVariantId : itemProductId;

              if (targetSapoId) {
                try {
                  await SapoService.updateVariantInventory(targetSapoId, newStock);
                  sapoSynced = true;
                  syncNote = `Đã đồng bộ Sapo (ID: ${targetSapoId}, tồn: ${newStock})`;
                } catch (sapoErr: any) {
                  console.error(`[Sapo Sync Error on ID ${targetSapoId}]:`, sapoErr);
                  syncNote = `Lỗi Sapo: ${sapoErr?.message || "Không thể gọi API Sapo"}`;
                }
              }

              await LogModel.createLog({
                level: sapoSynced ? "success" : "warn",
                type: "inventory_adjustment",
                source: "purchase_order_import",
                shop_username: productDoc.shop_username || "sapo_omnichannel",
                message: `Nhập hàng đơn ${code}: Tăng tồn kho "${itemName}" thêm +${qty} cái (Tồn: ${prevStock} → ${newStock})`,
                details: {
                  purchase_order_code: code,
                  item_id: productDoc.item_id,
                  prev_stock: prevStock,
                  added_qty: qty,
                  new_stock: newStock,
                  sapo_synced: sapoSynced,
                  sync_note: syncNote,
                },
              });

              syncResults.push({
                name: itemName,
                sku: itemSku,
                added: qty,
                new_stock: newStock,
                sapo_synced: sapoSynced,
                sync_note: syncNote,
              });
            }
          }
        } catch (err: any) {
          console.error(`[Inventory update error for item ${itemName}]:`, err);
        }
      }

      formattedLineItems.push({
        product_id: itemProductId || 0,
        variant_id: itemVariantId || 0,
        name: itemName,
        sku: itemSku,
        quantity: qty,
        price: price,
        line_amount: lineAmount,
        current_stock: currentStock,
        sapo_synced: sapoSynced,
      });
    }

    const isPaid = transaction_status === "paid";
    const paidAmount = isPaid ? totalPrice : 0;
    const unpaidAmount = isPaid ? 0 : totalPrice;

    const newOrder = await MongoPurchaseOrderModel.create({
      id: newId,
      code,
      supplier_id: supplier_id ? Number(supplier_id) : undefined,
      supplier_name: supplier_name.trim(),
      supplier_code: supplier_code || "",
      total_price: totalPrice,
      subtotal_price: totalPrice,
      paid_amount: paidAmount,
      unpaid_amount: unpaidAmount,
      transaction_status: transaction_status || "pending",
      receipt_status: "received",
      status: "active",
      received_on: received_on || now,
      created_on: now,
      line_items: formattedLineItems,
      transactions: isPaid
        ? [
            {
              id: `tx_${Date.now()}`,
              amount: totalPrice,
              payment_method_name: "Chuyển khoản",
              status: "success",
              processed_on: now,
              created_on: now,
            },
          ]
        : [],
      note: note || "",
      inventory_synced: syncResults.length > 0 && syncResults.some((s) => s.sapo_synced),
    });

    const syncedCount = syncResults.filter((s) => s.sapo_synced).length;
    let successMessage = `Đã tạo đơn nhập hàng ${code} thành công!`;
    if (sync_inventory && syncResults.length > 0) {
      successMessage += ` Đã tăng tồn kho và đồng bộ ${syncedCount}/${syncResults.length} sản phẩm lên Sapo.`;
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        order: newOrder,
        sync_results: syncResults,
      },
    });
  } catch (error: any) {
    console.error("[Create Purchase Order API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi tạo đơn nhập hàng mới" },
      { status: 500 }
    );
  }
}

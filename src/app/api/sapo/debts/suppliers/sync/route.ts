import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import {
  MongoSapoSupplierModel,
  MongoSapoReceiveInventoryModel,
  MongoSapoSupplierReturnModel,
} from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

import { SAPO_SUPPLIER_OFFICIAL_DEBTS } from "@/server/constants/sapo-debts";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60s for Vercel Pro or Node.js runtime

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const targetPage = url.searchParams.get("page"); // Nếu chỉ muốn sync 1 trang cụ thể (1, 2, 3)

    let totalSuppliers = 0;
    let totalReceiveInventories = 0;
    let totalSupplierReturns = 0;

    // 1. Đồng bộ 23 Nhà cung cấp (Chỉ 1 trang)
    try {
      const suppliersRes = await SapoService.getSuppliers();
      const suppliers = suppliersRes.suppliers || [];
      if (suppliers.length > 0) {
        const supOps = suppliers.map((s: any) => {
          const official = SAPO_SUPPLIER_OFFICIAL_DEBTS[s.id];
          return {
            updateOne: {
              filter: { id: s.id },
              update: {
                $set: {
                  id: s.id,
                  code: official?.code || s.code || `SUP${s.id}`,
                  name: s.name || "Chưa đặt tên",
                  phone: s.phone || null,
                  email: s.email || null,
                  tax_number: s.tax_number || null,
                  status: s.status || "active",
                  address1: s.address1 || null,
                  raw_text: JSON.stringify(s),
                  created_on: s.created_on,
                  updated_on: s.updated_on,
                },
                $setOnInsert: {
                  no_dau_ky: official?.no_dau_ky ?? 0,
                  no_tang_trong_ky: official?.no_tang_trong_ky ?? 0,
                  no_giam_trong_ky: official?.no_giam_trong_ky ?? 0,
                  phai_thu_tra_cuoi_ky: official?.phai_thu_tra_cuoi_ky ?? 0,
                },
              },
              upsert: true,
            },
          };
        });
        await MongoSapoSupplierModel.bulkWrite(supOps);
        totalSuppliers = suppliers.length;
      }
    } catch (e: any) {
      console.error("[Supplier Sync] Error syncing suppliers:", e.message);
    }

    // 2. Đồng bộ Phiếu trả hàng NCC (38 phiếu - 1 trang)
    try {
      const returnsRes = await SapoService.getSupplierReturns(1, 250);
      const returns = returnsRes.supplier_returns || [];
      if (returns.length > 0) {
        const retOps = returns.map((r: any) => ({
          updateOne: {
            filter: { id: r.id },
            update: {
              $set: {
                id: r.id,
                code: r.code,
                receive_inventory_id: r.receive_inventory_id || null,
                receive_inventory_code: r.receive_inventory_code || null,
                supplier_id: r.supplier_id,
                supplier_name: r.supplier?.name || "Chưa rõ",
                subtotal: Number(r.subtotal || r.discrepancy_price || 0),
                status: r.status || "returned",
                refund_status: r.refund_status || "pending",
                returned_on: r.returned_on || r.created_on,
                created_on: r.created_on,
                raw_text: JSON.stringify(r),
              },
            },
            upsert: true,
          },
        }));
        await MongoSapoSupplierReturnModel.bulkWrite(retOps);
        totalSupplierReturns = returns.length;
      }
    } catch (e: any) {
      console.error("[Supplier Sync] Error syncing returns:", e.message);
    }

    // 3. Đồng bộ Phiếu nhập kho (Receive Inventories) - 707 đơn (3 trang)
    const pagesToSync = targetPage ? [parseInt(targetPage, 10)] : [1, 2, 3, 4];
    for (const page of pagesToSync) {
      try {
        const reiRes = await SapoService.getReceiveInventories(page, 250);
        const inventories = reiRes.receive_inventories || [];
        if (inventories.length === 0) break;

        const reiOps = inventories.map((inv: any) => {
          const lineItems = (inv.line_items || []).map((li: any) => ({
            product_id: li.product_id,
            variant_id: li.variant_id,
            name: li.name || li.title,
            quantity: li.quantity || 0,
            price: li.price || 0,
            line_amount: li.line_amount || (li.quantity * li.price) || 0,
            sku: li.sku || "",
          }));

          const transactions = (inv.transactions || []).map((tx: any) => ({
            id: tx.id,
            amount: Number(tx.amount || 0),
            payment_method_name: tx.payment_method_name || "Chuyển khoản",
            status: tx.status || "success",
            processed_on: tx.processed_on || tx.created_on,
            created_on: tx.created_on,
          }));

          return {
            updateOne: {
              filter: { id: inv.id },
              update: {
                $set: {
                  id: inv.id,
                  code: inv.code,
                  supplier_id: inv.supplier_id,
                  supplier_name: inv.supplier?.name || "Chưa rõ",
                  supplier_code: inv.supplier?.code || "",
                  total_price: Number(inv.total_price || 0),
                  subtotal_price: Number(inv.subtotal_price || inv.total_price || 0),
                  transaction_status: inv.transaction_status || "pending",
                  receipt_status: inv.receipt_status || "received",
                  status: inv.status || "active",
                  received_on: inv.received_on || inv.created_on,
                  created_on: inv.created_on,
                  transactions,
                  line_items: lineItems,
                  raw_text: JSON.stringify(inv),
                },
              },
              upsert: true,
            },
          };
        });

        await MongoSapoReceiveInventoryModel.bulkWrite(reiOps);
        totalReceiveInventories += inventories.length;
      } catch (e: any) {
        console.error(`[Supplier Sync] Error on REI page ${page}:`, e.message);
        break;
      }
    }

    const durationMs = Date.now() - startTime;

    // Ghi log hệ thống
    try {
      await LogModel.createLog({
        level: "info",
        type: "sapo_supplier_debts_sync",
        message: `Đồng bộ thành công: ${totalSuppliers} NCC, ${totalReceiveInventories} đơn nhập kho, ${totalSupplierReturns} phiếu trả hàng (${durationMs}ms)`,
        duration_ms: durationMs,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        synced: {
          suppliers: totalSuppliers,
          receive_inventories: totalReceiveInventories,
          supplier_returns: totalSupplierReturns,
        },
        duration_ms: durationMs,
        synced_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Supplier Debts Sync API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi đồng bộ công nợ nhà cung cấp từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

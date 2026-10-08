import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoSapoSupplierModel } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/sapo/suppliers/sync
 * Đồng bộ toàn bộ danh sách nhà cung cấp trực tiếp từ Sapo Omnichannel về cơ sở dữ liệu nội bộ
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    await connectToDatabase();

    // 1. Kéo toàn bộ danh sách nhà cung cấp trực tiếp từ Sapo API
    const data = await SapoService.getSuppliers();
    const suppliers = data.suppliers || [];

    // 2. Upsert vào MongoDB để lưu cache và đối soát
    if (suppliers.length > 0) {
      const ops = suppliers.map((s: any) => ({
        updateOne: {
          filter: { id: s.id },
          update: {
            $set: {
              id: s.id,
              code: s.code || `SUP${s.id}`,
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
          },
          upsert: true,
        },
      }));

      await MongoSapoSupplierModel.bulkWrite(ops);
    }

    const durationMs = Date.now() - startTime;

    // 3. Ghi log hệ thống
    try {
      await LogModel.createLog({
        level: "success",
        type: "supplier_sync",
        source: "sapo_suppliers_sync",
        shop_username: "sapo_omnichannel",
        message: `Đã đồng bộ thành công ${suppliers.length} nhà cung cấp từ Sapo Omnichannel (${durationMs}ms)`,
        details: {
          total: suppliers.length,
          duration_ms: durationMs,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ thành công ${suppliers.length} nhà cung cấp từ Sapo Omnichannel!`,
      data: {
        total: suppliers.length,
        suppliers,
        duration_ms: durationMs,
        synced_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Sapo Suppliers Sync API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi đồng bộ danh sách nhà cung cấp từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

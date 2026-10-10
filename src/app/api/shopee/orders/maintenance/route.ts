import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel } from "@/server/db/schema";
import { LogModel } from "@/server/models/log.model";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/shopee/orders/maintenance
 * Tự động tạo Index tối ưu hóa truy vấn và dọn dẹp triệt để các đơn hàng bị đúp chéo
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const startTime = Date.now();

    // 1. Tạo Index trên trường createdAt và order_sn nếu chưa có
    try {
      await MongoShopeeOrderModel.collection.createIndex({ createdAt: -1 });
      await MongoShopeeOrderModel.collection.createIndex({ order_sn: 1 }, { unique: true });
    } catch (idxErr: any) {
      console.warn("[Maintenance Index Warning]:", idxErr.message);
    }

    // 2. Quét nhanh toàn bộ đơn hàng (chỉ lấy order_sn và raw_text để tiết kiệm bộ nhớ)
    const allDocs = await MongoShopeeOrderModel.find({}, { order_sn: 1, raw_text: 1, createdAt: 1 })
      .lean();

    const bySapoId = new Map<string, Array<{ order_sn: string; createdAt?: string }>>();

    for (const doc of allDocs) {
      let sapoId: string | null = null;
      if (doc.raw_text) {
        try {
          const raw = JSON.parse(doc.raw_text);
          if (raw.id) sapoId = String(raw.id);
        } catch {}
      }
      if (sapoId) {
        if (!bySapoId.has(sapoId)) bySapoId.set(sapoId, []);
        bySapoId.get(sapoId)!.push({
          order_sn: doc.order_sn,
          createdAt: doc.createdAt,
        });
      }
    }

    // 3. Lọc ra các mã đơn thừa cần xóa (ưu tiên giữ lại mã sàn Shopee 14 ký tự)
    const redundantSns: string[] = [];
    for (const [, list] of bySapoId.entries()) {
      if (list.length > 1) {
        // Tìm bản ghi có mã 5 chữ số của Sapo (ví dụ: '15807')
        const shortRecord = list.find((x) => /^\d{1,6}$/.test(x.order_sn));
        const marketRecord = list.find((x) => /^[0-9]{6}[A-Z0-9]+$/i.test(x.order_sn));

        if (shortRecord && marketRecord) {
          redundantSns.push(shortRecord.order_sn);
        } else if (list.length === 2) {
          // Nếu cả 2 đều là mã số hoặc có dấu #, xóa bản ghi cũ hơn
          const older = (list[0].createdAt || "") < (list[1].createdAt || "") ? list[0] : list[1];
          redundantSns.push(older.order_sn);
        }
      }
    }

    let deletedCount = 0;
    if (redundantSns.length > 0) {
      const delRes = await MongoShopeeOrderModel.deleteMany({
        order_sn: { $in: redundantSns },
      });
      deletedCount = delRes.deletedCount || 0;
    }

    const remainingTotal = await MongoShopeeOrderModel.countDocuments();
    const durationMs = Date.now() - startTime;

    await LogModel.createLog({
      level: "warn",
      type: "order_maintenance",
      source: "orders_maintenance_api",
      shop_username: "system",
      message: `[Maintenance] Đã dọn dẹp ${deletedCount} bản ghi đúp thừa. Tổng đơn hiện tại: ${remainingTotal} (${durationMs}ms)`,
      details: { deletedCount, remainingTotal, redundantSnsSample: redundantSns.slice(0, 20) },
    });

    return NextResponse.json({
      success: true,
      message: `Đã dọn dẹp thành công ${deletedCount} đơn hàng đúp thừa và tối ưu hóa Index!`,
      data: {
        deletedCount,
        remainingTotal,
        redundantSnsCount: redundantSns.length,
        durationMs,
      },
    });
  } catch (error: any) {
    console.error("[Maintenance Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

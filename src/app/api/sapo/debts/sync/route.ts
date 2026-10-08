import { NextRequest, NextResponse } from "next/server";
import { POST as syncOrdersHandler } from "@/app/api/sapo/sync-orders/route";

export const dynamic = "force-dynamic";

/**
 * POST /api/sapo/debts/sync
 * Đồng bộ danh sách đơn hàng và công nợ khách hàng từ Sapo Omnichannel
 */
export async function POST(request: NextRequest) {
  try {
    return await syncOrdersHandler(request);
  } catch (error: any) {
    console.error("[Customer Debt Sync Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi đồng bộ công nợ khách hàng từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { SapoService } from "@/server/services/sapo.service";

export async function GET(request: NextRequest) {
  try {
    const data = await SapoService.getSuppliers();
    const suppliers = data.suppliers || [];

    const activeCount = suppliers.filter((s) => s.status === "active").length;
    const withPhoneCount = suppliers.filter((s) => !!s.phone).length;

    return NextResponse.json({
      success: true,
      data: {
        suppliers,
        stats: {
          total: suppliers.length,
          active: activeCount,
          withPhone: withPhoneCount,
        },
      },
    });
  } catch (error: any) {
    console.error("[Sapo Suppliers API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Không thể lấy danh sách nhà cung cấp từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

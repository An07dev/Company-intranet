import { NextRequest, NextResponse } from "next/server";
import { SapoService } from "@/server/services/sapo.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const query = searchParams.get("query") || "";

    const [data, total] = await Promise.all([
      SapoService.getCustomers({ page, limit, query }),
      SapoService.getCustomersCount(query),
    ]);

    const customers = data.customers || [];

    // Tính toán thống kê nhanh
    const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const totalOrders = customers.reduce((sum, c) => sum + (c.orders_count || 0), 0);
    const vipCount = customers.filter((c) => (c.total_spent || 0) >= 1000000).length;

    return NextResponse.json({
      success: true,
      data: {
        customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
        stats: {
          pageTotalSpent: totalSpent,
          pageTotalOrders: totalOrders,
          vipCount,
          totalCustomers: total,
        },
      },
    });
  } catch (error: any) {
    console.error("[Sapo Customers API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Không thể lấy danh sách khách hàng từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

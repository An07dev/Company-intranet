import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoSapoCustomerModel } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";
import { CustomerModel } from "@/server/models/customer.model";
import { invalidateCRMStatsCache } from "@/app/api/dashboard/crm-stats/route";

export const maxDuration = 60;

let lastAutoCheckTimestamp = 0;

/**
 * Hàm đồng bộ toàn bộ danh bạ khách hàng từ Sapo Omnichannel về MongoDB
 */
async function syncCustomersFromSapo(): Promise<{ total: number; inserted: number; updated: number }> {
  await connectToDatabase();

  let page = 1;
  let allCustomers: any[] = [];

  while (true) {
    const data = await SapoService.getCustomers({ page, limit: 250 });
    const list = data.customers || [];
    allCustomers.push(...list);
    if (list.length < 250) break;
    page++;
    // Giới hạn an toàn tối đa 40 trang (10.000 khách)
    if (page > 40) break;
  }

  if (allCustomers.length === 0) {
    return { total: 0, inserted: 0, updated: 0 };
  }

  const res = await CustomerModel.upsertCustomers(allCustomers);
  invalidateCRMStatsCache();

  await LogModel.createLog({
    level: "info",
    type: "customer_sync",
    source: "sapo_customers_sync",
    shop_username: "sapo_omnichannel",
    message: `Đã đồng bộ ${allCustomers.length} khách hàng từ Sapo Omnichannel (Mới: ${res.inserted}, Cập nhật: ${res.updated})`,
    details: { total: allCustomers.length, upserted: res.inserted, modified: res.updated },
  });

  return {
    total: allCustomers.length,
    inserted: res.inserted,
    updated: res.updated,
  };
}

/**
 * GET /api/sapo/customers
 * Lấy danh sách khách hàng có phân trang, tìm kiếm và sắp xếp KHÁCH MỚI NHẤT LÊN ĐẦU
 * Tự động đồng bộ khách hàng mới từ Sapo mà không cần bấm nút
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const query = (searchParams.get("query") || "").trim();
    const shouldRefresh = searchParams.get("refresh") === "true";
    const nowMs = Date.now();

    // 1. Nếu cơ sở dữ liệu chưa có khách hàng nào, tự động đồng bộ lần đầu
    const existingCount = await MongoSapoCustomerModel.countDocuments();
    if (existingCount === 0) {
      await syncCustomersFromSapo();
    } else if (page === 1 && !query) {
      // 2. Tự động kiểm tra và đồng bộ khách hàng mới nhất nếu có cờ refresh hoặc sau mỗi 2 phút
      if (shouldRefresh || nowMs - lastAutoCheckTimestamp > 120_000) {
        lastAutoCheckTimestamp = nowMs;
        try {
          const sapoCount = await SapoService.getCustomersCount();
          if (sapoCount > existingCount || shouldRefresh) {
            const pullLimit = Math.min(100, Math.max(30, sapoCount - existingCount + 10));
            await CustomerModel.syncRecentCustomers(pullLimit);
            invalidateCRMStatsCache();
          }
        } catch (e: any) {
          console.warn("[Auto-Sync Customers Background Warning]:", e.message);
        }
      }
    }

    // Xây dựng bộ lọc tìm kiếm
    const filter: Record<string, any> = {};
    if (query) {
      const orConditions: any[] = [
        { name: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { "default_address.address1": { $regex: query, $options: "i" } },
        { "default_address.city": { $regex: query, $options: "i" } },
      ];
      if (/^\d+$/.test(query)) {
        orConditions.push({ id: Number(query) });
      }
      filter.$or = orConditions;
    }

    const skip = (page - 1) * limit;

    // Sắp xếp: Khách hàng mới nhất lên đầu ({ created_on: -1, id: -1 })
    const [customers, totalFiltered, totalAll, statsAgg] = await Promise.all([
      MongoSapoCustomerModel.find(filter)
        .sort({ created_on: -1, id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MongoSapoCustomerModel.countDocuments(filter),
      MongoSapoCustomerModel.countDocuments(),
      MongoSapoCustomerModel.aggregate([
        {
          $group: {
            _id: null,
            totalSpent: { $sum: "$total_spent" },
            totalOrders: { $sum: "$orders_count" },
            vipCount: {
              $sum: {
                $cond: [{ $gte: ["$total_spent", 1000000] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const pageTotalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const pageTotalOrders = customers.reduce((sum, c) => sum + (c.orders_count || 0), 0);
    const globalStats = statsAgg[0] || { totalSpent: 0, totalOrders: 0, vipCount: 0 };

    return NextResponse.json({
      success: true,
      data: {
        customers,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / limit) || 1,
        },
        stats: {
          pageTotalSpent,
          pageTotalOrders,
          vipCount: globalStats.vipCount,
          totalCustomers: totalAll,
        },
      },
    });
  } catch (error: any) {
    console.error("[Sapo Customers API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Không thể lấy danh sách khách hàng",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sapo/customers
 * Kích hoạt đồng bộ thủ công danh bạ khách hàng từ Sapo Omnichannel
 */
export async function POST() {
  try {
    const result = await syncCustomersFromSapo();
    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ thành công ${result.total} khách hàng từ Sapo Omnichannel!`,
      data: result,
    });
  } catch (error: any) {
    console.error("[Sapo Customers Sync Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi đồng bộ khách hàng từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

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

    // Xây dựng bộ lọc tìm kiếm & phân nhóm
    const group = (searchParams.get("group") || "").trim();
    const andConditions: any[] = [];

    if (group && group !== "all") {
      if (group === "unassigned") {
        andConditions.push({
          $or: [
            { customer_group: null },
            { customer_group: "" },
            { customer_group: { $exists: false } },
          ],
        });
      } else {
        andConditions.push({ customer_group: group });
      }
    }

    if (query) {
      const orConditions: any[] = [
        { name: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { custom_id: { $regex: query, $options: "i" } },
        { customer_group: { $regex: query, $options: "i" } },
        { "default_address.address1": { $regex: query, $options: "i" } },
        { "default_address.city": { $regex: query, $options: "i" } },
      ];
      if (/^\d+$/.test(query)) {
        orConditions.push({ id: Number(query) });
      }
      andConditions.push({ $or: orConditions });
    }

    const filter: Record<string, any> = andConditions.length > 0 ? { $and: andConditions } : {};
    const skip = (page - 1) * limit;

    // Sắp xếp: Khách hàng mới nhất lên đầu ({ created_on: -1, id: -1 })
    const [customers, totalFiltered, totalAll, statsAgg, groupAgg] = await Promise.all([
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
      MongoSapoCustomerModel.aggregate([
        {
          $group: {
            _id: "$customer_group",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const pageTotalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const pageTotalOrders = customers.reduce((sum, c) => sum + (c.orders_count || 0), 0);
    const globalStats = statsAgg[0] || { totalSpent: 0, totalOrders: 0, vipCount: 0 };

    const groupCounts: Record<string, number> = {};
    let unassignedGroupCount = 0;
    groupAgg.forEach((g) => {
      if (!g._id) {
        unassignedGroupCount += g.count;
      } else {
        groupCounts[g._id] = g.count;
      }
    });
    groupCounts["unassigned"] = unassignedGroupCount;

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
          groupCounts,
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
 * PATCH /api/sapo/customers
 * Cập nhật mã định danh riêng (custom_id) và nhóm khách hàng (customer_group)
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, custom_id, customer_group } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID khách hàng" },
        { status: 400 }
      );
    }

    const cleanCustomId =
      custom_id && typeof custom_id === "string" ? custom_id.trim().toUpperCase() : null;
    const cleanCustomerGroup =
      customer_group && typeof customer_group === "string" ? customer_group.trim() : null;

    // Kiểm tra trùng custom_id nếu có nhập mã
    if (cleanCustomId) {
      const existing = await MongoSapoCustomerModel.findOne({
        id: { $ne: Number(id) },
        custom_id: cleanCustomId,
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            message: `Mã khách hàng "${cleanCustomId}" đã được dùng cho "${existing.name}" (ID #${existing.id}). Vui lòng chọn mã khác.`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await CustomerModel.updateCustomCode(Number(id), {
      custom_id: cleanCustomId,
      customer_group: cleanCustomerGroup,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khách hàng này trong hệ thống" },
        { status: 404 }
      );
    }

    invalidateCRMStatsCache();

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật mã nội bộ [${cleanCustomId || "Chưa có"}] & nhóm cho ${updated.name}`,
      data: updated,
    });
  } catch (error: any) {
    console.error("[Sapo Customers PATCH Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi cập nhật mã khách hàng nội bộ",
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

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoLoyalCustomerModel, LoyalCustomerTier } from "@/server/db/schema";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const query = (searchParams.get("query") || "").trim();
    const tier = (searchParams.get("tier") || "all").trim();
    const type = (searchParams.get("type") || "").trim();

    // Lấy tất cả IDs nếu chỉ cần tra cứu nhanh
    if (type === "ids") {
      const allLoyal = await MongoLoyalCustomerModel.find({}, { sapo_customer_id: 1, tier: 1, discount_percent: 1 }).lean();
      return NextResponse.json({
        success: true,
        data: {
          loyalCustomerMap: allLoyal.reduce((acc: Record<number, any>, curr) => {
            acc[curr.sapo_customer_id] = {
              tier: curr.tier,
              discount_percent: curr.discount_percent,
            };
            return acc;
          }, {}),
          allLoyalCustomerIds: allLoyal.map((c) => c.sapo_customer_id),
          totalLoyal: allLoyal.length,
        },
      });
    }

    // Xây dựng bộ lọc MongoDB
    const filter: Record<string, any> = {};

    if (query) {
      const orConditions: any[] = [
        { name: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
      if (/^\d+$/.test(query)) {
        orConditions.push({ sapo_customer_id: Number(query) });
      }
      filter.$or = orConditions;
    }

    if (tier && tier !== "all") {
      filter.tier = tier;
    }

    const skip = (page - 1) * limit;

    const [customers, totalFiltered, allLoyalForStats] = await Promise.all([
      MongoLoyalCustomerModel.find(filter)
        .sort({ updated_at: -1, total_spent: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MongoLoyalCustomerModel.countDocuments(filter),
      MongoLoyalCustomerModel.find({}, { sapo_customer_id: 1, tier: 1, total_spent: 1, orders_count: 1 }).lean(),
    ]);

    // Thống kê toàn bộ nhóm thân thiết
    const totalLoyal = allLoyalForStats.length;
    const totalSpent = allLoyalForStats.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const totalOrders = allLoyalForStats.reduce((sum, c) => sum + (c.orders_count || 0), 0);

    const tierCounts = {
      standard: 0,
      silver: 0,
      gold: 0,
      diamond: 0,
    };

    allLoyalForStats.forEach((c) => {
      const t = (c.tier as LoyalCustomerTier) || "standard";
      if (tierCounts[t] !== undefined) {
        tierCounts[t]++;
      }
    });

    const allLoyalCustomerIds = allLoyalForStats.map((c) => c.sapo_customer_id);

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
          totalLoyal,
          totalSpent,
          totalOrders,
          tierCounts,
        },
        allLoyalCustomerIds,
      },
    });
  } catch (error: any) {
    console.error("[Loyal Customers API GET Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Không thể lấy danh sách khách hàng thân thiết",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      sapo_customer_id,
      name,
      phone,
      email,
      address,
      tier = "standard",
      discount_percent = 0,
      notes = "",
      total_spent = 0,
      orders_count = 0,
      last_order_name = "",
      added_by = "Hệ thống",
    } = body;

    if (!sapo_customer_id || !name) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu thông tin khách hàng (sapo_customer_id hoặc tên)",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Tìm xem khách đã có trong nhóm chưa
    const existing = await MongoLoyalCustomerModel.findOne({ sapo_customer_id: Number(sapo_customer_id) });

    if (existing) {
      // Cập nhật thông tin và hạng mới
      existing.name = name;
      if (phone) existing.phone = phone;
      if (email) existing.email = email;
      if (address) existing.address = address;
      existing.tier = tier;
      existing.discount_percent = Number(discount_percent) || 0;
      if (notes !== undefined) existing.notes = notes;
      existing.total_spent = Number(total_spent) || existing.total_spent;
      existing.orders_count = Number(orders_count) || existing.orders_count;
      if (last_order_name) existing.last_order_name = last_order_name;
      existing.updated_at = now;
      await existing.save();

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật thông tin khách hàng thân thiết: ${name}`,
        data: existing,
      });
    }

    const newLoyal = await MongoLoyalCustomerModel.create({
      id: crypto.randomUUID(),
      sapo_customer_id: Number(sapo_customer_id),
      name,
      phone: phone || "",
      email: email || "",
      address: address || "",
      tier,
      discount_percent: Number(discount_percent) || 0,
      notes: notes || "",
      total_spent: Number(total_spent) || 0,
      orders_count: Number(orders_count) || 0,
      last_order_name: last_order_name || "",
      created_at: now,
      updated_at: now,
      added_by,
    });

    return NextResponse.json({
      success: true,
      message: `Đã thêm ${name} vào danh sách khách hàng thân thiết`,
      data: newLoyal,
    });
  } catch (error: any) {
    console.error("[Loyal Customers API POST Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Không thể thêm khách hàng vào nhóm thân thiết",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { sapo_customer_id, tier, discount_percent, notes } = body;

    if (!sapo_customer_id) {
      return NextResponse.json(
        { success: false, message: "Thiếu sapo_customer_id cần cập nhật" },
        { status: 400 }
      );
    }

    const customer = await MongoLoyalCustomerModel.findOne({ sapo_customer_id: Number(sapo_customer_id) });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khách hàng thân thiết này" },
        { status: 404 }
      );
    }

    if (tier) customer.tier = tier;
    if (discount_percent !== undefined) customer.discount_percent = Number(discount_percent);
    if (notes !== undefined) customer.notes = notes;
    customer.updated_at = new Date().toISOString();

    await customer.save();

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thông tin ưu đãi cho khách hàng ${customer.name}`,
      data: customer,
    });
  } catch (error: any) {
    console.error("[Loyal Customers API PUT Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Không thể cập nhật thông tin khách hàng thân thiết",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const sapoCustomerId = searchParams.get("sapo_customer_id");
    const id = searchParams.get("id");

    if (!sapoCustomerId && !id) {
      return NextResponse.json(
        { success: false, message: "Thiếu sapo_customer_id hoặc id cần xóa" },
        { status: 400 }
      );
    }

    const query = sapoCustomerId
      ? { sapo_customer_id: Number(sapoCustomerId) }
      : { id };

    const deleted = await MongoLoyalCustomerModel.findOneAndDelete(query);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khách hàng để xóa" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa khách hàng ${deleted.name} khỏi nhóm thân thiết`,
    });
  } catch (error: any) {
    console.error("[Loyal Customers API DELETE Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Không thể xóa khách hàng khỏi nhóm thân thiết",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

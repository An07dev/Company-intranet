import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel, IShopeeOrderDocument } from "@/server/db/schema";
import { ShopeeOrder } from "@/types";

export function toSafeOrder(doc: IShopeeOrderDocument): ShopeeOrder {
  return {
    id: doc.id,
    order_sn: doc.order_sn,
    shop_username: doc.shop_username,
    buyer_username: doc.buyer_username,
    total_amount: doc.total_amount,
    payment_method: doc.payment_method,
    order_status: doc.order_status,
    status_description: doc.status_description,
    shipping_carrier: doc.shipping_carrier,
    tracking_number: doc.tracking_number,
    items: doc.items || [],
    raw_text: doc.raw_text,
    synced_at: doc.synced_at,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function deduplicateItems(items: any[]): any[] {
  if (!items || !Array.isArray(items)) return [];
  const unique: any[] = [];
  for (const item of items) {
    const isDup = unique.some(
      u => u.product_name === item.product_name && (u.variation || '') === (item.variation || '')
    );
    if (!isDup) {
      unique.push(item);
    }
  }
  return unique;
}

export class OrderModel {
  /**
   * Lưu hoặc cập nhật hàng loạt đơn hàng từ Shopee (chống trùng lặp theo order_sn)
   */
  static async upsertOrders(orders: ShopeeOrder[], shopUsername = "baobiyensen") {
    await connectToDatabase();

    const now = new Date().toISOString();
    let insertedCount = 0;
    let updatedCount = 0;

    for (const order of orders) {
      if (!order.order_sn) continue;

      const targetShop = order.shop_username || shopUsername || "baobiyensen";
      const cleanItems = deduplicateItems(order.items || []);
      const existing = await MongoShopeeOrderModel.findOne({ order_sn: order.order_sn });

      if (existing) {
        // Cập nhật đơn cũ nếu trạng thái hoặc thông tin thay đổi
        existing.shop_username = targetShop;
        existing.order_status = order.order_status || existing.order_status;
        existing.status_description = order.status_description || existing.status_description;
        existing.buyer_username = order.buyer_username || existing.buyer_username;
        existing.total_amount = order.total_amount || existing.total_amount;
        existing.shipping_carrier = order.shipping_carrier || existing.shipping_carrier;
        existing.tracking_number = order.tracking_number || existing.tracking_number;
        existing.payment_method = order.payment_method || existing.payment_method;
        if (cleanItems.length > 0) {
          existing.items = cleanItems;
        }
        existing.synced_at = now;
        existing.updatedAt = now;
        await existing.save();
        updatedCount++;
      } else {
        // Tạo đơn mới
        await MongoShopeeOrderModel.create({
          id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          order_sn: order.order_sn,
          shop_username: targetShop,
          buyer_username: order.buyer_username || "Khách Shopee",
          total_amount: order.total_amount || 0,
          payment_method: order.payment_method || "Chưa rõ",
          order_status: order.order_status || "Chờ xử lý",
          status_description: order.status_description || "",
          shipping_carrier: order.shipping_carrier || "",
          tracking_number: order.tracking_number || "",
          items: cleanItems,
          raw_text: order.raw_text || "",
          synced_at: now,
          createdAt: now,
          updatedAt: now,
        });
        insertedCount++;
      }
    }

    return {
      total: orders.length,
      inserted: insertedCount,
      updated: updatedCount,
    };
  }

  /**
   * Lấy danh sách đơn hàng đã đồng bộ
   */
  static async getOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    shop_username?: string;
  }) {
    await connectToDatabase();

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (params.shop_username && params.shop_username !== "all") {
      query.shop_username = { $regex: params.shop_username, $options: "i" };
    }

    if (params.status && params.status !== "all") {
      query.order_status = { $regex: params.status, $options: "i" };
    }

    if (params.search) {
      query.$or = [
        { order_sn: { $regex: params.search, $options: "i" } },
        { buyer_username: { $regex: params.search, $options: "i" } },
        { tracking_number: { $regex: params.search, $options: "i" } },
      ];
    }

    const [docs, total] = await Promise.all([
      MongoShopeeOrderModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MongoShopeeOrderModel.countDocuments(query),
    ]);

    return {
      orders: docs.map(toSafeOrder),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Thống kê tổng số đơn và doanh thu
   */
  static async getStats(shopUsername?: string) {
    await connectToDatabase();

    const filter: Record<string, any> = {};
    if (shopUsername && shopUsername !== "all") {
      filter.shop_username = { $regex: shopUsername, $options: "i" };
    }

    const [totalOrders, orders, uniqueShops] = await Promise.all([
      MongoShopeeOrderModel.countDocuments(filter),
      MongoShopeeOrderModel.find(filter).select("total_amount order_status").lean(),
      MongoShopeeOrderModel.distinct("shop_username"),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const statusCounts = orders.reduce((acc: Record<string, number>, o) => {
      const st = o.order_status || "Chờ xử lý";
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});

    return {
      totalOrders,
      totalRevenue,
      statusCounts,
      uniqueShops: uniqueShops.filter(Boolean),
    };
  }

  /**
   * Xóa đơn hàng theo mã đơn (order_sn) hoặc xóa tất cả
   */
  static async deleteOrders(orderSns?: string[]) {
    await connectToDatabase();
    if (orderSns && orderSns.length > 0) {
      const res = await MongoShopeeOrderModel.deleteMany({ order_sn: { $in: orderSns } });
      return { deletedCount: res.deletedCount };
    }
    const res = await MongoShopeeOrderModel.deleteMany({});
    return { deletedCount: res.deletedCount };
  }
}

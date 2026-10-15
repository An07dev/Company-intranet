import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel, IShopeeOrderDocument } from "@/server/db/schema";
import { ShopeeOrder } from "@/types";

export function toSafeOrder(doc: IShopeeOrderDocument): ShopeeOrder {
  let marketplace_order_sn: string | undefined = undefined;
  let sapo_order_number: string | undefined = undefined;
  let customer_name = doc.customer_name;
  let customer_phone = doc.customer_phone;

  if (doc.raw_text) {
    try {
      const raw = JSON.parse(doc.raw_text);
      if (raw.order_number) {
        sapo_order_number = String(raw.order_number).replace(/^#/, "").trim();
      }

      const candidateMarket =
        raw.source_identifier ||
        raw.reference_order_number ||
        (raw.name && /^[0-9]{6}[A-Z0-9]+$/i.test(String(raw.name).replace(/^#/, "").trim())
          ? String(raw.name).replace(/^#/, "").trim()
          : undefined);

      if (candidateMarket) {
        marketplace_order_sn = String(candidateMarket).trim();
      }

      if (!customer_name) {
        customer_name =
          raw.shipping_address?.name ||
          [raw.customer?.last_name, raw.customer?.first_name].filter(Boolean).join(" ").trim() ||
          raw.customer?.name;
      }
      if (!customer_phone) {
        customer_phone =
          raw.customer?.phone ||
          raw.shipping_address?.phone ||
          raw.billing_address?.phone;
      }
    } catch {}
  }

  // Nếu bản thân doc.order_sn là mã sàn TMĐT (Shopee...)
  if (!marketplace_order_sn && doc.order_sn && /^[0-9]{6}[A-Z0-9]+$/i.test(doc.order_sn)) {
    marketplace_order_sn = doc.order_sn;
  }
  // Nếu doc.order_sn là số hiệu Sapo
  if (!sapo_order_number && doc.order_sn && /^\d{1,8}$/.test(doc.order_sn)) {
    sapo_order_number = doc.order_sn;
  }

  return {
    id: doc.id,
    order_sn: doc.order_sn,
    marketplace_order_sn,
    sapo_order_number,
    shop_username: doc.shop_username,
    buyer_username: doc.buyer_username,
    customer_phone: customer_phone || doc.customer_phone,
    customer_name: customer_name || doc.customer_name || doc.buyer_username,
    customer_address: doc.customer_address,
    customer_id: doc.customer_id,
    sapo_id: doc.sapo_id,
    financial_status: doc.financial_status,
    total_received: doc.total_received,
    unpaid_amount: doc.unpaid_amount,
    paid_on: doc.paid_on,
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

/**
 * Chuẩn hóa và bóc tách mã đơn hàng duy nhất từ đối tượng đơn Sapo (Omnichannel, TMĐT, POS)
 */
export function resolveSapoOrderSn(orderData: any): string {
  if (!orderData || typeof orderData !== "object") return "";

  // 1. Kiểm tra nếu là đơn hàng từ sàn TMĐT (Shopee, Lazada, TikTok...)
  const sourceName = String(orderData.source_name || orderData.channel || "").toLowerCase();
  const sourceUrl = String(orderData.source_url || "").toLowerCase();
  const isMarketplace =
    sourceUrl.includes("shopee") ||
    sourceUrl.includes("lazada") ||
    sourceUrl.includes("tiktok") ||
    ["shopee", "lazada", "tiktok"].some((m) => sourceName.includes(m));

  if (isMarketplace) {
    // Với đơn TMĐT đồng bộ qua Sapo:
    // orderData.name (ví dụ "2610096RRSDNPS") hoặc source_identifier / reference_order_number là mã đơn sàn thực tế!
    const candidate =
      orderData.source_identifier ||
      orderData.reference_order_number ||
      orderData.name ||
      orderData.order_number ||
      orderData.id;
    return String(candidate || "").replace(/^#/, "").trim();
  }

  // 2. Với đơn POS / Web nội bộ / Bán lẻ Sapo:
  // Ưu tiên orderData.name (thường có prefix như SON15803 hoặc #15803), sau đó tới order_number, id
  const candidate =
    orderData.name ||
    orderData.order_number ||
    orderData.source_identifier ||
    orderData.reference_order_number ||
    orderData.id;

  return String(candidate || "").replace(/^#/, "").trim();
}

export class OrderModel {
  /**
   * Lưu hoặc cập nhật hàng loạt đơn hàng nguyên tử (Atomic bulkWrite, chống race condition & duplicate key E11000)
   */
  static async upsertOrders(orders: ShopeeOrder[], shopUsername = "baobiyensen") {
    await connectToDatabase();

    if (!orders || orders.length === 0) {
      return { total: 0, inserted: 0, updated: 0 };
    }

    const now = new Date().toISOString();

    // Khử trùng lặp order_sn trong cùng 1 lô truyền vào (lô mới nhất ghi đè)
    const validOrdersMap = new Map<string, ShopeeOrder>();
    for (const order of orders) {
      if (order && order.order_sn) {
        let resolvedSn = String(order.order_sn).trim();
        if (order.raw_text) {
          try {
            const raw = JSON.parse(order.raw_text);
            const canonicalSn = resolveSapoOrderSn(raw);
            if (canonicalSn) {
              resolvedSn = canonicalSn;
              order.order_sn = canonicalSn;
            }
          } catch {}
        }
        validOrdersMap.set(resolvedSn, order);
      }
    }

    // Tự động dọn dẹp bản ghi cũ theo số hiệu Sapo (ví dụ: '15807') nếu đơn mới được lưu dưới mã sàn chính thức ('2610096VR3K893')
    const legacySapoSnsToDelete: string[] = [];
    for (const order of validOrdersMap.values()) {
      const orderSn = String(order.order_sn).trim();
      let sapoOrderNum: string | null = null;
      let sapoName: string | null = null;
      if (order.raw_text) {
        try {
          const raw = JSON.parse(order.raw_text);
          if (raw.order_number) sapoOrderNum = String(raw.order_number).replace(/^#/, "").trim();
          if (raw.name) sapoName = String(raw.name).replace(/^#/, "").trim();
        } catch {}
      }
      if (sapoOrderNum && sapoOrderNum !== orderSn && /^\d{1,8}$/.test(sapoOrderNum)) {
        legacySapoSnsToDelete.push(sapoOrderNum);
      }
      if (sapoName && sapoName !== orderSn && /^\d{1,8}$/.test(sapoName)) {
        legacySapoSnsToDelete.push(sapoName);
      }
    }

    if (legacySapoSnsToDelete.length > 0) {
      await MongoShopeeOrderModel.deleteMany({ order_sn: { $in: legacySapoSnsToDelete } });
    }

    const bulkOps = Array.from(validOrdersMap.values()).map((order) => {
      const orderSn = String(order.order_sn).trim();
      const targetShop = order.shop_username || shopUsername || "baobiyensen";
      const cleanItems = deduplicateItems(order.items || []);

      const setDoc: any = {
        shop_username: targetShop,
        buyer_username: order.buyer_username || "Khách Shopee",
        total_amount: Number(order.total_amount) || 0,
        payment_method: order.payment_method || "Chưa rõ",
        order_status: order.order_status || "Chờ xử lý",
        status_description: order.status_description || "",
        shipping_carrier: order.shipping_carrier || "",
        tracking_number: order.tracking_number || "",
        items: cleanItems,
        raw_text: order.raw_text || "",
        synced_at: now,
        updatedAt: now,
      };

      let custName = order.customer_name;
      let custPhone = order.customer_phone;
      let custId = order.customer_id;
      let sapoId = order.sapo_id;

      if ((!custName || !custPhone || !custId) && order.raw_text) {
        try {
          const raw = JSON.parse(order.raw_text);
          if (!custName) {
            custName =
              raw.shipping_address?.name ||
              [raw.customer?.last_name, raw.customer?.first_name].filter(Boolean).join(" ").trim() ||
              raw.customer?.name ||
              (order.buyer_username && !order.buyer_username.startsWith("buyer_") ? order.buyer_username : "");
          }
          if (!custPhone) {
            custPhone =
              raw.customer?.phone ||
              raw.shipping_address?.phone ||
              raw.billing_address?.phone ||
              "";
          }
          if (!custId && raw.customer?.id) {
            custId = raw.customer.id;
          }
          if (!sapoId && raw.id) {
            sapoId = raw.id;
          }
          if (order.financial_status === undefined && raw.financial_status) {
            setDoc.financial_status = raw.financial_status;
          }
          if (order.total_received === undefined) {
            const rawRec = Number(raw.total_received) || (raw.financial_status === "paid" ? (Number(raw.total_price) || 0) : 0);
            if (raw.total_received !== undefined || raw.financial_status === "paid") {
              setDoc.total_received = rawRec;
            }
          }
          if (order.unpaid_amount === undefined) {
            if (raw.total_outstanding !== undefined || raw.unpaid_amount !== undefined) {
              setDoc.unpaid_amount = Number(raw.total_outstanding ?? raw.unpaid_amount);
            } else if (raw.financial_status === "paid") {
              setDoc.unpaid_amount = 0;
            }
          }
          if (order.paid_on === undefined && (raw.paid_on || raw.financial_status === "paid")) {
            setDoc.paid_on = raw.paid_on || raw.modified_on || raw.created_on || null;
          }
        } catch {}
      }

      if (custPhone !== undefined) setDoc.customer_phone = custPhone;
      if (custName !== undefined) setDoc.customer_name = custName;
      if (order.customer_address !== undefined) setDoc.customer_address = order.customer_address;
      if (custId !== undefined) setDoc.customer_id = custId;
      if (sapoId !== undefined) setDoc.sapo_id = sapoId;
      if (order.financial_status !== undefined) setDoc.financial_status = order.financial_status;
      if (order.total_received !== undefined) setDoc.total_received = order.total_received;
      if (order.unpaid_amount !== undefined) setDoc.unpaid_amount = order.unpaid_amount;
      if (order.paid_on !== undefined) setDoc.paid_on = order.paid_on;

      const setOnInsertDoc: any = {
        id: order.id || `ord_${orderSn}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        order_sn: orderSn,
        createdAt: order.createdAt || now,
      };

      return {
        updateOne: {
          filter: { order_sn: orderSn },
          update: {
            $set: setDoc,
            $setOnInsert: setOnInsertDoc,
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length === 0) {
      return { total: 0, inserted: 0, updated: 0 };
    }

    const res = await MongoShopeeOrderModel.bulkWrite(bulkOps, { ordered: false });

    return {
      total: orders.length,
      inserted: res.upsertedCount || 0,
      updated: res.modifiedCount || 0,
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
      const rawSearch = params.search.trim();
      const cleanSearch = rawSearch.replace(/^#/, "").trim();
      const escapedClean = cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedRaw = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const orConditions: any[] = [
        { order_sn: { $regex: escapedClean, $options: "i" } },
        { customer_name: { $regex: escapedClean, $options: "i" } },
        { customer_phone: { $regex: escapedClean, $options: "i" } },
        { buyer_username: { $regex: escapedClean, $options: "i" } },
        { tracking_number: { $regex: escapedRaw, $options: "i" } },
      ];

      // Tìm theo số điện thoại (hỗ trợ bỏ qua số 0 hoặc 84 đầu số)
      const digitsOnly = cleanSearch.replace(/\D/g, "");
      if (digitsOnly.length >= 6) {
        const phoneWithoutZero = digitsOnly.replace(/^(?:84|0)/, "");
        if (phoneWithoutZero && phoneWithoutZero !== cleanSearch) {
          orConditions.push({ customer_phone: { $regex: phoneWithoutZero, $options: "i" } });
        }
        orConditions.push({
          raw_text: {
            $regex: `"phone":\\s*"[^"]*${phoneWithoutZero || digitsOnly}`,
          },
        });
      }

      // Khớp chính xác mã đơn Sapo (order_number hoặc name) trong raw_text cho các đơn sàn TMĐT
      if (/^\d{1,8}$/.test(cleanSearch)) {
        orConditions.push({
          raw_text: {
            $regex: `"order_number":\\s*${cleanSearch}\\b|"name":\\s*"#?${cleanSearch}"`,
          },
        });
      }

      query.$or = orConditions;
    }

    const [docs, total] = await Promise.all([
      MongoShopeeOrderModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).allowDiskUse(true).lean(),
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

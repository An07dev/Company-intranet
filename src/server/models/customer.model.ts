import { connectToDatabase } from "@/server/db";
import { MongoSapoCustomerModel, ISapoCustomerDocument } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";

export interface CleanCustomer {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  phone: string;
  email: string;
  orders_count: number;
  total_spent: number;
  last_order_id: number | null;
  last_order_name: string | null;
  tags: string;
  note: string | null;
  created_on: string;
  modified_on: string;
  default_address?: any;
  addresses?: any[];
  synced_at: string;
}

export function normalizeCustomer(c: any, now = new Date().toISOString()): CleanCustomer {
  const fullName =
    [c.last_name, c.first_name].filter(Boolean).join(" ").trim() ||
    c.name ||
    c.shipping_address?.name ||
    "Khách lẻ";

  const phone =
    c.phone ||
    c.default_address?.phone ||
    c.shipping_address?.phone ||
    "";

  return {
    id: Number(c.id),
    first_name: c.first_name || "",
    last_name: c.last_name || "",
    name: fullName,
    phone: phone,
    email: c.email || "",
    orders_count: Number(c.orders_count) || 0,
    total_spent: Number(c.total_spent) || 0,
    last_order_id: c.last_order_id ? Number(c.last_order_id) : null,
    last_order_name: c.last_order_name ? String(c.last_order_name) : null,
    tags: c.tags || "",
    note: c.note || null,
    created_on: c.created_on || c.created_at || now,
    modified_on: c.modified_on || c.updated_at || now,
    default_address: c.default_address || c.shipping_address || null,
    addresses: c.addresses || (c.shipping_address ? [c.shipping_address] : []),
    synced_at: now,
  };
}

export class CustomerModel {
  /**
   * Lưu hoặc cập nhật hàng loạt khách hàng vào MongoDB (Atomic bulkWrite)
   */
  static async upsertCustomers(customers: any[]) {
    await connectToDatabase();
    if (!customers || customers.length === 0) {
      return { total: 0, inserted: 0, updated: 0 };
    }

    const now = new Date().toISOString();
    const map = new Map<number, CleanCustomer>();
    for (const raw of customers) {
      if (raw && raw.id) {
        const clean = normalizeCustomer(raw, now);
        map.set(clean.id, clean);
      }
    }

    const bulkOps = Array.from(map.values()).map((c) => ({
      updateOne: {
        filter: { id: c.id },
        update: { $set: c },
        upsert: true,
      },
    }));

    if (bulkOps.length === 0) return { total: 0, inserted: 0, updated: 0 };

    const res = await MongoSapoCustomerModel.bulkWrite(bulkOps, { ordered: false });
    return {
      total: bulkOps.length,
      inserted: res.upsertedCount || 0,
      updated: res.modifiedCount || 0,
    };
  }

  /**
   * Lưu hoặc cập nhật một khách hàng đơn lẻ
   */
  static async upsertSingleCustomer(customer: any) {
    await connectToDatabase();
    if (!customer || !customer.id) return null;
    const now = new Date().toISOString();
    const clean = normalizeCustomer(customer, now);

    return MongoSapoCustomerModel.findOneAndUpdate(
      { id: clean.id },
      { $set: clean },
      { upsert: true, new: true }
    );
  }

  /**
   * Tự động trích xuất và cập nhật khách hàng từ dữ liệu đơn hàng Sapo
   */
  static async syncFromOrder(orderCustomer: any, orderData?: any) {
    if (!orderCustomer || !orderCustomer.id) return null;
    await connectToDatabase();

    const now = new Date().toISOString();
    const customerId = Number(orderCustomer.id);
    const existing = await MongoSapoCustomerModel.findOne({ id: customerId }).lean();

    const phone =
      orderCustomer.phone ||
      orderData?.shipping_address?.phone ||
      orderCustomer.default_address?.phone ||
      existing?.phone ||
      "";

    const fullName =
      [orderCustomer.last_name, orderCustomer.first_name].filter(Boolean).join(" ").trim() ||
      orderCustomer.name ||
      orderData?.shipping_address?.name ||
      existing?.name ||
      "Khách lẻ";

    const lastOrderId = orderData?.id ? Number(orderData.id) : (orderCustomer.last_order_id || existing?.last_order_id || null);
    const lastOrderName = orderData?.order_number || orderData?.name || orderCustomer.last_order_name || existing?.last_order_name || null;

    const updateDoc: Partial<CleanCustomer> = {
      id: customerId,
      name: fullName,
      phone: phone,
      email: orderCustomer.email || existing?.email || "",
      last_order_id: lastOrderId,
      last_order_name: lastOrderName ? String(lastOrderName) : null,
      modified_on: orderData?.created_on || orderData?.created_at || now,
      synced_at: now,
    };

    if (orderCustomer.orders_count !== undefined) {
      updateDoc.orders_count = Number(orderCustomer.orders_count);
    } else if (existing) {
      updateDoc.orders_count = (existing.orders_count || 0) + 1;
    } else {
      updateDoc.orders_count = 1;
    }

    if (orderCustomer.total_spent !== undefined) {
      updateDoc.total_spent = Number(orderCustomer.total_spent);
    } else if (existing && orderData?.total_price) {
      updateDoc.total_spent = (existing.total_spent || 0) + (Number(orderData.total_price) || 0);
    } else if (orderData?.total_price) {
      updateDoc.total_spent = Number(orderData.total_price) || 0;
    }

    if (orderCustomer.default_address || orderData?.shipping_address) {
      updateDoc.default_address = orderCustomer.default_address || orderData?.shipping_address;
    }

    return MongoSapoCustomerModel.findOneAndUpdate(
      { id: customerId },
      {
        $set: updateDoc,
        $setOnInsert: {
          created_on: orderCustomer.created_on || orderData?.created_on || now,
          tags: orderCustomer.tags || "",
          note: orderCustomer.note || null,
          addresses: orderCustomer.addresses || (orderData?.shipping_address ? [orderData.shipping_address] : []),
        },
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Đồng bộ nhanh các khách hàng mới nhất (trang 1, 50 khách)
   */
  static async syncRecentCustomers(limit = 50) {
    try {
      const data = await SapoService.getCustomers({ page: 1, limit });
      const list = data.customers || [];
      if (list.length > 0) {
        return await CustomerModel.upsertCustomers(list);
      }
      return { total: 0, inserted: 0, updated: 0 };
    } catch (err: any) {
      console.warn("[CustomerModel.syncRecentCustomers Warning]:", err.message);
      return { total: 0, inserted: 0, updated: 0 };
    }
  }
}

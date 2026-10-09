import { connectToDatabase } from "@/server/db";
import { MongoShopeeLogModel, IShopeeLogDocument } from "@/server/db/schema";
import { ShopeeLog, ShopeeLogQueryParams, ShopeeLogStats } from "@/types";

export function toSafeLog(doc: IShopeeLogDocument): ShopeeLog {
  return {
    id: doc.id,
    level: doc.level as any,
    type: doc.type,
    source: doc.source,
    shop_username: doc.shop_username,
    message: doc.message,
    details: doc.details || {},
    duration_ms: doc.duration_ms,
    createdAt: doc.createdAt,
  };
}

export class LogModel {
  /**
   * Tạo 1 bản ghi log mới
   */
  static async createLog(input: {
    level: string;
    type?: string;
    source?: string;
    shop_username?: string;
    message: string;
    details?: Record<string, any>;
    duration_ms?: number;
    createdAt?: string;
  }): Promise<ShopeeLog> {
    await connectToDatabase();

    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = input.createdAt || new Date().toISOString();

    const created = await MongoShopeeLogModel.create({
      id,
      level: input.level || "info",
      type: input.type || "system",
      source: input.source || "chrome_extension",
      shop_username: input.shop_username || "baobiyensen",
      message: input.message,
      details: input.details || {},
      duration_ms: input.duration_ms,
      timestamp: new Date(now),
      createdAt: now,
    });

    return toSafeLog(created);
  }

  /**
   * Tạo nhiều bản ghi log cùng lúc
   */
  static async createBulkLogs(logs: any[]): Promise<number> {
    if (!logs || !Array.isArray(logs) || logs.length === 0) return 0;
    await connectToDatabase();

    const now = new Date().toISOString();
    const docs = logs.map(l => {
      const logCreated = l.createdAt || now;
      return {
        id: l.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        level: l.level || "info",
        type: l.type || "system",
        source: l.source || "chrome_extension",
        shop_username: l.shop_username || "baobiyensen",
        message: l.message,
        details: l.details || {},
        duration_ms: l.duration_ms,
        timestamp: new Date(logCreated),
        createdAt: logCreated,
      };
    });

    const result = await MongoShopeeLogModel.insertMany(docs);
    return result.length;
  }

  /**
   * Lấy danh sách log kèm phân trang và lọc
   */
  static async getLogs(params: ShopeeLogQueryParams = {}): Promise<{
    logs: ShopeeLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await connectToDatabase();

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 50));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (params.shop_username && params.shop_username !== "all") {
      query.shop_username = params.shop_username;
    }

    if (params.level && params.level !== "all") {
      query.level = params.level;
    }

    if (params.type && params.type !== "all") {
      query.type = params.type;
    }

    if (params.source && params.source !== "all") {
      query.source = params.source;
    }

    if (params.search && params.search.trim()) {
      const term = params.search.trim();
      query.$or = [
        { message: { $regex: term, $options: "i" } },
        { type: { $regex: term, $options: "i" } },
        { source: { $regex: term, $options: "i" } },
      ];
    }

    if (params.startDate || params.endDate) {
      query.createdAt = {};
      if (params.startDate) query.createdAt.$gte = params.startDate;
      if (params.endDate) query.createdAt.$lte = params.endDate;
    }

    const [docs, total] = await Promise.all([
      MongoShopeeLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MongoShopeeLogModel.countDocuments(query),
    ]);

    const logs = (docs as any[]).map(toSafeLog);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Lấy thống kê số lượng log theo từng cấp độ
   */
  static async getStats(shopUsername?: string): Promise<ShopeeLogStats> {
    await connectToDatabase();

    const filter: any = {};
    if (shopUsername && shopUsername !== "all") {
      filter.shop_username = shopUsername;
    }

    const [total, errorCount, warnCount, successCount, infoCount] = await Promise.all([
      MongoShopeeLogModel.countDocuments(filter),
      MongoShopeeLogModel.countDocuments({ ...filter, level: "error" }),
      MongoShopeeLogModel.countDocuments({ ...filter, level: "warn" }),
      MongoShopeeLogModel.countDocuments({ ...filter, level: "success" }),
      MongoShopeeLogModel.countDocuments({ ...filter, level: "info" }),
    ]);

    return {
      total,
      errorCount,
      warnCount,
      successCount,
      infoCount,
    };
  }

  /**
   * Xóa log theo ID
   */
  static async deleteLogById(id: string): Promise<boolean> {
    await connectToDatabase();
    const res = await MongoShopeeLogModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  /**
   * Dọn dẹp log (xóa toàn bộ hoặc xóa log cũ hơn N ngày)
   */
  static async clearLogs(options: {
    shopUsername?: string;
    level?: string;
    olderThanDays?: number;
  } = {}): Promise<number> {
    await connectToDatabase();

    const filter: any = {};
    if (options.shopUsername && options.shopUsername !== "all") {
      filter.shop_username = options.shopUsername;
    }
    if (options.level && options.level !== "all") {
      filter.level = options.level;
    }
    if (options.olderThanDays && options.olderThanDays > 0) {
      const cutoff = new Date(Date.now() - options.olderThanDays * 24 * 60 * 60 * 1000).toISOString();
      filter.createdAt = { $lt: cutoff };
    }

    const res = await MongoShopeeLogModel.deleteMany(filter);
    return res.deletedCount || 0;
  }
}

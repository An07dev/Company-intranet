import crypto from "crypto";
import { connectToDatabase } from "@/server/db";
import { MongoPackageModel, IPackageDocument } from "@/server/db/schema";
import {
  Package,
  CreatePackageInput,
  UpdatePackageInput,
  PackageFilterParams,
  PackageStatus,
} from "@/types";

export function toSafePackage(doc: IPackageDocument | any): Package {
  return {
    id: doc.id,
    code: doc.code,
    title: doc.title || "",
    status: (doc.status as PackageStatus) || "draft",
    package_type: doc.package_type || "Đóng hàng xuất",
    destination: doc.destination || "",
    warehouse_location: doc.warehouse_location || "",
    weight_kg: Number(doc.weight_kg) || 0,
    dimensions: doc.dimensions || { length: 0, width: 0, height: 0 },
    items: (doc.items || []).map((it: any) => ({
      id: it.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      product_id: String(it.product_id),
      model_id: it.model_id ? String(it.model_id) : undefined,
      product_name: it.product_name || "Sản phẩm",
      sku: it.sku || "",
      variation_name: it.variation_name || "",
      image: it.image || "",
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      unit: it.unit || "Cái",
      note: it.note || "",
    })),
    total_items: Number(doc.total_items) || 0,
    total_sku_count: Number(doc.total_sku_count) || (doc.items?.length || 0),
    total_value: Number(doc.total_value) || 0,
    notes: doc.notes || "",
    created_by: doc.created_by
      ? {
          id: doc.created_by.id,
          name: doc.created_by.name || "Nhân viên",
          email: doc.created_by.email,
        }
      : undefined,
    packed_by: doc.packed_by,
    packed_at: doc.packed_at,
    shipped_at: doc.shipped_at,
    delivered_at: doc.delivered_at,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class PackageModel {
  /**
   * Tạo mã kiện hàng ngẫu nhiên định dạng PKG-YYYYMMDD-XXXX
   */
  static generatePackageCode(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PKG-${yyyy}${mm}${dd}-${rand}`;
  }

  /**
   * Lấy danh sách kiện hàng có phân trang và bộ lọc
   */
  static async getPackages(params: PackageFilterParams = {}) {
    await connectToDatabase();

    const query: Record<string, any> = {};

    if (params.status && params.status !== "all") {
      query.status = params.status;
    }

    if (params.package_type && params.package_type !== "all") {
      query.package_type = params.package_type;
    }

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      query.$or = [
        { code: { $regex: s, $options: "i" } },
        { title: { $regex: s, $options: "i" } },
        { destination: { $regex: s, $options: "i" } },
        { warehouse_location: { $regex: s, $options: "i" } },
        { "items.product_name": { $regex: s, $options: "i" } },
        { "items.sku": { $regex: s, $options: "i" } },
        { "created_by.name": { $regex: s, $options: "i" } },
      ];
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const sortOptions: Record<string, 1 | -1> = {};
    const sortField = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder === "asc" ? 1 : -1;
    sortOptions[sortField] = sortOrder;

    const [docs, total] = await Promise.all([
      MongoPackageModel.find(query).sort(sortOptions).skip(skip).limit(limit).lean(),
      MongoPackageModel.countDocuments(query),
    ]);

    return {
      packages: docs.map(toSafePackage),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy chi tiết kiện hàng theo id hoặc code (hỗ trợ quét mã QR)
   */
  static async getPackageByIdOrCode(idOrCode: string): Promise<Package | null> {
    await connectToDatabase();
    if (!idOrCode) return null;

    const clean = idOrCode.trim();
    // Tìm theo id chính xác hoặc code chính xác hoặc code case-insensitive
    const doc = await MongoPackageModel.findOne({
      $or: [
        { id: clean },
        { code: clean },
        { code: { $regex: `^${clean}$`, $options: "i" } },
      ],
    }).lean();

    if (!doc) return null;
    return toSafePackage(doc);
  }

  /**
   * Tạo kiện hàng mới
   */
  static async createPackage(
    input: CreatePackageInput,
    user?: { id?: string; name: string; email?: string }
  ): Promise<Package> {
    await connectToDatabase();

    const now = new Date().toISOString();
    let code = (input.code || "").trim();
    if (!code) {
      code = this.generatePackageCode();
    }

    // Kiểm tra trùng mã kiện
    const existing = await MongoPackageModel.findOne({ code }).lean();
    if (existing) {
      code = `${code}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const items = (input.items || []).map((it) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      product_id: String(it.product_id),
      model_id: it.model_id ? String(it.model_id) : undefined,
      product_name: it.product_name,
      sku: it.sku || "",
      variation_name: it.variation_name || "",
      image: it.image || "",
      quantity: Math.max(1, Number(it.quantity) || 1),
      unit_price: Number(it.unit_price) || 0,
      unit: it.unit || "Cái",
      note: it.note || "",
    }));

    const total_items = items.reduce((sum, item) => sum + item.quantity, 0);
    const total_sku_count = items.length;
    const total_value = items.reduce((sum, item) => sum + item.quantity * (item.unit_price || 0), 0);

    const id = `pkg_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const status = input.status || "draft";

    const docData: any = {
      id,
      code,
      title: input.title.trim(),
      status,
      package_type: input.package_type || "Đóng hàng xuất",
      destination: input.destination || "",
      warehouse_location: input.warehouse_location || "",
      weight_kg: Number(input.weight_kg) || 0,
      dimensions: input.dimensions || { length: 0, width: 0, height: 0 },
      items,
      total_items,
      total_sku_count,
      total_value,
      notes: input.notes || "",
      created_by: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
          }
        : undefined,
      createdAt: now,
      updatedAt: now,
    };

    if (status === "packed") {
      docData.packed_at = now;
      docData.packed_by = user?.name || "Hệ thống";
    }

    const doc = await MongoPackageModel.create(docData);
    return toSafePackage(doc.toObject());
  }

  /**
   * Cập nhật thông tin kiện hàng
   */
  static async updatePackage(
    id: string,
    input: UpdatePackageInput,
    user?: { id?: string; name: string; email?: string }
  ): Promise<Package | null> {
    await connectToDatabase();

    const existing = await MongoPackageModel.findOne({
      $or: [{ id }, { code: id }],
    });
    if (!existing) return null;

    const now = new Date().toISOString();
    const updateData: any = {
      updatedAt: now,
    };

    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.package_type !== undefined) updateData.package_type = input.package_type;
    if (input.destination !== undefined) updateData.destination = input.destination;
    if (input.warehouse_location !== undefined) updateData.warehouse_location = input.warehouse_location;
    if (input.weight_kg !== undefined) updateData.weight_kg = Number(input.weight_kg) || 0;
    if (input.dimensions !== undefined) updateData.dimensions = input.dimensions;
    if (input.notes !== undefined) updateData.notes = input.notes;

    if (input.items !== undefined) {
      const items = input.items.map((it) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        product_id: String(it.product_id),
        model_id: it.model_id ? String(it.model_id) : undefined,
        product_name: it.product_name,
        sku: it.sku || "",
        variation_name: it.variation_name || "",
        image: it.image || "",
        quantity: Math.max(1, Number(it.quantity) || 1),
        unit_price: Number(it.unit_price) || 0,
        unit: it.unit || "Cái",
        note: it.note || "",
      }));
      updateData.items = items;
      updateData.total_items = items.reduce((sum, item) => sum + item.quantity, 0);
      updateData.total_sku_count = items.length;
      updateData.total_value = items.reduce(
        (sum, item) => sum + item.quantity * (item.unit_price || 0),
        0
      );
    }

    if (input.status && input.status !== existing.status) {
      updateData.status = input.status;
      if (input.status === "packed" && !existing.packed_at) {
        updateData.packed_at = now;
        updateData.packed_by = user?.name || "Hệ thống";
      } else if (input.status === "in_transit" && !existing.shipped_at) {
        updateData.shipped_at = now;
      } else if (input.status === "delivered" && !existing.delivered_at) {
        updateData.delivered_at = now;
      }
    }

    const updated = await MongoPackageModel.findOneAndUpdate(
      { _id: existing._id },
      { $set: updateData },
      { new: true }
    ).lean();

    return updated ? toSafePackage(updated) : null;
  }

  /**
   * Cập nhật nhanh trạng thái kiện hàng
   */
  static async updateStatus(
    id: string,
    status: PackageStatus,
    userName = "Nhân viên"
  ): Promise<Package | null> {
    await connectToDatabase();
    const now = new Date().toISOString();

    const updateData: any = {
      status,
      updatedAt: now,
    };

    if (status === "packed") {
      updateData.packed_at = now;
      updateData.packed_by = userName;
    } else if (status === "in_transit") {
      updateData.shipped_at = now;
    } else if (status === "delivered") {
      updateData.delivered_at = now;
    }

    const updated = await MongoPackageModel.findOneAndUpdate(
      { $or: [{ id }, { code: id }] },
      { $set: updateData },
      { new: true }
    ).lean();

    return updated ? toSafePackage(updated) : null;
  }

  /**
   * Xóa kiện hàng
   */
  static async deletePackage(id: string): Promise<boolean> {
    await connectToDatabase();
    const res = await MongoPackageModel.deleteOne({
      $or: [{ id }, { code: id }],
    });
    return (res.deletedCount || 0) > 0;
  }

  /**
   * Thống kê số lượng kiện hàng theo trạng thái
   */
  static async getStats() {
    await connectToDatabase();

    const [total, draft, packed, inTransit, delivered, cancelled, sumItemsResult] =
      await Promise.all([
        MongoPackageModel.countDocuments(),
        MongoPackageModel.countDocuments({ status: "draft" }),
        MongoPackageModel.countDocuments({ status: "packed" }),
        MongoPackageModel.countDocuments({ status: "in_transit" }),
        MongoPackageModel.countDocuments({ status: "delivered" }),
        MongoPackageModel.countDocuments({ status: "cancelled" }),
        MongoPackageModel.aggregate([
          {
            $group: {
              _id: null,
              totalItems: { $sum: "$total_items" },
              totalValue: { $sum: "$total_value" },
            },
          },
        ]),
      ]);

    const totalItems = sumItemsResult[0]?.totalItems || 0;
    const totalValue = sumItemsResult[0]?.totalValue || 0;

    return {
      total,
      draft,
      packed,
      inTransit,
      delivered,
      cancelled,
      totalItems,
      totalValue,
    };
  }
}

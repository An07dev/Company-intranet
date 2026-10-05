import { connectToDatabase } from "@/server/db";
import { MongoAssetModel, MongoUserModel, IAssetDocument } from "@/server/db/schema";
import {
  Asset,
  AssetCategory,
  AssetHandoverHistory,
  AssetStats,
  AssetStatus,
  CreateAssetInput,
  HandoverAssetInput,
  RecallAssetInput,
  UpdateAssetInput,
  UserRole,
} from "@/types";

export interface CurrentUserContext {
  id: string;
  name: string;
  email: string;
  employeeCode?: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
}

export function toSafeAsset(doc: IAssetDocument): Asset {
  return {
    id: doc.id,
    code: doc.code,
    name: doc.name,
    category: doc.category,
    model: doc.model,
    serialNumber: doc.serialNumber,
    purchasePrice: doc.purchasePrice,
    purchaseDate: doc.purchaseDate,
    warrantyExpiryDate: doc.warrantyExpiryDate,
    condition: doc.condition || "Tốt",
    location: doc.location,
    imageUrl: doc.imageUrl,
    description: doc.description,
    status: doc.status,
    currentAssigneeId: doc.currentAssigneeId,
    currentAssigneeName: doc.currentAssigneeName,
    currentAssigneeEmail: doc.currentAssigneeEmail,
    currentAssigneeCode: doc.currentAssigneeCode,
    currentAssigneeDepartment: doc.currentAssigneeDepartment,
    currentAssigneeAvatar: doc.currentAssigneeAvatar,
    assignedDate: doc.assignedDate,
    handoverHistory: (doc.handoverHistory || []).map((h) => ({
      id: h.id,
      action: h.action,
      userId: h.userId,
      userName: h.userName,
      userEmail: h.userEmail,
      employeeCode: h.employeeCode,
      userDepartment: h.userDepartment,
      performedById: h.performedById,
      performedByName: h.performedByName,
      performedByRole: h.performedByRole as UserRole,
      date: h.date,
      condition: h.condition,
      note: h.note,
      createdAt: h.createdAt,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

let assetsSeeded = false;

export async function ensureAssetsSeeded() {
  if (assetsSeeded) return;
  await connectToDatabase();

  const count = await MongoAssetModel.countDocuments();
  if (count === 0) {
    const allUsers = await MongoUserModel.find({ status: "active" }).lean();
    const admin = allUsers.find((u) => u.role === "admin") || allUsers[0];
    const director = allUsers.find((u) => u.role === "director") || allUsers[0];
    const employees = allUsers.filter((u) => u.role === "employee");
    const emp1 = employees[0] || allUsers[0];
    const emp2 = employees[1] || allUsers[0];

    const initialAssets: Partial<IAssetDocument>[] = [
      {
        id: "asset_01",
        code: "TS-IT-001",
        name: "MacBook Pro 14 inch M2 Pro",
        category: "it_equipment",
        model: "Apple (16GB RAM / 512GB SSD)",
        serialNumber: "C02G1234MD6R",
        purchasePrice: 48900000,
        purchaseDate: "2025-06-15",
        warrantyExpiryDate: "2027-06-15",
        condition: "Mới 98%",
        location: "Khu vực Kỹ thuật Phần mềm",
        imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80",
        description: "Máy tính xách tay cấu hình cao cấp cấp phát cho Lập trình viên chính.",
        status: "in_use",
        currentAssigneeId: emp1?.id,
        currentAssigneeName: emp1?.name,
        currentAssigneeEmail: emp1?.email,
        currentAssigneeCode: emp1?.employeeCode,
        currentAssigneeDepartment: emp1?.department,
        currentAssigneeAvatar: emp1?.avatarUrl,
        assignedDate: "2025-06-20",
        handoverHistory: [
          {
            id: "ho_seed_01",
            action: "handover",
            userId: emp1?.id || "usr_emp_01",
            userName: emp1?.name || "Lê Hoàng Nam",
            userEmail: emp1?.email || "nam.lh@company.internal",
            employeeCode: emp1?.employeeCode || "NV-001",
            userDepartment: emp1?.department || "Ban Công Nghệ & Quản Trị Hệ Thống",
            performedById: admin?.id || "usr_admin_01",
            performedByName: admin?.name || "Nguyễn Văn Admin",
            performedByRole: "admin",
            date: "2025-06-20",
            condition: "Mới 100% nguyên seal, đầy đủ củ sạc MagSafe 3",
            note: "Bàn giao máy tính phục vụ dự án công ty, cam kết bảo quản cẩn thận.",
            createdAt: "2025-06-20T08:30:00.000Z",
          },
        ],
        createdAt: "2025-06-15T09:00:00.000Z",
        updatedAt: "2025-06-20T08:30:00.000Z",
      },
      {
        id: "asset_02",
        code: "TS-IT-002",
        name: "Dell XPS 15 9530 (i7 / RTX 4060)",
        category: "it_equipment",
        model: "Dell (32GB RAM / 1TB SSD / Màn 3.5K OLED)",
        serialNumber: "DXPS-998822",
        purchasePrice: 42500000,
        purchaseDate: "2025-08-10",
        warrantyExpiryDate: "2027-08-10",
        condition: "Tốt (95%)",
        location: "Khu vực Thiết kế UI/UX",
        imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300&auto=format&fit=crop&q=80",
        description: "Máy trạm đồ họa di động phục vụ thiết kế ấn phẩm và UI/UX sản phẩm.",
        status: "in_use",
        currentAssigneeId: emp2?.id,
        currentAssigneeName: emp2?.name,
        currentAssigneeEmail: emp2?.email,
        currentAssigneeCode: emp2?.employeeCode,
        currentAssigneeDepartment: emp2?.department,
        currentAssigneeAvatar: emp2?.avatarUrl,
        assignedDate: "2025-08-15",
        handoverHistory: [
          {
            id: "ho_seed_02",
            action: "handover",
            userId: emp2?.id || "usr_emp_02",
            userName: emp2?.name || "Trần Mai Hoa",
            userEmail: emp2?.email || "hoa.tm@company.internal",
            employeeCode: emp2?.employeeCode || "NV-002",
            userDepartment: emp2?.department || "Phòng Thiết Kế Sáng Tạo",
            performedById: admin?.id || "usr_admin_01",
            performedByName: admin?.name || "Nguyễn Văn Admin",
            performedByRole: "admin",
            date: "2025-08-15",
            condition: "Mới 100%, kèm sạc Type-C 130W và chuột không dây",
            note: "Bàn giao tài sản làm việc chuyên môn thiết kế.",
            createdAt: "2025-08-15T09:15:00.000Z",
          },
        ],
        createdAt: "2025-08-10T10:00:00.000Z",
        updatedAt: "2025-08-15T09:15:00.000Z",
      },
      {
        id: "asset_03",
        code: "TS-IT-003",
        name: "Màn hình Dell UltraSharp U2723QE 4K IPS Black",
        category: "it_equipment",
        model: "Dell 27 inch 4K HDR400",
        serialNumber: "CN-0TY456-789",
        purchasePrice: 13800000,
        purchaseDate: "2025-09-01",
        warrantyExpiryDate: "2028-09-01",
        condition: "Mới 100% nguyên hộp",
        location: "Kho IT Tầng 2 - Tủ A1",
        imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&auto=format&fit=crop&q=80",
        description: "Màn hình chuẩn đồ họa 4K Type-C 90W cấp nguồn, sẵn sàng bàn giao cho nhân viên mới.",
        status: "available",
        handoverHistory: [],
        createdAt: "2025-09-01T14:00:00.000Z",
        updatedAt: "2025-09-01T14:00:00.000Z",
      },
      {
        id: "asset_04",
        code: "TS-NT-001",
        name: "Ghế công thái học Herman Miller Aeron Remastered",
        category: "furniture",
        model: "Herman Miller Size B (Mineral)",
        serialNumber: "HM-AERON-2025",
        purchasePrice: 28500000,
        purchaseDate: "2025-01-10",
        warrantyExpiryDate: "2037-01-10",
        condition: "Rất tốt (98%)",
        location: "Phòng Giám Đốc (Tầng 4)",
        imageUrl: "https://images.unsplash.com/photo-1580481077195-c3a822075dc6?w=300&auto=format&fit=crop&q=80",
        description: "Ghế công thái học cao cấp lưới Pellicle 8Z bảo vệ cột sống.",
        status: "in_use",
        currentAssigneeId: director?.id,
        currentAssigneeName: director?.name,
        currentAssigneeEmail: director?.email,
        currentAssigneeCode: director?.employeeCode,
        currentAssigneeDepartment: director?.department,
        currentAssigneeAvatar: director?.avatarUrl,
        assignedDate: "2025-01-15",
        handoverHistory: [
          {
            id: "ho_seed_03",
            action: "handover",
            userId: director?.id || "usr_dir_01",
            userName: director?.name || "Trịnh Gia Giám Đốc",
            userEmail: director?.email || "director@company.internal",
            employeeCode: director?.employeeCode || "GD-001",
            userDepartment: director?.department || "Ban Giám Đốc",
            performedById: admin?.id || "usr_admin_01",
            performedByName: admin?.name || "Nguyễn Văn Admin",
            performedByRole: "admin",
            date: "2025-01-15",
            condition: "Mới 100%, chỉnh dáng ngồi chuẩn",
            note: "Trang bị phòng làm việc Giám Đốc.",
            createdAt: "2025-01-15T11:00:00.000Z",
          },
        ],
        createdAt: "2025-01-10T10:00:00.000Z",
        updatedAt: "2025-01-15T11:00:00.000Z",
      },
      {
        id: "asset_05",
        code: "TS-VP-001",
        name: "Máy in Laser đa chức năng Canon imageCLASS MF244dw",
        category: "office_equipment",
        model: "Canon (In 2 mặt, Copy, Scan, WiFi)",
        serialNumber: "CN-PR-88123",
        purchasePrice: 5600000,
        purchaseDate: "2025-03-20",
        warrantyExpiryDate: "2026-03-20",
        condition: "Hoạt động hoàn hảo",
        location: "Khu vực in ấn chung - Tầng 2",
        imageUrl: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=300&auto=format&fit=crop&q=80",
        description: "Máy in nội bộ văn phòng kết nối mạng LAN/Wifi phục vụ toàn thể nhân viên.",
        status: "available",
        handoverHistory: [],
        createdAt: "2025-03-20T08:00:00.000Z",
        updatedAt: "2025-03-20T08:00:00.000Z",
      },
      {
        id: "asset_06",
        code: "TS-PT-001",
        name: "Xe ô tô 7 chỗ Toyota Fortuner Legender 2024",
        category: "vehicle",
        model: "Toyota Fortuner 2.8L 4x4 AT",
        serialNumber: "Biển số: 30K-888.99",
        purchasePrice: 1250000000,
        purchaseDate: "2024-11-05",
        warrantyExpiryDate: "2027-11-05",
        condition: "Tốt, bảo dưỡng định kỳ hãng đầy đủ",
        location: "Hầm để xe B1 - Vị trí VIP 01",
        imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300&auto=format&fit=crop&q=80",
        description: "Xe công tác phục vụ tiếp khách, đi thị trường và công vụ của ban lãnh đạo.",
        status: "available",
        handoverHistory: [],
        createdAt: "2024-11-05T09:00:00.000Z",
        updatedAt: "2024-11-05T09:00:00.000Z",
      },
      {
        id: "asset_07",
        code: "TS-VP-002",
        name: "Máy chiếu Laser 4K Sony VPL-PHZ50 5000 Lumens",
        category: "office_equipment",
        model: "Sony VPL-PHZ50",
        serialNumber: "SN-MC-44501",
        purchasePrice: 32000000,
        purchaseDate: "2024-05-12",
        warrantyExpiryDate: "2026-05-12",
        condition: "Cần bảo dưỡng thấu kính và cảm biến quạt",
        location: "Phòng Họp Hội đồng Tầng 3",
        imageUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=300&auto=format&fit=crop&q=80",
        description: "Máy chiếu phòng họp lớn, hiện đang liên hệ bảo hành chính hãng để thay thế linh kiện.",
        status: "maintenance",
        handoverHistory: [],
        createdAt: "2024-05-12T10:00:00.000Z",
        updatedAt: "2026-02-15T15:00:00.000Z",
      },
      {
        id: "asset_08",
        code: "TS-IT-004",
        name: "iPad Pro 11 inch M2 WiFi 128GB Space Gray",
        category: "it_equipment",
        model: "Apple (kèm Apple Pencil 2)",
        serialNumber: "DMPX1249A-IPAD",
        purchasePrice: 21900000,
        purchaseDate: "2025-07-20",
        warrantyExpiryDate: "2026-07-20",
        condition: "Mới 99%",
        location: "Kho IT Tầng 2 - Kệ Thiết bị Demo",
        imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&auto=format&fit=crop&q=80",
        description: "Thiết bị dùng để test ứng dụng iOS và demo sản phẩm tại triển lãm.",
        status: "available",
        handoverHistory: [],
        createdAt: "2025-07-20T11:00:00.000Z",
        updatedAt: "2025-07-20T11:00:00.000Z",
      },
    ];

    await MongoAssetModel.insertMany(initialAssets);
  }
  assetsSeeded = true;
}

export const AssetModel = {
  /**
   * Lấy danh sách tài sản theo bộ lọc và tab
   */
  async getAssets(
    filters: {
      tab?: string;
      category?: string;
      status?: string;
      assigneeId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    currentUser: CurrentUserContext
  ): Promise<{ items: Asset[]; total: number; page: number; limit: number; totalPages: number }> {
    await ensureAssetsSeeded();

    const query: Record<string, unknown> = {};

    // 1. Phân loại theo Tab
    if (filters.tab === "my_assets") {
      query.currentAssigneeId = currentUser.id;
    } else if (filters.tab === "available") {
      query.status = "available";
    } else if (filters.tab === "in_use") {
      query.status = "in_use";
    } else if (filters.tab === "maintenance") {
      query.status = { $in: ["maintenance", "broken"] };
    }

    // 2. Bộ lọc cụ thể
    if (filters.category && filters.category !== "all") {
      query.category = filters.category;
    }

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    if (filters.assigneeId) {
      query.currentAssigneeId = filters.assigneeId;
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      query.$or = [
        { name: { $regex: term, $options: "i" } },
        { code: { $regex: term, $options: "i" } },
        { model: { $regex: term, $options: "i" } },
        { serialNumber: { $regex: term, $options: "i" } },
        { currentAssigneeName: { $regex: term, $options: "i" } },
        { currentAssigneeCode: { $regex: term, $options: "i" } },
      ];
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 50));
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      MongoAssetModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MongoAssetModel.countDocuments(query),
    ]);

    const items = docs.map((d) => toSafeAsset(d as unknown as IAssetDocument));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  },

  /**
   * Lấy chi tiết 1 tài sản kèm lịch sử bàn giao
   */
  async getAssetById(id: string): Promise<Asset | null> {
    await ensureAssetsSeeded();
    const doc = await MongoAssetModel.findOne({ id }).lean();
    if (!doc) return null;
    return toSafeAsset(doc as unknown as IAssetDocument);
  },

  /**
   * Thêm mới tài sản
   */
  async createAsset(input: CreateAssetInput, creator: CurrentUserContext): Promise<Asset> {
    await ensureAssetsSeeded();

    const existing = await MongoAssetModel.findOne({ code: input.code.trim().toUpperCase() }).lean();
    if (existing) {
      throw new Error(`Mã tài sản "${input.code}" đã tồn tại trong hệ thống!`);
    }

    const newId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowStr = new Date().toISOString();

    const docData: Partial<IAssetDocument> = {
      id: newId,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      category: input.category,
      model: input.model?.trim(),
      serialNumber: input.serialNumber?.trim(),
      purchasePrice: input.purchasePrice ? Number(input.purchasePrice) : undefined,
      purchaseDate: input.purchaseDate,
      warrantyExpiryDate: input.warrantyExpiryDate,
      condition: input.condition?.trim() || "Mới 100%",
      location: input.location?.trim() || "Kho nội bộ",
      imageUrl: input.imageUrl,
      description: input.description?.trim(),
      status: input.status || "available",
      handoverHistory: [],
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    const created = await MongoAssetModel.create(docData);
    return toSafeAsset(created.toObject() as unknown as IAssetDocument);
  },

  /**
   * Cập nhật thông tin tài sản
   */
  async updateAsset(id: string, input: UpdateAssetInput): Promise<Asset | null> {
    await ensureAssetsSeeded();

    if (input.code) {
      const existing = await MongoAssetModel.findOne({
        code: input.code.trim().toUpperCase(),
        id: { $ne: id },
      }).lean();
      if (existing) {
        throw new Error(`Mã tài sản "${input.code}" đã được sử dụng cho tài sản khác!`);
      }
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.code !== undefined) updateFields.code = input.code.trim().toUpperCase();
    if (input.name !== undefined) updateFields.name = input.name.trim();
    if (input.category !== undefined) updateFields.category = input.category;
    if (input.model !== undefined) updateFields.model = input.model.trim();
    if (input.serialNumber !== undefined) updateFields.serialNumber = input.serialNumber.trim();
    if (input.purchasePrice !== undefined) updateFields.purchasePrice = Number(input.purchasePrice);
    if (input.purchaseDate !== undefined) updateFields.purchaseDate = input.purchaseDate;
    if (input.warrantyExpiryDate !== undefined) updateFields.warrantyExpiryDate = input.warrantyExpiryDate;
    if (input.condition !== undefined) updateFields.condition = input.condition.trim();
    if (input.location !== undefined) updateFields.location = input.location.trim();
    if (input.imageUrl !== undefined) updateFields.imageUrl = input.imageUrl;
    if (input.description !== undefined) updateFields.description = input.description.trim();
    if (input.status !== undefined) updateFields.status = input.status;

    const updated = await MongoAssetModel.findOneAndUpdate({ id }, { $set: updateFields }, { new: true }).lean();
    if (!updated) return null;
    return toSafeAsset(updated as unknown as IAssetDocument);
  },

  /**
   * Xóa tài sản
   */
  async deleteAsset(id: string): Promise<boolean> {
    await ensureAssetsSeeded();
    const asset = await MongoAssetModel.findOne({ id }).lean();
    if (!asset) return false;
    if (asset.status === "in_use") {
      throw new Error("Không thể xóa tài sản đang được bàn giao sử dụng! Vui lòng thu hồi trước.");
    }
    const res = await MongoAssetModel.deleteOne({ id });
    return res.deletedCount > 0;
  },

  /**
   * Bàn giao tài sản cho nhân viên
   */
  async handoverAsset(id: string, input: HandoverAssetInput, performer: CurrentUserContext): Promise<Asset> {
    await ensureAssetsSeeded();

    const asset = await MongoAssetModel.findOne({ id }).lean();
    if (!asset) {
      throw new Error("Không tìm thấy tài sản cần bàn giao!");
    }

    if (asset.status === "in_use") {
      throw new Error(`Tài sản này hiện đang được bàn giao cho "${asset.currentAssigneeName}". Vui lòng thu hồi trước khi bàn giao lại!`);
    }

    if (asset.status === "broken" || asset.status === "liquidated") {
      throw new Error("Tài sản đang hỏng hoặc đã thanh lý, không thể thực hiện bàn giao!");
    }

    // Lấy thông tin nhân viên nhận bàn giao
    const assignee = await MongoUserModel.findOne({ id: input.assigneeId }).lean();
    if (!assignee) {
      throw new Error("Không tìm thấy thông tin nhân sự nhận bàn giao!");
    }

    const todayStr = input.date || new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    const handoverRecord: AssetHandoverHistory = {
      id: `ho_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: "handover",
      userId: assignee.id,
      userName: assignee.name,
      userEmail: assignee.email,
      employeeCode: assignee.employeeCode,
      userDepartment: assignee.department,
      performedById: performer.id,
      performedByName: performer.name,
      performedByRole: performer.role,
      date: todayStr,
      condition: input.condition?.trim() || asset.condition || "Tốt",
      note: input.note?.trim() || "Bàn giao trang thiết bị làm việc",
      createdAt: nowIso,
    };

    const updateFields: Record<string, unknown> = {
      status: "in_use",
      currentAssigneeId: assignee.id,
      currentAssigneeName: assignee.name,
      currentAssigneeEmail: assignee.email,
      currentAssigneeCode: assignee.employeeCode,
      currentAssigneeDepartment: assignee.department,
      currentAssigneeAvatar: assignee.avatarUrl,
      assignedDate: todayStr,
      updatedAt: nowIso,
    };

    if (input.condition?.trim()) {
      updateFields.condition = input.condition.trim();
    }

    const updated = await MongoAssetModel.findOneAndUpdate(
      { id },
      {
        $set: updateFields,
        $push: { handoverHistory: handoverRecord },
      },
      { new: true }
    ).lean();

    if (!updated) {
      throw new Error("Cập nhật bàn giao tài sản thất bại!");
    }

    return toSafeAsset(updated as unknown as IAssetDocument);
  },

  /**
   * Thu hồi tài sản từ nhân viên
   */
  async recallAsset(id: string, input: RecallAssetInput, performer: CurrentUserContext): Promise<Asset> {
    await ensureAssetsSeeded();

    const asset = await MongoAssetModel.findOne({ id }).lean();
    if (!asset) {
      throw new Error("Không tìm thấy tài sản!");
    }

    if (asset.status !== "in_use" || !asset.currentAssigneeId) {
      throw new Error("Tài sản này hiện không ở trạng thái đang sử dụng, không cần thu hồi!");
    }

    const todayStr = input.date || new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const newStatus = input.newStatus || "available";

    const recallRecord: AssetHandoverHistory = {
      id: `rc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: "recall",
      userId: asset.currentAssigneeId,
      userName: asset.currentAssigneeName || "Nhân viên",
      userEmail: asset.currentAssigneeEmail || "",
      employeeCode: asset.currentAssigneeCode,
      userDepartment: asset.currentAssigneeDepartment,
      performedById: performer.id,
      performedByName: performer.name,
      performedByRole: performer.role,
      date: todayStr,
      condition: input.condition?.trim() || asset.condition || "Tốt",
      note: input.note?.trim() || "Thu hồi tài sản về kho công ty",
      createdAt: nowIso,
    };

    const updateFields: Record<string, unknown> = {
      status: newStatus,
      updatedAt: nowIso,
    };

    if (input.condition?.trim()) {
      updateFields.condition = input.condition.trim();
    }

    const updated = await MongoAssetModel.findOneAndUpdate(
      { id },
      {
        $set: updateFields,
        $unset: {
          currentAssigneeId: 1,
          currentAssigneeName: 1,
          currentAssigneeEmail: 1,
          currentAssigneeCode: 1,
          currentAssigneeDepartment: 1,
          currentAssigneeAvatar: 1,
          assignedDate: 1,
        },
        $push: { handoverHistory: recallRecord },
      },
      { new: true }
    ).lean();

    if (!updated) {
      throw new Error("Cập nhật thu hồi tài sản thất bại!");
    }

    return toSafeAsset(updated as unknown as IAssetDocument);
  },

  /**
   * Thống kê tài sản
   */
  async getStats(currentUser?: CurrentUserContext): Promise<AssetStats> {
    await ensureAssetsSeeded();

    const [total, inUse, available, maintenance, broken, allAssets] = await Promise.all([
      MongoAssetModel.countDocuments(),
      MongoAssetModel.countDocuments({ status: "in_use" }),
      MongoAssetModel.countDocuments({ status: "available" }),
      MongoAssetModel.countDocuments({ status: "maintenance" }),
      MongoAssetModel.countDocuments({ status: "broken" }),
      MongoAssetModel.find({}, { purchasePrice: 1 }).lean(),
    ]);

    const totalValue = allAssets.reduce((sum, item) => sum + (Number(item.purchasePrice) || 0), 0);

    return {
      total,
      inUse,
      available,
      maintenance,
      broken,
      totalValue,
    };
  },
};

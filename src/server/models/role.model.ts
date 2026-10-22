import { connectToDatabase } from "@/server/db";
import { MongoRoleModel, MongoUserModel, IRoleDocument } from "@/server/db/schema";
import { Role, CreateRoleInput, UpdateRoleInput, SystemPageItem } from "@/types";

export const SYSTEM_PAGES: SystemPageItem[] = [
  // 1. Tổng quan & Giao tiếp
  {
    path: "/dashboard",
    label: "Bảng điều khiển tổng quan",
    category: "overview",
    categoryLabel: "Tổng quan & Giao tiếp",
    description: "Thống kê hiệu quả hoạt động, KPI toàn công ty",
    icon: "📊",
  },
  {
    path: "/dashboard/chat",
    label: "Tin nhắn nội bộ",
    category: "overview",
    categoryLabel: "Tổng quan & Giao tiếp",
    description: "Trò chuyện trực tiếp 1-1, kênh phòng ban và nhóm chat",
    icon: "💬",
  },

  // 2. Kinh doanh & Đơn hàng
  {
    path: "/dashboard/orders",
    label: "Quản lý đơn hàng đa kênh",
    category: "sales",
    categoryLabel: "Kinh doanh & Bán hàng",
    description: "Đơn Shopee, TikTok, Lazada, Facebook, Zalo & POS",
    icon: "🛒",
  },
  {
    path: "/dashboard/customers",
    label: "Khách hàng & CRM",
    category: "sales",
    categoryLabel: "Kinh doanh & Bán hàng",
    description: "Hồ sơ khách hàng, lịch sử mua hàng và công nợ",
    icon: "👥",
  },
  {
    path: "/dashboard/suppliers",
    label: "Quản lý nhà cung cấp",
    category: "sales",
    categoryLabel: "Kinh doanh & Bán hàng",
    description: "Danh sách và đối soát đối tác cung ứng",
    icon: "🏢",
  },
  {
    path: "/dashboard/shopee-products",
    label: "Danh mục sản phẩm sàn",
    category: "sales",
    categoryLabel: "Kinh doanh & Bán hàng",
    description: "Thông tin và biến thể sản phẩm bán trên sàn TMĐT",
    icon: "🏷️",
  },
  {
    path: "/dashboard/shopee-logs",
    label: "Nhật ký đồng bộ Shopee",
    category: "sales",
    categoryLabel: "Kinh doanh & Bán hàng",
    description: "Lịch sử đồng bộ đơn hàng và sản phẩm từ Extension",
    icon: "🟠",
  },
  {
    path: "/dashboard/webhooks",
    label: "Cấu hình Webhook",
    category: "sales",
    categoryLabel: "Kinh doanh & Bán hàng",
    description: "Tích hợp nhận dữ liệu tự động bên thứ ba",
    icon: "⚡",
  },

  // 3. Tài chính & Kế toán
  {
    path: "/dashboard/debts",
    label: "Quản lý Công nợ",
    category: "finance",
    categoryLabel: "Tài chính & Công nợ",
    description: "Công nợ khách hàng, nhà cung cấp, thu nợ Sapo",
    icon: "💰",
  },
  {
    path: "/dashboard/expenses",
    label: "Chi tiêu nhập hàng & Đề xuất",
    category: "finance",
    categoryLabel: "Tài chính & Công nợ",
    description: "Quản lý chi phí đơn nhập kho NCC, biểu đồ dòng tiền và đề xuất nhập hàng",
    icon: "💸",
  },

  // 4. Kho vận & Kiện hàng
  {
    path: "/dashboard/inventory",
    label: "Quản lý Tồn kho",
    category: "warehouse",
    categoryLabel: "Kho vận & Kiện hàng",
    description: "Kiểm soát lượng tồn kho và cảnh báo thiếu hàng",
    icon: "🏬",
  },
  {
    path: "/dashboard/packages",
    label: "Quản lý Kiện hàng & QR",
    category: "warehouse",
    categoryLabel: "Kho vận & Kiện hàng",
    description: "Đóng kiện, in mã QR tem dán và quét mã camera",
    icon: "📦",
  },

  // 5. Vận hành & Công việc
  {
    path: "/dashboard/tasks",
    label: "Quản lý công việc & nhiệm vụ",
    category: "operations",
    categoryLabel: "Vận hành & Công việc",
    description: "Bảng Kanban, phân công việc và theo dõi tiến độ",
    icon: "📋",
  },
  {
    path: "/dashboard/assets",
    label: "Tài sản & Bàn giao",
    category: "operations",
    categoryLabel: "Vận hành & Công việc",
    description: "Quản lý thiết bị CNTT, bàn giao và thu hồi",
    icon: "💻",
  },

  // 6. Nhân sự & Chấm công
  {
    path: "/dashboard/attendance",
    label: "Chấm công trực tuyến",
    category: "hr",
    categoryLabel: "Nhân sự & Chấm công",
    description: "Điểm danh qua Wi-Fi/IP nội bộ và xem lịch cá nhân",
    icon: "⏱️",
  },
  {
    path: "/dashboard/attendance-management",
    label: "Dữ liệu chấm công toàn đơn vị",
    category: "hr",
    categoryLabel: "Nhân sự & Chấm công",
    description: "Bảng chấm công tổng thể nhân sự và xuất Excel",
    icon: "📑",
  },
  {
    path: "/dashboard/requests",
    label: "Nghỉ phép & Xin OT",
    category: "hr",
    categoryLabel: "Nhân sự & Chấm công",
    description: "Tạo đơn xin nghỉ phép, làm thêm giờ và xét duyệt",
    icon: "📝",
  },
  {
    path: "/dashboard/departments",
    label: "Quản lý Phòng ban",
    category: "hr",
    categoryLabel: "Nhân sự & Chấm công",
    description: "Cơ cấu phòng ban và chỉ định trưởng phòng",
    icon: "🏢",
  },
  {
    path: "/dashboard/users",
    label: "Quản lý Nhân sự / Tài khoản",
    category: "hr",
    categoryLabel: "Nhân sự & Chấm công",
    description: "Tài khoản nhân viên, mã nhân sự, cấp phép và quỹ phép",
    icon: "👤",
  },
  {
    path: "/dashboard/roles",
    label: "Vai trò & Phân quyền (RBAC)",
    category: "hr",
    categoryLabel: "Nhân sự & Chấm công",
    description: "Tạo vai trò và phân quyền truy cập pages theo role",
    icon: "🛡️",
  },

  // 7. Hệ thống & Cài đặt
  {
    path: "/dashboard/settings",
    label: "Cài đặt hệ thống (IP / Giờ làm)",
    category: "system",
    categoryLabel: "Hệ thống & Cài đặt",
    description: "Cấu hình dải IP chấm công và thiết lập thời gian làm việc",
    icon: "⚙️",
  },
  {
    path: "/dashboard/regulations",
    label: "Quy định công ty",
    category: "system",
    categoryLabel: "Hệ thống & Cài đặt",
    description: "Văn bản nội quy và chính sách khen thưởng kỷ luật",
    icon: "📖",
  },
  {
    path: "/dashboard/guide",
    label: "Hướng dẫn sử dụng",
    category: "system",
    categoryLabel: "Hệ thống & Cài đặt",
    description: "Cẩm nang tra cứu và tài liệu đào tạo nhân sự mới",
    icon: "💡",
  },
  {
    path: "/dashboard/profile",
    label: "Cài đặt tài khoản cá nhân",
    category: "system",
    categoryLabel: "Hệ thống & Cài đặt",
    description: "Đổi mật khẩu, xem thông tin tài khoản và giao diện",
    icon: "⚙️",
  },
];

const ALL_PAGE_PATHS = SYSTEM_PAGES.map((p) => p.path);

let rolesSeeded = false;

export async function ensureRolesSeeded() {
  if (rolesSeeded) return;
  await connectToDatabase();

  const count = await MongoRoleModel.countDocuments();
  if (count === 0) {
    const now = new Date().toISOString();

    const initialRoles: IRoleDocument[] = [
      {
        id: "director",
        name: "Giám Đốc",
        description: "Toàn quyền quản trị, điều hành và truy cập toàn bộ hệ thống",
        isSystem: true,
        allowedPages: [...ALL_PAGE_PATHS],
        defaultPage: "/dashboard",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "admin",
        name: "Quản Trị Viên",
        description: "Quản trị hệ thống, tài khoản, cấu hình kỹ thuật và dữ liệu",
        isSystem: true,
        allowedPages: [...ALL_PAGE_PATHS],
        defaultPage: "/dashboard",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "manager",
        name: "Trưởng Phòng",
        description: "Quản lý nghiệp vụ phòng ban, duyệt đơn từ, phân công công việc",
        isSystem: false,
        allowedPages: [
          "/dashboard/chat",
          "/dashboard/orders",
          "/dashboard/customers",
          "/dashboard/debts",
          "/dashboard/expenses",
          "/dashboard/suppliers",
          "/dashboard/inventory",
          "/dashboard/packages",
          "/dashboard/tasks",
          "/dashboard/assets",
          "/dashboard/attendance",
          "/dashboard/attendance-management",
          "/dashboard/requests",
          "/dashboard/departments",
          "/dashboard/regulations",
          "/dashboard/guide",
          "/dashboard/profile",
        ],
        defaultPage: "/dashboard/orders",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "accountant",
        name: "Kế Toán",
        description: "Quản lý công nợ khách hàng, nhà cung cấp, kiểm soát đơn hàng tài chính",
        isSystem: false,
        allowedPages: [
          "/dashboard/chat",
          "/dashboard/debts",
          "/dashboard/expenses",
          "/dashboard/orders",
          "/dashboard/customers",
          "/dashboard/suppliers",
          "/dashboard/tasks",
          "/dashboard/attendance",
          "/dashboard/requests",
          "/dashboard/regulations",
          "/dashboard/guide",
          "/dashboard/profile",
        ],
        defaultPage: "/dashboard/debts",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "warehouse",
        name: "Thủ Kho / Vận Đơn",
        description: "Quản lý tồn kho, đóng gói kiện hàng, in mã QR và quét mã vạch xuất nhập",
        isSystem: false,
        allowedPages: [
          "/dashboard/chat",
          "/dashboard/inventory",
          "/dashboard/packages",
          "/dashboard/expenses",
          "/dashboard/orders",
          "/dashboard/shopee-products",
          "/dashboard/tasks",
          "/dashboard/assets",
          "/dashboard/attendance",
          "/dashboard/requests",
          "/dashboard/regulations",
          "/dashboard/guide",
          "/dashboard/profile",
        ],
        defaultPage: "/dashboard/inventory",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sales",
        name: "Nhân Viên Kinh Doanh / Bán Hàng",
        description: "Xử lý đơn hàng đa kênh, chăm sóc khách hàng và kiểm tra sản phẩm",
        isSystem: false,
        allowedPages: [
          "/dashboard/chat",
          "/dashboard/orders",
          "/dashboard/customers",
          "/dashboard/shopee-products",
          "/dashboard/shopee-logs",
          "/dashboard/tasks",
          "/dashboard/attendance",
          "/dashboard/requests",
          "/dashboard/regulations",
          "/dashboard/guide",
          "/dashboard/profile",
        ],
        defaultPage: "/dashboard/orders",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "employee",
        name: "Nhân Viên",
        description: "Chấm công trực tuyến, làm việc theo phân công và gửi đơn từ",
        isSystem: false,
        allowedPages: [
          "/dashboard/chat",
          "/dashboard/tasks",
          "/dashboard/attendance",
          "/dashboard/requests",
          "/dashboard/regulations",
          "/dashboard/guide",
          "/dashboard/profile",
        ],
        defaultPage: "/dashboard/attendance",
        createdAt: now,
        updatedAt: now,
      },
    ];

    await MongoRoleModel.insertMany(initialRoles);
  }

  rolesSeeded = true;
}

export function toSafeRole(doc: IRoleDocument, userCount = 0): Role {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description || "",
    isSystem: Boolean(doc.isSystem),
    allowedPages: doc.allowedPages || [],
    defaultPage: doc.defaultPage || "/dashboard/attendance",
    userCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const RoleModel = {
  /**
   * Lấy danh sách toàn bộ roles kèm số lượng users của mỗi role
   */
  async getRoles(): Promise<Role[]> {
    await ensureRolesSeeded();

    const rolesDocs = await MongoRoleModel.find().sort({ isSystem: -1, createdAt: 1 }).lean();

    // Đếm số lượng nhân sự thuộc từng role
    const userRoleCounts = await MongoUserModel.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    userRoleCounts.forEach((item) => {
      if (item._id) countMap.set(String(item._id), item.count);
    });

    return rolesDocs.map((r) => toSafeRole(r, countMap.get(r.id) || 0));
  },

  /**
   * Lấy chi tiết một role
   */
  async getRoleById(roleId: string): Promise<Role | null> {
    await ensureRolesSeeded();

    const doc = await MongoRoleModel.findOne({ id: roleId }).lean();
    if (!doc) return null;

    const userCount = await MongoUserModel.countDocuments({ role: roleId });
    return toSafeRole(doc, userCount);
  },

  /**
   * Lấy danh sách quyền truy cập (allowedPages) theo role
   */
  async getAllowedPagesForRole(roleId: string): Promise<string[]> {
    await ensureRolesSeeded();

    if (roleId === "admin" || roleId === "director") {
      return [...ALL_PAGE_PATHS];
    }

    const doc = await MongoRoleModel.findOne({ id: roleId }).lean();
    if (!doc) {
      // Fallback nếu role chưa tạo trong DB
      return [
        "/dashboard/chat",
        "/dashboard/tasks",
        "/dashboard/attendance",
        "/dashboard/requests",
        "/dashboard/regulations",
        "/dashboard/guide",
        "/dashboard/profile",
      ];
    }

    // Luôn đảm bảo profile, regulations, guide được truy cập
    const safeSet = new Set(doc.allowedPages || []);
    safeSet.add("/dashboard/profile");
    safeSet.add("/dashboard/regulations");
    safeSet.add("/dashboard/guide");

    return Array.from(safeSet);
  },

  /**
   * Tạo role mới
   */
  async createRole(input: CreateRoleInput, currentUserRole: string): Promise<Role> {
    await ensureRolesSeeded();

    if (currentUserRole !== "admin" && currentUserRole !== "director") {
      throw new Error("Chỉ Quản trị viên hoặc Giám đốc mới có quyền tạo vai trò mới");
    }

    if (!input.name || !input.name.trim()) {
      throw new Error("Tên vai trò không được để trống");
    }

    // Tạo slug id nếu không truyền
    let roleId = (input.id || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!roleId) {
      roleId = input.name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/^_+|_+$/g, "");
    }

    if (!roleId) {
      roleId = `role_${Date.now()}`;
    }

    // Kiểm tra trùng mã role
    const existing = await MongoRoleModel.findOne({ id: roleId });
    if (existing) {
      throw new Error(`Mã vai trò '${roleId}' đã tồn tại, vui lòng chọn tên hoặc mã khác`);
    }

    const now = new Date().toISOString();

    // Chuẩn hóa allowedPages
    const pagesSet = new Set(input.allowedPages || []);
    pagesSet.add("/dashboard/profile");
    pagesSet.add("/dashboard/regulations");
    pagesSet.add("/dashboard/guide");

    const allowedPages = Array.from(pagesSet).filter((p) => ALL_PAGE_PATHS.includes(p));

    const defaultPage = input.defaultPage && allowedPages.includes(input.defaultPage)
      ? input.defaultPage
      : allowedPages[0] || "/dashboard/attendance";

    const newDoc: IRoleDocument = {
      id: roleId,
      name: input.name.trim(),
      description: input.description?.trim() || "",
      isSystem: false,
      allowedPages,
      defaultPage,
      createdAt: now,
      updatedAt: now,
    };

    const created = await MongoRoleModel.create(newDoc);
    return toSafeRole(created.toObject(), 0);
  },

  /**
   * Cập nhật role
   */
  async updateRole(roleId: string, input: UpdateRoleInput, currentUserRole: string): Promise<Role> {
    await ensureRolesSeeded();

    if (currentUserRole !== "admin" && currentUserRole !== "director") {
      throw new Error("Chỉ Quản trị viên hoặc Giám đốc mới có quyền chỉnh sửa vai trò");
    }

    const role = await MongoRoleModel.findOne({ id: roleId });
    if (!role) {
      throw new Error("Không tìm thấy vai trò cần chỉnh sửa");
    }

    const now = new Date().toISOString();

    if (input.name !== undefined && input.name.trim()) {
      role.name = input.name.trim();
    }

    if (input.description !== undefined) {
      role.description = input.description.trim();
    }

    // Với Admin và Director (System Role), quyền luôn là toàn bộ hệ thống
    if (role.id === "admin" || role.id === "director") {
      role.allowedPages = [...ALL_PAGE_PATHS];
      if (input.defaultPage) role.defaultPage = input.defaultPage;
    } else {
      if (input.allowedPages !== undefined) {
        const pagesSet = new Set(input.allowedPages);
        pagesSet.add("/dashboard/profile");
        pagesSet.add("/dashboard/regulations");
        pagesSet.add("/dashboard/guide");
        role.allowedPages = Array.from(pagesSet).filter((p) => ALL_PAGE_PATHS.includes(p));
      }

      if (input.defaultPage !== undefined) {
        if (role.allowedPages.includes(input.defaultPage)) {
          role.defaultPage = input.defaultPage;
        } else {
          role.defaultPage = role.allowedPages[0] || "/dashboard/attendance";
        }
      }
    }

    role.updatedAt = now;
    await role.save();

    const userCount = await MongoUserModel.countDocuments({ role: roleId });
    return toSafeRole(role.toObject(), userCount);
  },

  /**
   * Xóa role (Không cho phép xóa system role hoặc role đang có nhân sự sử dụng)
   */
  async deleteRole(roleId: string, currentUserRole: string): Promise<boolean> {
    await ensureRolesSeeded();

    if (currentUserRole !== "admin" && currentUserRole !== "director") {
      throw new Error("Chỉ Quản trị viên hoặc Giám đốc mới có quyền xóa vai trò");
    }

    const role = await MongoRoleModel.findOne({ id: roleId });
    if (!role) {
      throw new Error("Không tìm thấy vai trò cần xóa");
    }

    if (role.isSystem || role.id === "admin" || role.id === "director") {
      throw new Error("Không thể xóa các vai trò cốt lõi của hệ thống");
    }

    const userCount = await MongoUserModel.countDocuments({ role: roleId });
    if (userCount > 0) {
      throw new Error(
        `Không thể xóa vai trò này vì đang có ${userCount} nhân sự được gán vai trò này. Vui lòng chuyển đổi vai trò cho nhân sự trước.`
      );
    }

    await MongoRoleModel.deleteOne({ id: roleId });
    return true;
  },
};

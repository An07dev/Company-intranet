import crypto from "crypto";
import { User, UserRole, UserStatus, ContractType, CreateUserInput, UpdateUserInput } from "@/types";
import { connectToDatabase } from "@/server/db";
import { MongoUserModel, IUserDocument } from "@/server/db/schema";

export type UserDocument = IUserDocument;

// Hàm băm mật khẩu bảo mật (PBKDF2 HMAC-SHA256)
export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex");
  return calculated === hash;
}

// Khởi tạo tài khoản mẫu với đầy đủ 4 roles chính
const initialSalt = "company_internal_salt_2026";
const initialAdminHash = hashPassword("admin123", initialSalt).hash;
const initialDirectorHash = hashPassword("director123", initialSalt).hash;
const initialManagerHash = hashPassword("manager123", initialSalt).hash;
const initialEmployeeHash = hashPassword("employee123", initialSalt).hash;

const INITIAL_SEED_USERS: IUserDocument[] = [
  {
    id: "usr_admin_01",
    employeeCode: "ADM-001",
    name: "Nguyễn Văn Admin",
    email: "admin@company.internal",
    passwordHash: initialAdminHash,
    salt: initialSalt,
    role: "admin",
    phone: "0901234567",
    department: "Ban Công Nghệ & Quản Trị Hệ Thống",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr_dir_01",
    employeeCode: "GD-001",
    name: "Trịnh Gia Giám Đốc",
    email: "director@company.internal",
    passwordHash: initialDirectorHash,
    salt: initialSalt,
    role: "director",
    phone: "0909998888",
    department: "Ban Giám Đốc",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "usr_mgr_01",
    employeeCode: "QL-001",
    name: "Trần Thị Quản Lý",
    email: "manager@company.internal",
    passwordHash: initialManagerHash,
    salt: initialSalt,
    role: "manager",
    phone: "0912345678",
    department: "Phòng Kỹ Thuật & Vận Hành",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "usr_emp_01",
    employeeCode: "NV-001",
    name: "Lê Hoàng Nhân Viên",
    email: "employee@company.internal",
    passwordHash: initialEmployeeHash,
    salt: initialSalt,
    role: "employee",
    phone: "0987654321",
    department: "Bộ Phận Phát Triển Sản Phẩm",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "usr_emp_02",
    employeeCode: "NV-002",
    name: "Phạm Tuấn Anh",
    email: "tuananh@company.internal",
    passwordHash: initialEmployeeHash,
    salt: initialSalt,
    role: "employee",
    phone: "0912233445",
    department: "Phòng Kinh Doanh",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: "2026-02-05T00:00:00.000Z",
    updatedAt: "2026-02-05T00:00:00.000Z",
  },
  {
    id: "usr_emp_03",
    employeeCode: "NV-003",
    name: "Đặng Thu Hà",
    email: "thuha@company.internal",
    passwordHash: initialEmployeeHash,
    salt: initialSalt,
    role: "employee",
    phone: "0933445566",
    department: "Phòng Marketing & Truyền Thông",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: "2026-02-10T00:00:00.000Z",
    updatedAt: "2026-02-10T00:00:00.000Z",
  },
  {
    id: "usr_emp_04",
    employeeCode: "NV-004",
    name: "Vũ Quốc Bảo",
    email: "quocbao@company.internal",
    passwordHash: initialEmployeeHash,
    salt: initialSalt,
    role: "employee",
    phone: "0944556677",
    department: "Bộ Phận Phát Triển Sản Phẩm",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: "2026-02-12T00:00:00.000Z",
    updatedAt: "2026-02-12T00:00:00.000Z",
  },
  {
    id: "usr_emp_05",
    employeeCode: "NV-005",
    name: "Ngô Mai Lan",
    email: "mailan@company.internal",
    passwordHash: initialEmployeeHash,
    salt: initialSalt,
    role: "employee",
    phone: "0966778899",
    department: "Phòng Nhân Sự & Đào Tạo",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: "2026-02-15T00:00:00.000Z",
    updatedAt: "2026-02-15T00:00:00.000Z",
  },
  {
    id: "usr_emp_06",
    employeeCode: "NV-006",
    name: "Bùi Hoàng Nam",
    email: "hoangnam@company.internal",
    passwordHash: initialEmployeeHash,
    salt: initialSalt,
    role: "employee",
    phone: "0977889900",
    department: "Phòng Kinh Doanh",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: "2026-02-18T00:00:00.000Z",
    updatedAt: "2026-02-18T00:00:00.000Z",
  },
  {
    id: "usr_emp_07",
    employeeCode: "NV-007",
    name: "Hoàng Thu Trang",
    email: "thutrang@company.internal",
    passwordHash: initialEmployeeHash,
    salt: initialSalt,
    role: "employee",
    phone: "0988990011",
    department: "Phòng Tài Chính - Kế Toán",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    status: "active",
    createdAt: "2026-02-20T00:00:00.000Z",
    updatedAt: "2026-02-20T00:00:00.000Z",
  },
  {
    id: "usr_emp_08",
    employeeCode: "NV-008",
    name: "Đỗ Hùng Dũng",
    email: "hungdung@company.internal",
    passwordHash: initialEmployeeHash,
    salt: initialSalt,
    role: "employee",
    phone: "0922334455",
    department: "Phòng Kỹ Thuật & Vận Hành",
    avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    status: "active",
    contractType: "probation",
    createdAt: "2026-02-22T00:00:00.000Z",
    updatedAt: "2026-02-22T00:00:00.000Z",
  },
  {
    id: "usr_mgr_02",
    employeeCode: "QL-002",
    name: "Nguyễn Hải Đăng",
    email: "haidang@company.internal",
    passwordHash: initialManagerHash,
    salt: initialSalt,
    role: "manager",
    phone: "0933221100",
    department: "Phòng Kinh Doanh",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    status: "active",
    contractType: "official",
    officialStartDate: "2026-01-15",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
];

let usersSeeded = false;
export async function ensureUsersSeeded() {
  if (usersSeeded) return;
  await connectToDatabase();
  for (const seed of INITIAL_SEED_USERS) {
    const existing = await MongoUserModel.findOne({ email: seed.email });
    if (!existing) {
      await MongoUserModel.create({
        ...seed,
        contractType: seed.contractType || "official",
        officialStartDate: seed.officialStartDate || seed.createdAt?.slice(0, 10),
      });
    } else {
      let changed = false;
      if (!existing.employeeCode) {
        existing.employeeCode = seed.employeeCode;
        changed = true;
      }
      if (!existing.contractType) {
        existing.contractType = seed.contractType || "official";
        changed = true;
      }
      if (seed.contractType === "probation" && existing.contractType !== "probation" && existing.id === "usr_emp_08") {
        existing.contractType = "probation";
        changed = true;
      }
      if (seed.officialStartDate && !existing.officialStartDate && existing.contractType === "official") {
        existing.officialStartDate = seed.officialStartDate;
        changed = true;
      }
      if (changed) {
        await existing.save();
      }
    }
  }
  usersSeeded = true;
}

/**
 * Loại bỏ passwordHash và salt trước khi trả về Client
 */
export function toSafeUser(doc: IUserDocument): User {
  return {
    id: doc.id,
    employeeCode: doc.employeeCode,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    phone: doc.phone,
    department: doc.department,
    avatarUrl: doc.avatarUrl,
    status: doc.status,
    contractType: doc.contractType || "official",
    officialStartDate: doc.officialStartDate,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * DB Model Methods với MongoDB
 */
export const UserModel = {
  /**
   * Lấy danh sách users có hỗ trợ filter theo Role, Tìm kiếm và Phân trang
   */
  async findAll(params?: {
    role?: UserRole;
    search?: string;
    status?: UserStatus;
    contractType?: ContractType;
    page?: number;
    limit?: number;
  }): Promise<{ items: User[]; total: number; page: number; limit: number; totalPages: number }> {
    await ensureUsersSeeded();

    const query: Record<string, unknown> = {};

    if (params?.role) {
      query.role = params.role;
    }

    if (params?.status) {
      query.status = params.status;
    }

    if (params?.contractType) {
      query.contractType = params.contractType;
    }

    if (params?.search) {
      const q = params.search.trim();
      const regex = new RegExp(q, "i");
      query.$or = [
        { name: regex },
        { email: regex },
        { employeeCode: regex },
        { department: regex },
      ];
    }

    const total = await MongoUserModel.countDocuments(query);
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, params?.limit || 20);
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;

    const docs = await MongoUserModel.find(query)
      .sort({ createdAt: -1 })
      .skip(start)
      .limit(limit)
      .lean();

    return {
      items: docs.map(toSafeUser),
      total,
      page,
      limit,
      totalPages,
    };
  },

  /**
   * Tìm user theo ID
   */
  async findById(id: string): Promise<User | null> {
    await ensureUsersSeeded();
    const doc = await MongoUserModel.findOne({ id }).lean();
    return doc ? toSafeUser(doc) : null;
  },

  /**
   * Tìm UserDocument (gồm password) theo Email để xác thực Auth
   */
  async findDocumentByEmail(email: string): Promise<UserDocument | null> {
    await ensureUsersSeeded();
    const normalized = email.trim().toLowerCase();
    const doc = await MongoUserModel.findOne({ email: normalized }).lean();
    return doc || null;
  },

  /**
   * Tạo user mới trong MongoDB
   */
  async create(input: CreateUserInput): Promise<User> {
    await ensureUsersSeeded();
    const normalizedEmail = input.email.trim().toLowerCase();

    // Kiểm tra trùng email
    const exists = await MongoUserModel.findOne({ email: normalizedEmail });
    if (exists) {
      throw new Error(`Email "${input.email}" đã tồn tại trong hệ thống.`);
    }

    const rawPassword = input.password || "company123";
    const { hash, salt } = hashPassword(rawPassword);

    const totalCount = await MongoUserModel.countDocuments();
    const codePrefix =
      input.role === "admin"
        ? "ADM"
        : input.role === "director"
        ? "GD"
        : input.role === "manager"
        ? "QL"
        : "NV";
    const employeeCode =
      input.employeeCode?.trim() || `${codePrefix}-${String(totalCount + 1).padStart(3, "0")}`;

    const now = new Date().toISOString();
    const contractType = input.contractType || "official";
    const officialStartDate =
      contractType === "official"
        ? input.officialStartDate || now.slice(0, 10)
        : undefined;

    const newDoc = await MongoUserModel.create({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employeeCode,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: hash,
      salt,
      role: input.role,
      phone: input.phone?.trim(),
      department: input.department?.trim(),
      avatarUrl: input.avatarUrl,
      status: input.status || "active",
      contractType,
      officialStartDate,
      createdAt: now,
      updatedAt: now,
    });

    // Tự động đồng bộ vào nhóm chat phòng ban và nhóm chat toàn công ty
    try {
      const { syncUserDepartmentChat } = await import("@/server/models/chat.model");
      await syncUserDepartmentChat(newDoc.id, newDoc.department);
    } catch (chatErr) {
      console.error("Lỗi đồng bộ nhóm chat cho user mới:", chatErr);
    }

    return toSafeUser(newDoc);
  },

  /**
   * Cập nhật thông tin user trong MongoDB
   */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    await ensureUsersSeeded();
    const current = await MongoUserModel.findOne({ id });
    if (!current) return null;

    const oldDept = current.department;

    // Nếu đổi email, kiểm tra xem email mới có trùng ai khác không
    if (input.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (normalizedEmail !== current.email.toLowerCase()) {
        const duplicate = await MongoUserModel.findOne({ email: normalizedEmail, id: { $ne: id } });
        if (duplicate) {
          throw new Error(`Email "${input.email}" đã được sử dụng bởi người dùng khác.`);
        }
        current.email = normalizedEmail;
      }
    }

    if (input.employeeCode !== undefined) current.employeeCode = input.employeeCode.trim();
    if (input.name !== undefined) current.name = input.name.trim();
    if (input.role !== undefined) current.role = input.role;
    if (input.phone !== undefined) current.phone = input.phone?.trim();
    if (input.department !== undefined) current.department = input.department?.trim();
    if (input.avatarUrl !== undefined) current.avatarUrl = input.avatarUrl;
    if (input.status !== undefined) current.status = input.status;

    if (input.contractType !== undefined) {
      current.contractType = input.contractType;
      if (input.contractType === "probation") {
        current.officialStartDate = undefined;
      }
    }
    if (input.officialStartDate !== undefined) {
      if (current.contractType === "official") {
        current.officialStartDate = input.officialStartDate;
      }
    }

    if (input.password) {
      const { hash, salt } = hashPassword(input.password);
      current.passwordHash = hash;
      current.salt = salt;
    }

    current.updatedAt = new Date().toISOString();
    await current.save();

    // Nếu phòng ban thay đổi, cập nhật rút khỏi nhóm chat cũ và tham gia nhóm chat mới
    if (input.department !== undefined && input.department !== oldDept) {
      try {
        const { syncUserDepartmentChat } = await import("@/server/models/chat.model");
        await syncUserDepartmentChat(id, input.department, oldDept);
      } catch (chatErr) {
        console.error("Lỗi đồng bộ nhóm chat khi cập nhật user:", chatErr);
      }
    }

    return toSafeUser(current.toObject());
  },

  /**
   * Xóa user trong MongoDB
   */
  async delete(id: string): Promise<boolean> {
    await ensureUsersSeeded();
    const res = await MongoUserModel.deleteOne({ id });
    return res.deletedCount > 0;
  },

  /**
   * Cập nhật thông tin hồ sơ cá nhân của người dùng
   */
  async updateProfile(
    userId: string,
    input: { name?: string; phone?: string; avatarUrl?: string }
  ): Promise<User> {
    await ensureUsersSeeded();
    const current = await MongoUserModel.findOne({ id: userId });
    if (!current) {
      throw new Error(`Không tìm thấy người dùng với ID: ${userId}`);
    }

    if (input.name !== undefined && input.name.trim()) {
      current.name = input.name.trim();
    }
    if (input.phone !== undefined) {
      current.phone = input.phone.trim();
    }
    if (input.avatarUrl !== undefined) {
      current.avatarUrl = input.avatarUrl.trim();
    }

    current.updatedAt = new Date().toISOString();
    await current.save();

    return toSafeUser(current.toObject());
  },

  /**
   * Thay đổi mật khẩu người dùng
   */
  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<void> {
    await ensureUsersSeeded();
    const current = await MongoUserModel.findOne({ id: userId });
    if (!current) {
      throw new Error(`Không tìm thấy người dùng với ID: ${userId}`);
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = verifyPassword(currentPass, current.passwordHash, current.salt);
    if (!isMatch) {
      throw new Error("Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.");
    }

    if (!newPass || newPass.length < 6) {
      throw new Error("Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.");
    }

    if (currentPass === newPass) {
      throw new Error("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
    }

    const { hash, salt } = hashPassword(newPass);
    current.passwordHash = hash;
    current.salt = salt;
    current.updatedAt = new Date().toISOString();
    await current.save();
  },
};

import crypto from "crypto";
import { User, UserRole, UserStatus, ContractType, CreateUserInput, UpdateUserInput } from "@/types";
import { connectToDatabase } from "@/server/db";
import { MongoUserModel, MongoDepartmentModel, IUserDocument } from "@/server/db/schema";

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
    name: "Quản Trị Viên (Admin)",
    email: "admin@company.internal",
    passwordHash: initialAdminHash,
    salt: initialSalt,
    role: "admin",
    phone: "0901234567",
    department: "Ban Quản Trị Hệ Thống",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "active",
    contractType: "official",
    officialStartDate: "2026-01-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
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
    customLeaveDays: doc.customLeaveDays ?? 0,
    workShiftName: doc.workShiftName,
    workStartTime: doc.workStartTime,
    workEndTime: doc.workEndTime,
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

    const { MongoRoleModel } = await import("@/server/db/schema");
    const roles = await MongoRoleModel.find().lean();
    const roleNameMap = new Map<string, string>();
    roles.forEach((r) => roleNameMap.set(r.id, r.name));

    const items = docs.map((d) => {
      const u = toSafeUser(d);
      u.roleName = roleNameMap.get(d.role) || d.role;
      return u;
    });

    return {
      items,
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
    if (!doc) return null;

    const safeUser = toSafeUser(doc);
    const { RoleModel } = await import("@/server/models/role.model");
    const role = await RoleModel.getRoleById(doc.role);
    if (role) {
      safeUser.roleName = role.name;
      safeUser.allowedPages = role.allowedPages;
      safeUser.defaultPage = role.defaultPage;
    } else {
      safeUser.allowedPages = await RoleModel.getAllowedPagesForRole(doc.role);
    }

    return safeUser;
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

    // Chuẩn hóa và đồng bộ phòng ban với collection departments
    let finalDeptName = input.department?.trim();
    if (finalDeptName && finalDeptName !== "Khác") {
      const deptDoc = await MongoDepartmentModel.findOne({
        name: { $regex: new RegExp(`^${finalDeptName}$`, "i") },
      });
      if (deptDoc) {
        finalDeptName = deptDoc.name;
      } else {
        // Tự động tạo phòng ban mới nếu người dùng nhập phòng ban mới
        try {
          const { DepartmentModel } = await import("@/server/models/department.model");
          const deptCode =
            finalDeptName
              .split(" ")
              .map((w: string) => w[0]?.toUpperCase() || "")
              .join("")
              .slice(0, 6) || "DEPT";

          await DepartmentModel.create({
            name: finalDeptName,
            code: deptCode,
            description: `Phòng ban ${finalDeptName}`,
          });
        } catch (deptErr) {
          console.error("Lỗi tự động tạo phòng ban mới khi thêm user:", deptErr);
        }
      }
    }

    const newDoc = await MongoUserModel.create({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employeeCode,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: hash,
      salt,
      role: input.role,
      phone: input.phone?.trim(),
      department: finalDeptName,
      avatarUrl: input.avatarUrl,
      status: input.status || "active",
      contractType,
      officialStartDate,
      customLeaveDays: Math.max(0, Number(input.customLeaveDays) || 0),
      workShiftName: input.workShiftName?.trim() || undefined,
      workStartTime: input.workStartTime?.trim() || undefined,
      workEndTime: input.workEndTime?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Nếu tạo user với vai trò manager và phòng ban chưa có manager, tự động gán
    if (newDoc.role === "manager" && finalDeptName) {
      const dept = await MongoDepartmentModel.findOne({ name: finalDeptName });
      if (dept && !dept.managerId) {
        dept.managerId = newDoc.id;
        dept.updatedAt = now;
        await dept.save();
      }
    }

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
    const current = await MongoUserModel.findOne({ id }).lean();
    if (!current) return null;

    const oldDept = current.department;
    const $set: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    const $unset: Record<string, string> = {};

    // Nếu đổi email, kiểm tra xem email mới có trùng ai khác không
    if (input.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (normalizedEmail !== current.email.toLowerCase()) {
        const duplicate = await MongoUserModel.findOne({ email: normalizedEmail, id: { $ne: id } });
        if (duplicate) {
          throw new Error(`Email "${input.email}" đã được sử dụng bởi người dùng khác.`);
        }
        $set.email = normalizedEmail;
      }
    }

    if (input.employeeCode !== undefined) $set.employeeCode = input.employeeCode.trim();
    if (input.name !== undefined) $set.name = input.name.trim();
    if (input.role !== undefined) $set.role = input.role;
    if (input.phone !== undefined) $set.phone = input.phone?.trim();
    if (input.department !== undefined) {
      let updatedDept = input.department?.trim();
      if (updatedDept && updatedDept !== "Khác") {
        const deptDoc = await MongoDepartmentModel.findOne({
          name: { $regex: new RegExp(`^${updatedDept}$`, "i") },
        });
        if (deptDoc) {
          updatedDept = deptDoc.name;
        }
      }
      $set.department = updatedDept;
    }
    if (input.avatarUrl !== undefined) $set.avatarUrl = input.avatarUrl;
    if (input.status !== undefined) $set.status = input.status;

    if (input.contractType !== undefined) {
      $set.contractType = input.contractType;
      if (input.contractType === "probation") {
        $unset.officialStartDate = "";
      }
    }
    if (input.officialStartDate !== undefined) {
      const activeContract = input.contractType || current.contractType;
      if (activeContract === "official") {
        $set.officialStartDate = input.officialStartDate;
      }
    }
    if (input.customLeaveDays !== undefined) {
      $set.customLeaveDays = Math.max(0, Number(input.customLeaveDays) || 0);
    }

    // Cập nhật ca làm việc: Nếu có giá trị -> $set, nếu rỗng -> $unset (quay về mặc định công ty)
    if (input.workShiftName !== undefined) {
      if (input.workShiftName?.trim()) {
        $set.workShiftName = input.workShiftName.trim();
      } else {
        $unset.workShiftName = "";
      }
    }
    if (input.workStartTime !== undefined) {
      if (input.workStartTime?.trim()) {
        $set.workStartTime = input.workStartTime.trim();
      } else {
        $unset.workStartTime = "";
      }
    }
    if (input.workEndTime !== undefined) {
      if (input.workEndTime?.trim()) {
        $set.workEndTime = input.workEndTime.trim();
      } else {
        $unset.workEndTime = "";
      }
    }

    if (input.password) {
      const { hash, salt } = hashPassword(input.password);
      $set.passwordHash = hash;
      $set.salt = salt;
    }

    const updateQuery: Record<string, unknown> = { $set };
    if (Object.keys($unset).length > 0) {
      updateQuery.$unset = $unset;
    }

    await MongoUserModel.collection.updateOne({ id }, updateQuery);

    // Nếu phòng ban thay đổi, cập nhật rút khỏi nhóm chat cũ và tham gia nhóm chat mới
    if (input.department !== undefined && input.department !== oldDept) {
      try {
        const { syncUserDepartmentChat } = await import("@/server/models/chat.model");
        await syncUserDepartmentChat(id, input.department, oldDept);
      } catch (chatErr) {
        console.error("Lỗi đồng bộ nhóm chat khi cập nhật user:", chatErr);
      }
    }

    const freshUser = await MongoUserModel.findOne({ id }).lean();
    return freshUser ? toSafeUser(freshUser) : null;
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
    input: { name?: string; email?: string; phone?: string; avatarUrl?: string }
  ): Promise<User> {
    await ensureUsersSeeded();
    const current = await MongoUserModel.findOne({ id: userId });
    if (!current) {
      throw new Error(`Không tìm thấy người dùng với ID: ${userId}`);
    }

    if (input.email !== undefined && input.email.trim()) {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (normalizedEmail !== current.email.toLowerCase()) {
        const duplicate = await MongoUserModel.findOne({ email: normalizedEmail, id: { $ne: userId } });
        if (duplicate) {
          throw new Error(`Email "${input.email}" đã được sử dụng bởi người dùng khác.`);
        }
        current.email = normalizedEmail;
      }
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

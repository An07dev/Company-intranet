import { connectToDatabase } from "@/server/db";
import { MongoDepartmentModel, MongoUserModel, MongoRequestModel, IDepartmentDocument } from "@/server/db/schema";
import {
  Department,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  AdjustDepartmentMembersInput,
  User,
} from "@/types";
import { toSafeUser } from "@/server/models/user.model";
import {
  createDepartmentConversation,
  addMembersToDepartmentChat,
  removeMembersFromDepartmentChat,
  updateDepartmentChatInfo,
  deleteDepartmentChat,
} from "@/server/models/chat.model";

const INITIAL_DEPARTMENTS: Omit<IDepartmentDocument, "createdAt" | "updatedAt">[] = [
  {
    id: "dept_bgd_01",
    name: "Ban Giám Đốc",
    code: "BGD",
    description: "Bộ phận hoạch định chiến lược phát triển, điều hành toàn diện các hoạt động của công ty.",
    location: "Tầng 8 - Tòa nhà Trụ sở chính",
    managerId: "usr_dir_01",
  },
  {
    id: "dept_cntt_01",
    name: "Ban Công Nghệ & Quản Trị Hệ Thống",
    code: "CNTT",
    description: "Quản trị hạ tầng mạng, bảo mật thông tin, kiến trúc hệ thống và hỗ trợ kỹ thuật toàn doanh nghiệp.",
    location: "Tầng 5 - Tòa nhà A",
    managerId: "usr_admin_01",
  },
  {
    id: "dept_ktvh_01",
    name: "Phòng Kỹ Thuật & Vận Hành",
    code: "KT-VH",
    description: "Đảm bảo tính ổn định và tính sẵn sàng của hệ thống máy chủ, dịch vụ sản xuất và vận hành 24/7.",
    location: "Tầng 4 - Tòa nhà A",
    managerId: "usr_mgr_01",
  },
  {
    id: "dept_spdev_01",
    name: "Bộ Phận Phát Triển Sản Phẩm",
    code: "SP-DEV",
    description: "Nghiên cứu, thiết kế trải nghiệm người dùng và phát triển các phần mềm, sản phẩm công nghệ.",
    location: "Tầng 4 - Tòa nhà B",
  },
  {
    id: "dept_kd_01",
    name: "Phòng Kinh Doanh",
    code: "KD",
    description: "Mở rộng thị trường, phát triển quan hệ đối tác khách hàng và đẩy mạnh doanh thu dịch vụ.",
    location: "Tầng 2 - Tòa nhà A",
    managerId: "usr_mgr_02",
  },
  {
    id: "dept_mkt_01",
    name: "Phòng Marketing & Truyền Thông",
    code: "MKT",
    description: "Xây dựng thương hiệu, chiến dịch quảng bá, sự kiện và truyền thông đối ngoại - nội bộ.",
    location: "Tầng 2 - Tòa nhà B",
  },
  {
    id: "dept_tckt_01",
    name: "Phòng Tài Chính - Kế Toán",
    code: "TC-KT",
    description: "Quản lý dòng tiền, báo cáo thuế, tài chính doanh nghiệp, tiền lương và chế độ cho nhân viên.",
    location: "Tầng 3 - Tòa nhà A",
  },
  {
    id: "dept_nshr_01",
    name: "Phòng Nhân Sự & Đào Tạo",
    code: "NS-HR",
    description: "Tuyển dụng nhân tài, quản trị văn hóa doanh nghiệp, đào tạo phát triển năng lực và quan hệ lao động.",
    location: "Tầng 3 - Tòa nhà B",
  },
];

let departmentsSeeded = false;

export async function ensureDepartmentsSeeded() {
  if (departmentsSeeded) return;
  await connectToDatabase();

  const count = await MongoDepartmentModel.countDocuments();
  if (count === 0) {
    const now = new Date().toISOString();
    for (const d of INITIAL_DEPARTMENTS) {
      await MongoDepartmentModel.create({
        ...d,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  departmentsSeeded = true;
}

/**
 * Nâng vai trò của nhân sự lên "manager" (Trưởng phòng) nếu đang là "employee"
 * và đảm bảo user thuộc đúng phòng ban.
 */
async function promoteToManager(userId: string, departmentName: string, now: string) {
  const user = await MongoUserModel.findOne({ id: userId });
  if (!user) return;

  user.department = departmentName;
  user.updatedAt = now;
  if (user.role === "employee") {
    user.role = "manager";
  }
  await user.save();
  await MongoRequestModel.updateMany(
    { userId },
    { $set: { department: departmentName, updatedAt: now } }
  );
}

/**
 * Nếu Trưởng phòng cũ không còn làm trưởng phòng của bất kỳ phòng ban nào khác,
 * và role đang là "manager", thì chuyển vai trò trở về "employee".
 */
async function demoteOldManagerIfApplicable(oldManagerId: string, currentDeptId: string, now: string) {
  if (!oldManagerId) return;

  const managesOther = await MongoDepartmentModel.findOne({
    managerId: oldManagerId,
    id: { $ne: currentDeptId },
  });

  if (!managesOther) {
    const user = await MongoUserModel.findOne({ id: oldManagerId });
    if (user && user.role === "manager") {
      user.role = "employee";
      user.updatedAt = now;
      await user.save();
    }
  }
}

export const DepartmentModel = {
  /**
   * Lấy danh sách tất cả phòng ban kèm thông tin trưởng phòng và nhân sự
   */
  async findAll(params?: { search?: string }): Promise<Department[]> {
    await ensureDepartmentsSeeded();

    const query: Record<string, unknown> = {};
    if (params?.search?.trim()) {
      const regex = new RegExp(params.search.trim(), "i");
      query.$or = [{ name: regex }, { code: regex }, { description: regex }, { location: regex }];
    }

    const deptDocs = await MongoDepartmentModel.find(query).sort({ code: 1 }).lean();
    const allUsers = await MongoUserModel.find({ status: "active" }).lean();

    return deptDocs.map((doc) => {
      // Tìm thành viên thuộc phòng ban
      const members = allUsers
        .filter((u) => u.department && u.department.toLowerCase() === doc.name.toLowerCase())
        .map(toSafeUser);

      // Tìm thông tin Trưởng phòng nếu có
      let managerUser: User | undefined;
      if (doc.managerId) {
        const found = allUsers.find((u) => u.id === doc.managerId);
        if (found) managerUser = toSafeUser(found);
      }

      return {
        id: doc.id,
        name: doc.name,
        code: doc.code,
        description: doc.description,
        location: doc.location,
        managerId: doc.managerId,
        managerName: managerUser?.name,
        managerAvatar: managerUser?.avatarUrl,
        managerEmail: managerUser?.email,
        manager: managerUser,
        memberCount: members.length,
        members,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });
  },

  /**
   * Tìm phòng ban theo ID kèm danh sách thành viên đầy đủ
   */
  async findById(id: string): Promise<Department | null> {
    await ensureDepartmentsSeeded();
    const doc = await MongoDepartmentModel.findOne({ id }).lean();
    if (!doc) return null;

    const allUsers = await MongoUserModel.find().lean();
    const members = allUsers
      .filter((u) => u.department && u.department.toLowerCase() === doc.name.toLowerCase())
      .map(toSafeUser);

    let managerUser: User | undefined;
    if (doc.managerId) {
      const found = allUsers.find((u) => u.id === doc.managerId);
      if (found) managerUser = toSafeUser(found);
    }

    return {
      id: doc.id,
      name: doc.name,
      code: doc.code,
      description: doc.description,
      location: doc.location,
      managerId: doc.managerId,
      managerName: managerUser?.name,
      managerAvatar: managerUser?.avatarUrl,
      managerEmail: managerUser?.email,
      manager: managerUser,
      memberCount: members.length,
      members,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },

  /**
   * Tạo phòng ban mới
   */
  async create(input: CreateDepartmentInput): Promise<Department> {
    await ensureDepartmentsSeeded();

    const normalizedName = input.name.trim();
    const normalizedCode = input.code.trim().toUpperCase();

    // Kiểm tra trùng tên hoặc mã
    const existing = await MongoDepartmentModel.findOne({
      $or: [{ name: normalizedName }, { code: normalizedCode }],
    });
    if (existing) {
      if (existing.name.toLowerCase() === normalizedName.toLowerCase()) {
        throw new Error(`Phòng ban với tên "${normalizedName}" đã tồn tại.`);
      }
      throw new Error(`Mã phòng ban "${normalizedCode}" đã tồn tại.`);
    }

    const now = new Date().toISOString();
    const newId = `dept_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const newDoc = await MongoDepartmentModel.create({
      id: newId,
      name: normalizedName,
      code: normalizedCode,
      description: input.description?.trim(),
      location: input.location?.trim(),
      managerId: input.managerId || undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Nếu chỉ định trưởng phòng, nâng role từ employee lên manager và cập nhật phòng ban
    if (input.managerId) {
      await promoteToManager(input.managerId, normalizedName, now);
    }

    // Tự động tạo nhóm chat phòng ban tương ứng
    try {
      await createDepartmentConversation({
        id: newDoc.id,
        name: newDoc.name,
        code: newDoc.code,
        managerId: newDoc.managerId,
      });
    } catch (chatErr) {
      console.error("Lỗi tự động tạo nhóm chat phòng ban:", chatErr);
    }

    return this.findById(newDoc.id) as Promise<Department>;
  },

  /**
   * Cập nhật thông tin phòng ban
   */
  async update(id: string, input: UpdateDepartmentInput): Promise<Department | null> {
    await ensureDepartmentsSeeded();
    const current = await MongoDepartmentModel.findOne({ id });
    if (!current) return null;

    const oldName = current.name;

    if (input.name && input.name.trim() !== current.name) {
      const normalizedName = input.name.trim();
      const duplicate = await MongoDepartmentModel.findOne({
        name: normalizedName,
        id: { $ne: id },
      });
      if (duplicate) {
        throw new Error(`Phòng ban với tên "${normalizedName}" đã tồn tại.`);
      }
      current.name = normalizedName;

      // Cập nhật tên phòng ban cho tất cả nhân viên thuộc phòng ban cũ
      await MongoUserModel.updateMany(
        { department: oldName },
        { $set: { department: normalizedName, updatedAt: new Date().toISOString() } }
      );
      // Cập nhật tên phòng ban cho tất cả đơn yêu cầu thuộc phòng ban cũ
      await MongoRequestModel.updateMany(
        { department: oldName },
        { $set: { department: normalizedName, updatedAt: new Date().toISOString() } }
      );
    }

    if (input.code && input.code.trim().toUpperCase() !== current.code) {
      const normalizedCode = input.code.trim().toUpperCase();
      const duplicate = await MongoDepartmentModel.findOne({
        code: normalizedCode,
        id: { $ne: id },
      });
      if (duplicate) {
        throw new Error(`Mã phòng ban "${normalizedCode}" đã tồn tại.`);
      }
      current.code = normalizedCode;
    }

    if (input.description !== undefined) current.description = input.description.trim();
    if (input.location !== undefined) current.location = input.location.trim();
    if (input.managerId !== undefined) {
      const oldManagerId = current.managerId;
      const newManagerId = input.managerId || undefined;
      current.managerId = newManagerId;

      if (newManagerId) {
        await promoteToManager(newManagerId, current.name, new Date().toISOString());
      }

      if (oldManagerId && oldManagerId !== newManagerId) {
        await demoteOldManagerIfApplicable(oldManagerId, id, new Date().toISOString());
      }
    }

    current.updatedAt = new Date().toISOString();
    await current.save();

    // Đồng bộ thông tin nhóm chat phòng ban nếu tên hoặc trưởng phòng thay đổi
    try {
      await updateDepartmentChatInfo(id, current.name, current.managerId);
    } catch (chatErr) {
      console.error("Lỗi cập nhật nhóm chat phòng ban:", chatErr);
    }

    return this.findById(id);
  },

  /**
   * Xóa phòng ban
   */
  async delete(id: string): Promise<boolean> {
    await ensureDepartmentsSeeded();
    const current = await MongoDepartmentModel.findOne({ id });
    if (!current) return false;

    const now = new Date().toISOString();

    // Nếu có trưởng phòng, kiểm tra hạ vai trò nếu không còn quản lý phòng nào khác
    if (current.managerId) {
      await demoteOldManagerIfApplicable(current.managerId, id, now);
    }

    // Chuyển các nhân viên thuộc phòng ban này sang "Khác"
    await MongoUserModel.updateMany(
      { department: current.name },
      { $set: { department: "Khác", updatedAt: now } }
    );
    // Chuyển các đơn từ thuộc phòng ban này sang "Khác"
    await MongoRequestModel.updateMany(
      { department: current.name },
      { $set: { department: "Khác", updatedAt: now } }
    );

    const res = await MongoDepartmentModel.deleteOne({ id });

    // Tự động xóa hoặc gỡ kênh chat phòng ban tương ứng
    try {
      await deleteDepartmentChat(id);
    } catch (chatErr) {
      console.error("Lỗi xóa nhóm chat phòng ban:", chatErr);
    }

    return res.deletedCount > 0;
  },

  /**
   * Điều chỉnh nhân sự trong phòng ban (Thêm, Xóa, Bổ nhiệm Trưởng phòng)
   */
  async adjustMembers(
    deptId: string,
    input: AdjustDepartmentMembersInput
  ): Promise<Department> {
    await ensureDepartmentsSeeded();
    const dept = await MongoDepartmentModel.findOne({ id: deptId });
    if (!dept) {
      throw new Error(`Không tìm thấy phòng ban với mã ID: ${deptId}`);
    }

    const now = new Date().toISOString();

    if (input.action === "add") {
      // Thêm các user vào phòng ban này
      if (input.userIds.length > 0) {
        await MongoUserModel.updateMany(
          { id: { $in: input.userIds } },
          { $set: { department: dept.name, updatedAt: now } }
        );
        // Đồng bộ phòng ban của nhân viên sang các đơn từ của họ
        await MongoRequestModel.updateMany(
          { userId: { $in: input.userIds } },
          { $set: { department: dept.name, updatedAt: now } }
        );

        // ĐỒNG THỜI tự động thêm nhân sự vào nhóm chat phòng ban
        try {
          await addMembersToDepartmentChat(deptId, input.userIds);
        } catch (chatErr) {
          console.error("Lỗi tự động thêm nhân sự vào nhóm chat phòng ban:", chatErr);
        }
      }
    } else if (input.action === "remove") {
      // Rút các user khỏi phòng ban này -> chuyển sang "Khác"
      if (input.userIds.length > 0) {
        await MongoUserModel.updateMany(
          { id: { $in: input.userIds } },
          { $set: { department: "Khác", updatedAt: now } }
        );
        // Đồng bộ phòng ban về "Khác" cho các đơn từ của nhân sự bị rút
        await MongoRequestModel.updateMany(
          { userId: { $in: input.userIds } },
          { $set: { department: "Khác", updatedAt: now } }
        );

        // ĐỒNG THỜI rút nhân sự khỏi nhóm chat phòng ban
        try {
          await removeMembersFromDepartmentChat(deptId, input.userIds);
        } catch (chatErr) {
          console.error("Lỗi rút nhân sự khỏi nhóm chat phòng ban:", chatErr);
        }

        // Nếu trong danh sách xóa có Trưởng phòng hiện tại, hủy vai trò trưởng phòng và hạ role nếu cần
        if (dept.managerId && input.userIds.includes(dept.managerId)) {
          const oldManagerId = dept.managerId;
          dept.managerId = undefined;
          dept.updatedAt = now;
          await dept.save();
          await demoteOldManagerIfApplicable(oldManagerId, deptId, now);
        }
      }
    } else if (input.action === "set_manager") {
      // Bổ nhiệm trưởng phòng: Nâng role từ employee lên manager
      const oldManagerId = dept.managerId;
      const newManagerId = input.userIds[0];

      if (newManagerId) {
        dept.managerId = newManagerId;
        dept.updatedAt = now;
        await dept.save();

        // Nâng role của người được bổ nhiệm lên "manager" và cập nhật phòng ban
        await promoteToManager(newManagerId, dept.name, now);

        // Đảm bảo trưởng phòng có mặt trong nhóm chat phòng ban
        try {
          await addMembersToDepartmentChat(deptId, [newManagerId]);
        } catch (chatErr) {
          console.error("Lỗi thêm trưởng phòng vào nhóm chat phòng ban:", chatErr);
        }
      } else {
        // Hủy bổ nhiệm trưởng phòng
        dept.managerId = undefined;
        dept.updatedAt = now;
        await dept.save();
      }

      // Nếu trưởng phòng cũ bị thay thế hoặc hủy bỏ, hạ role về employee nếu không quản lý phòng khác
      if (oldManagerId && oldManagerId !== newManagerId) {
        await demoteOldManagerIfApplicable(oldManagerId, deptId, now);
      }
    }

    const updated = await this.findById(deptId);
    if (!updated) throw new Error("Lỗi khi tải lại thông tin phòng ban");
    return updated;
  },
};

import { connectToDatabase } from "@/server/db";
import { MongoTaskModel, MongoUserModel, ITaskDocument } from "@/server/db/schema";
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilterParams, UserRole } from "@/types";

export function toSafeTask(doc: ITaskDocument, latestAssigneeAvatar?: string, latestCreatorAvatar?: string): Task {
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description || "",
    department: doc.department,

    creatorId: doc.creatorId,
    creatorName: doc.creatorName,
    creatorRole: doc.creatorRole,
    creatorAvatar: latestCreatorAvatar || doc.creatorAvatar,

    assigneeId: doc.assigneeId,
    assigneeName: doc.assigneeName,
    assigneeEmail: doc.assigneeEmail,
    assigneeCode: doc.assigneeCode,
    assigneeRole: doc.assigneeRole,
    assigneeAvatar: latestAssigneeAvatar || doc.assigneeAvatar,
    assigneeDepartment: doc.assigneeDepartment,

    status: doc.status,
    priority: doc.priority,
    dueDate: doc.dueDate,
    progress: doc.progress || 0,
    checklist: doc.checklist || [],
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

let tasksSeeded = false;

export async function ensureTasksSeeded() {
  if (tasksSeeded) return;
  await connectToDatabase();

  const count = await MongoTaskModel.countDocuments();
  if (count === 0) {
    const allUsers = await MongoUserModel.find({ status: "active" }).lean();
    if (allUsers.length > 0) {
      const admin = allUsers.find((u) => u.role === "admin") || allUsers[0];
      const director = allUsers.find((u) => u.role === "director") || allUsers[0];
      const manager = allUsers.find((u) => u.role === "manager") || allUsers[0];
      const employees = allUsers.filter((u) => u.role === "employee");
      const emp1 = employees[0] || allUsers[0];
      const emp2 = employees[1] || allUsers[0];

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const next3DaysStr = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      const past2DaysStr = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

      const initialTasks: Partial<ITaskDocument>[] = [
        {
          id: `task_${Date.now()}_1`,
          title: "Nâng cấp cơ sở hạ tầng bảo mật mạng nội bộ",
          description: "Rà soát toàn bộ các tường lửa, phân quyền VPN và cập nhật chứng chỉ SSL cho hệ thống.",
          department: admin.department || "Ban Công Nghệ & Quản Trị Hệ Thống",
          creatorId: director.id,
          creatorName: director.name,
          creatorRole: director.role,
          creatorAvatar: director.avatarUrl,
          assigneeId: admin.id,
          assigneeName: admin.name,
          assigneeEmail: admin.email,
          assigneeCode: admin.employeeCode,
          assigneeRole: admin.role,
          assigneeAvatar: admin.avatarUrl,
          assigneeDepartment: admin.department,
          status: "in_progress",
          priority: "urgent",
          dueDate: next3DaysStr,
          progress: 60,
          checklist: [
            { id: "c1", title: "Kiểm tra cấu hình Firewall Fortinet", completed: true },
            { id: "c2", title: "Cập nhật SSL Wildcard cert", completed: true },
            { id: "c3", title: "Báo cáo nghiệm thu an ninh mạng", completed: false },
          ],
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `task_${Date.now()}_2`,
          title: "Tối ưu hóa hiệu năng giao diện Dashboard trên Mobile",
          description: "Khắc phục tình trạng cuộn ngang bảng dữ liệu và cải thiện tốc độ render các biểu đồ thống kê.",
          department: manager.department || "Phòng Kỹ Thuật & Vận Hành",
          creatorId: manager.id,
          creatorName: manager.name,
          creatorRole: manager.role,
          creatorAvatar: manager.avatarUrl,
          assigneeId: emp1.id,
          assigneeName: emp1.name,
          assigneeEmail: emp1.email,
          assigneeCode: emp1.employeeCode,
          assigneeRole: emp1.role,
          assigneeAvatar: emp1.avatarUrl,
          assigneeDepartment: emp1.department || manager.department,
          status: "in_progress",
          priority: "high",
          dueDate: nextWeekStr,
          progress: 40,
          checklist: [
            { id: "c1", title: "Chuyển Table sang Card View trên màn hình < 640px", completed: true },
            { id: "c2", title: "Tối ưu lại kích thước ảnh avatar", completed: false },
            { id: "c3", title: "Kiểm thử trải nghiệm trên iOS Safari và Android Chrome", completed: false },
          ],
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `task_${Date.now()}_3`,
          title: "Lập báo cáo tổng kết chấm công & OT tháng",
          description: "Xuất dữ liệu chấm công tháng vừa qua, đối soát số giờ làm việc thực tế và làm thêm giờ.",
          department: emp2.department || manager.department || "Ban Giám Đốc",
          creatorId: emp2.id,
          creatorName: emp2.name,
          creatorRole: emp2.role,
          creatorAvatar: emp2.avatarUrl,
          assigneeId: emp2.id,
          assigneeName: emp2.name,
          assigneeEmail: emp2.email,
          assigneeCode: emp2.employeeCode,
          assigneeRole: emp2.role,
          assigneeAvatar: emp2.avatarUrl,
          assigneeDepartment: emp2.department,
          status: "completed",
          priority: "medium",
          dueDate: past2DaysStr,
          progress: 100,
          completedAt: new Date(Date.now() - 86400000).toISOString(),
          checklist: [
            { id: "c1", title: "Xuất file Excel từ hệ thống", completed: true },
            { id: "c2", title: "Gửi báo cáo cho Trưởng bộ phận", completed: true },
          ],
          createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `task_${Date.now()}_4`,
          title: "Xây dựng tài liệu hướng dẫn sử dụng cổng thông tin nội bộ",
          description: "Biên soạn cẩm nang hướng dẫn cho nhân sự mới về quy trình điểm danh trực tuyến và nộp đơn từ xét duyệt.",
          department: director.department || "Ban Giám Đốc",
          creatorId: director.id,
          creatorName: director.name,
          creatorRole: director.role,
          creatorAvatar: director.avatarUrl,
          assigneeId: emp1.id,
          assigneeName: emp1.name,
          assigneeEmail: emp1.email,
          assigneeCode: emp1.employeeCode,
          assigneeRole: emp1.role,
          assigneeAvatar: emp1.avatarUrl,
          assigneeDepartment: emp1.department,
          status: "todo",
          priority: "medium",
          dueDate: nextWeekStr,
          progress: 0,
          checklist: [
            { id: "c1", title: "Soạn thảo khung tài liệu PDF", completed: false },
            { id: "c2", title: "Chụp ảnh màn hình các tính năng", completed: false },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `task_${Date.now()}_5`,
          title: "Kiểm toán bảo mật & rà soát tài khoản truy cập quý",
          description: "Khóa các tài khoản ngưng hoạt động, kiểm tra các quyền quản trị cao cấp.",
          department: admin.department || "Ban Công Nghệ & Quản Trị Hệ Thống",
          creatorId: admin.id,
          creatorName: admin.name,
          creatorRole: admin.role,
          creatorAvatar: admin.avatarUrl,
          assigneeId: admin.id,
          assigneeName: admin.name,
          assigneeEmail: admin.email,
          assigneeCode: admin.employeeCode,
          assigneeRole: admin.role,
          assigneeAvatar: admin.avatarUrl,
          assigneeDepartment: admin.department,
          status: "review",
          priority: "high",
          dueDate: todayStr,
          progress: 85,
          checklist: [
            { id: "c1", title: "Xuất danh sách tài khoản active", completed: true },
            { id: "c2", title: "Trình ký biên bản kiểm toán", completed: false },
          ],
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await MongoTaskModel.insertMany(initialTasks);
    }
  }
  tasksSeeded = true;
}

export interface CurrentUserContext {
  id: string;
  name: string;
  email: string;
  employeeCode?: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
}

export const TaskModel = {
  /**
   * Lấy danh sách công việc theo phân quyền và bộ lọc
   */
  async getTasks(
    filters: TaskFilterParams,
    currentUser: CurrentUserContext
  ): Promise<{ items: Task[]; total: number; page: number; limit: number; totalPages: number }> {
    await ensureTasksSeeded();

    const query: Record<string, unknown> = {};

    // 1. Phân quyền truy cập theo vai trò và tab
    const isDirectorOrAdmin = currentUser.role === "admin" || currentUser.role === "director";
    const isManager = currentUser.role === "manager";

    if (isDirectorOrAdmin) {
      // Giám đốc & Admin: Toàn quyền xem công việc toàn công ty
      if (filters.tab === "assigned_to_me") {
        query.assigneeId = currentUser.id;
      } else if (filters.tab === "created_by_me") {
        query.creatorId = currentUser.id;
      }
    } else if (isManager) {
      if (filters.tab === "assigned_to_me") {
        query.assigneeId = currentUser.id;
      } else if (filters.tab === "created_by_me") {
        query.creatorId = currentUser.id;
      } else {
        // Mặc định hoặc tab department: xem việc trong phòng ban mình hoặc việc của mình
        if (currentUser.department) {
          query.$or = [
            { department: currentUser.department },
            { assigneeDepartment: currentUser.department },
            { assigneeId: currentUser.id },
            { creatorId: currentUser.id },
          ];
        } else {
          query.$or = [{ assigneeId: currentUser.id }, { creatorId: currentUser.id }];
        }
      }
    } else {
      // Nhân viên (Employee): Chỉ xem việc do mình tự tạo hoặc được giao cho mình
      if (filters.tab === "assigned_to_me") {
        query.assigneeId = currentUser.id;
      } else if (filters.tab === "created_by_me") {
        query.creatorId = currentUser.id;
      } else {
        query.$or = [{ assigneeId: currentUser.id }, { creatorId: currentUser.id }];
      }
    }

    // 2. Bộ lọc theo phòng ban (Đặc biệt dành cho Admin & Giám đốc tìm việc đã giao theo từng phòng)
    if (filters.department && filters.department !== "all") {
      const targetDept = filters.department.trim();
      const deptRegex = new RegExp(`^${targetDept}$`, "i");
      query.department = deptRegex;
    }

    // 2. Bộ lọc trạng thái
    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    // 3. Bộ lọc mức độ ưu tiên
    if (filters.priority && filters.priority !== "all") {
      query.priority = filters.priority;
    }

    // 4. Tìm kiếm từ khóa
    if (filters.search && filters.search.trim()) {
      const regex = new RegExp(filters.search.trim(), "i");
      const searchConditions = [
        { title: regex },
        { description: regex },
        { assigneeName: regex },
        { creatorName: regex },
        { department: regex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(500, filters.limit || 200));
    const skip = (page - 1) * limit;

    const total = await MongoTaskModel.countDocuments(query);
    const docs = await MongoTaskModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Lấy avatar mới nhất từ bảng users
    const userIds = new Set<string>();
    docs.forEach((d) => {
      if (d.assigneeId) userIds.add(d.assigneeId);
      if (d.creatorId) userIds.add(d.creatorId);
    });

    const users = await MongoUserModel.find({ id: { $in: Array.from(userIds) } })
      .select("id avatarUrl")
      .lean();

    const avatarMap = new Map<string, string>();
    users.forEach((u) => {
      if (u.avatarUrl) avatarMap.set(u.id, u.avatarUrl);
    });

    return {
      items: docs.map((d) => toSafeTask(d, avatarMap.get(d.assigneeId), avatarMap.get(d.creatorId))),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Tạo công việc mới kèm kiểm tra phân quyền chặt chẽ
   */
  async createTask(input: CreateTaskInput, currentUser: CurrentUserContext): Promise<Task> {
    await ensureTasksSeeded();

    if (!input.title || !input.title.trim()) {
      throw new Error("Tiêu đề công việc không được để trống");
    }

    let targetAssigneeId = input.assigneeId || currentUser.id;

    // Xác định thông tin Người nhận việc (Assignee)
    let targetAssigneeUser = await MongoUserModel.findOne({ id: targetAssigneeId }).lean();
    if (!targetAssigneeUser) {
      targetAssigneeId = currentUser.id;
      targetAssigneeUser = await MongoUserModel.findOne({ id: currentUser.id }).lean();
    }

    if (!targetAssigneeUser) {
      throw new Error("Không tìm thấy thông tin người thực hiện");
    }

    // Theo quy định mới: Mọi người đều có thể giao việc cho bất kỳ ai (nhân viên giao cho nhân viên khác phòng ban, nhân viên giao cho sếp)

    const taskDepartment =
      input.department?.trim() ||
      targetAssigneeUser.department ||
      currentUser.department ||
      "Toàn công ty";

    const now = new Date().toISOString();
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const checklistItems = (input.checklist || []).map((c, idx) => ({
      id: `chk_${Date.now()}_${idx}`,
      title: c.title.trim(),
      completed: Boolean(c.completed),
    }));

    const newDoc: ITaskDocument = {
      id: taskId,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      department: taskDepartment,

      creatorId: currentUser.id,
      creatorName: currentUser.name,
      creatorRole: currentUser.role,
      creatorAvatar: currentUser.avatarUrl,

      assigneeId: targetAssigneeUser.id,
      assigneeName: targetAssigneeUser.name,
      assigneeEmail: targetAssigneeUser.email,
      assigneeCode: targetAssigneeUser.employeeCode,
      assigneeRole: targetAssigneeUser.role,
      assigneeAvatar: targetAssigneeUser.avatarUrl,
      assigneeDepartment: targetAssigneeUser.department,

      status: "todo",
      priority: input.priority || "medium",
      dueDate: input.dueDate || undefined,
      progress: 0,
      checklist: checklistItems,
      createdAt: now,
      updatedAt: now,
    };

    const created = await MongoTaskModel.create(newDoc);
    return toSafeTask(created.toObject(), targetAssigneeUser.avatarUrl, currentUser.avatarUrl);
  },

  /**
   * Cập nhật công việc (thông tin, trạng thái, tiến độ, checklist)
   */
  async updateTask(
    taskId: string,
    input: UpdateTaskInput,
    currentUser: CurrentUserContext
  ): Promise<Task> {
    await ensureTasksSeeded();

    const task = await MongoTaskModel.findOne({ id: taskId });
    if (!task) {
      throw new Error("Không tìm thấy công việc");
    }

    // Kiểm tra quyền chỉnh sửa
    const isOwner = task.creatorId === currentUser.id;
    const isAssignee = task.assigneeId === currentUser.id;
    const isDirectorOrAdmin = currentUser.role === "admin" || currentUser.role === "director";
    const isDeptManager =
      currentUser.role === "manager" &&
      currentUser.department &&
      (currentUser.department.toLowerCase() === task.department.toLowerCase() ||
        currentUser.department.toLowerCase() === (task.assigneeDepartment || "").toLowerCase());

    if (!isOwner && !isAssignee && !isDirectorOrAdmin && !isDeptManager) {
      throw new Error("Bạn không có quyền chỉnh sửa công việc này");
    }

    const now = new Date().toISOString();

    if (input.title !== undefined && input.title.trim()) {
      task.title = input.title.trim();
    }
    if (input.description !== undefined) {
      task.description = input.description.trim();
    }
    if (input.priority !== undefined) {
      task.priority = input.priority;
    }
    if (input.dueDate !== undefined) {
      task.dueDate = input.dueDate;
    }

    // Cập nhật người nhận việc mới nếu có quyền
    if (input.assigneeId && input.assigneeId !== task.assigneeId) {
      if (!isOwner && !isDirectorOrAdmin && !isDeptManager) {
        throw new Error("Chỉ người giao việc, Trưởng phòng hoặc Ban giám đốc mới được chuyển giao việc cho người khác");
      }

      const newAssignee = await MongoUserModel.findOne({ id: input.assigneeId }).lean();
      if (newAssignee) {
        task.assigneeId = newAssignee.id;
        task.assigneeName = newAssignee.name;
        task.assigneeEmail = newAssignee.email;
        task.assigneeCode = newAssignee.employeeCode;
        task.assigneeRole = newAssignee.role;
        task.assigneeAvatar = newAssignee.avatarUrl;
        task.assigneeDepartment = newAssignee.department;
      }
    }

    // Cập nhật trạng thái
    if (input.status !== undefined) {
      task.status = input.status;
      if (input.status === "completed") {
        task.progress = 100;
        task.completedAt = now;
      } else if (task.status !== "completed") {
        task.completedAt = undefined;
      }
    }

    // Cập nhật tiến độ
    if (input.progress !== undefined) {
      task.progress = Math.max(0, Math.min(100, Math.round(input.progress)));
      if (task.progress === 100 && task.status !== "completed") {
        task.status = "completed";
        task.completedAt = now;
      }
    }

    // Cập nhật checklist
    if (input.checklist !== undefined) {
      task.checklist = input.checklist;
      // Tự động tính toán progress dựa trên checklist nếu có items
      if (task.checklist.length > 0) {
        const completedCount = task.checklist.filter((c) => c.completed).length;
        task.progress = Math.round((completedCount / task.checklist.length) * 100);
        if (task.progress === 100 && task.status !== "completed") {
          task.status = "completed";
          task.completedAt = now;
        } else if (task.progress < 100 && task.status === "completed") {
          task.status = "in_progress";
          task.completedAt = undefined;
        }
      }
    }

    task.updatedAt = now;
    await task.save();

    return toSafeTask(task.toObject());
  },

  /**
   * Xóa công việc
   */
  async deleteTask(taskId: string, currentUser: CurrentUserContext): Promise<boolean> {
    await ensureTasksSeeded();

    const task = await MongoTaskModel.findOne({ id: taskId });
    if (!task) {
      throw new Error("Không tìm thấy công việc");
    }

    const isOwner = task.creatorId === currentUser.id;
    const isDirectorOrAdmin = currentUser.role === "admin" || currentUser.role === "director";
    const isDeptManager =
      currentUser.role === "manager" &&
      currentUser.department &&
      currentUser.department.toLowerCase() === task.department.toLowerCase();

    if (!isOwner && !isDirectorOrAdmin && !isDeptManager) {
      throw new Error("Bạn không có quyền xóa công việc này");
    }

    await MongoTaskModel.deleteOne({ id: taskId });
    return true;
  },

  /**
   * Lấy thống kê số lượng công việc (KPI card counts)
   */
  async getStats(currentUser: CurrentUserContext) {
    await ensureTasksSeeded();

    const isDirectorOrAdmin = currentUser.role === "admin" || currentUser.role === "director";
    const isManager = currentUser.role === "manager";

    const baseQuery: Record<string, unknown> = {};
    if (isDirectorOrAdmin) {
      // toàn bộ
    } else if (isManager && currentUser.department) {
      baseQuery.$or = [
        { department: currentUser.department },
        { assigneeDepartment: currentUser.department },
        { assigneeId: currentUser.id },
        { creatorId: currentUser.id },
      ];
    } else {
      baseQuery.$or = [{ assigneeId: currentUser.id }, { creatorId: currentUser.id }];
    }

    const [total, todo, inProgress, review, completed] = await Promise.all([
      MongoTaskModel.countDocuments(baseQuery),
      MongoTaskModel.countDocuments({ ...baseQuery, status: "todo" }),
      MongoTaskModel.countDocuments({ ...baseQuery, status: "in_progress" }),
      MongoTaskModel.countDocuments({ ...baseQuery, status: "review" }),
      MongoTaskModel.countDocuments({ ...baseQuery, status: "completed" }),
    ]);

    const todayStr = new Date().toISOString().slice(0, 10);
    const overdue = await MongoTaskModel.countDocuments({
      ...baseQuery,
      status: { $nin: ["completed", "cancelled"] },
      dueDate: { $lt: todayStr },
    });

    return {
      total,
      todo,
      inProgress,
      review,
      completed,
      overdue,
    };
  },
};

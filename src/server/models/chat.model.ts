import { connectToDatabase } from "@/server/db";
import {
  MongoChatConversationModel,
  MongoChatMessageModel,
  MongoUserModel,
  MongoDepartmentModel,
  IChatConversationDocument,
  IChatMessageDocument,
} from "@/server/db/schema";
import {
  ChatConversation,
  ChatMessage,
  SendMessageInput,
  CreateGroupConversationInput,
  UpdateGroupConversationInput,
  User,
} from "@/types";
import { toSafeUser } from "./user.model";

let chatSeeded = false;

/**
 * Đảm bảo các kênh chat mặc định:
 * 1. Kênh "Toàn Công Ty" (company)
 * 2. Kênh từng "Phòng Ban" (department)
 */
export async function ensureDefaultConversations() {
  if (chatSeeded) return;
  await connectToDatabase();

  const now = new Date().toISOString();
  const allUsers = await MongoUserModel.find({ status: "active" }).lean();
  const allUserIds = allUsers.map((u) => u.id);

  // 1. Kênh Toàn Công Ty
  let companyConv = await MongoChatConversationModel.findOne({ type: "company" });
  if (!companyConv) {
    companyConv = await MongoChatConversationModel.create({
      id: "conv_company_general",
      type: "company",
      name: "Toàn Công Ty (Chung)",
      avatar: "🏢",
      memberIds: allUserIds,
      lastMessage: {
        content: "Chào mừng các thành viên đến với kênh thảo luận chung của công ty!",
        senderId: "system",
        senderName: "Hệ Thống",
        createdAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Tạo tin nhắn chào mừng
    await MongoChatMessageModel.create({
      id: `msg_welcome_${Date.now()}`,
      conversationId: companyConv.id,
      senderId: "system",
      senderName: "Hệ Thống Doanh Nghiệp",
      senderRole: "admin",
      content: "Chào mừng toàn thể cán bộ nhân viên đến với kênh chat chung toàn công ty!",
      isReadBy: [],
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // Đảm bảo mọi user đều nằm trong kênh công ty
    await MongoChatConversationModel.updateOne(
      { id: companyConv.id },
      { $addToSet: { memberIds: { $each: allUserIds } } }
    );
  }

  // 2. Kênh từng Phòng Ban
  const allDepts = await MongoDepartmentModel.find().lean();
  const privilegedUserIds = allUsers
    .filter((u) => u.role === "admin" || u.role === "director")
    .map((u) => u.id);

  for (const dept of allDepts) {
    const deptMembers = allUsers
      .filter((u) => u.department && u.department.toLowerCase() === dept.name.toLowerCase())
      .map((u) => u.id);

    // Kênh phòng ban luôn bao gồm nhân sự phòng ban + Ban Giám Đốc + Admin
    const memberSet = new Set([...deptMembers, ...privilegedUserIds]);
    if (dept.managerId) {
      memberSet.add(dept.managerId);
    }
    const finalMemberIds = Array.from(memberSet);

    let deptConv = await MongoChatConversationModel.findOne({
      type: "department",
      departmentId: dept.id,
    });

    if (!deptConv) {
      deptConv = await MongoChatConversationModel.create({
        id: `conv_dept_${dept.code.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        type: "department",
        name: `Phòng ${dept.name}`,
        departmentId: dept.id,
        departmentName: dept.name,
        avatar: "💼",
        memberIds: finalMemberIds,
        lastMessage: {
          content: `Kênh trao đổi nội bộ của ${dept.name}`,
          senderId: "system",
          senderName: "Hệ Thống",
          createdAt: now,
        },
        createdAt: now,
        updatedAt: now,
      });

      await MongoChatMessageModel.create({
        id: `msg_dept_welcome_${dept.id}`,
        conversationId: deptConv.id,
        senderId: "system",
        senderName: "Hệ Thống Doanh Nghiệp",
        senderRole: "admin",
        content: `Chào mừng các thành viên đến với kênh trao đổi nội bộ phòng ${dept.name}!`,
        isReadBy: [],
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Đồng bộ tên phòng ban và đảm bảo thành viên cùng Admin & Giám đốc luôn có trong nhóm
      await MongoChatConversationModel.updateOne(
        { id: deptConv.id },
        {
          $set: { departmentName: dept.name, name: `Phòng ${dept.name}` },
          $addToSet: { memberIds: { $each: finalMemberIds } },
        }
      );
    }
  }

  chatSeeded = true;
}

/**
 * Tự động tạo hoặc đồng bộ kênh chat tương ứng khi một phòng ban được tạo mới
 */
export async function createDepartmentConversation(dept: {
  id: string;
  name: string;
  code: string;
  managerId?: string;
}): Promise<void> {
  await connectToDatabase();
  const now = new Date().toISOString();

  // Tìm tất cả nhân sự đang thuộc phòng ban này và các tài khoản Admin / Giám đốc
  const privilegedUsers = await MongoUserModel.find({
    role: { $in: ["admin", "director"] },
    status: "active",
  }).lean();
  const members = await MongoUserModel.find({
    department: { $regex: new RegExp(`^${dept.name}$`, "i") },
    status: "active",
  }).lean();
  const memberSet = new Set([
    ...members.map((m) => m.id),
    ...privilegedUsers.map((p) => p.id),
  ]);
  if (dept.managerId) {
    memberSet.add(dept.managerId);
  }
  const memberIds = Array.from(memberSet);

  const lowerName = dept.name.toLowerCase();
  const displayName =
    lowerName.startsWith("phòng ") || lowerName.startsWith("ban ") || lowerName.startsWith("bộ phận ")
      ? dept.name
      : `Phòng ${dept.name}`;

  let deptConv = await MongoChatConversationModel.findOne({
    type: "department",
    $or: [{ departmentId: dept.id }, { departmentName: dept.name }],
  });

  const convId = `conv_dept_${dept.code.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  if (!deptConv) {
    deptConv = await MongoChatConversationModel.create({
      id: convId,
      type: "department",
      name: displayName,
      departmentId: dept.id,
      departmentName: dept.name,
      avatar: "💼",
      memberIds,
      lastMessage: {
        content: `Kênh trao đổi nội bộ ${displayName}`,
        senderId: "system",
        senderName: "Hệ Thống",
        createdAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Tin nhắn chào mừng khởi tạo
    await MongoChatMessageModel.create({
      id: `msg_dept_welcome_${dept.id}_${Date.now()}`,
      conversationId: deptConv.id,
      senderId: "system",
      senderName: "Hệ Thống Doanh Nghiệp",
      senderRole: "admin",
      content: `Chào mừng các thành viên đến với kênh trao đổi nội bộ ${displayName}!`,
      isReadBy: [],
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await MongoChatConversationModel.updateOne(
      { id: deptConv.id },
      {
        $set: {
          departmentId: dept.id,
          departmentName: dept.name,
          name: displayName,
          updatedAt: now,
        },
        $addToSet: {
          memberIds: { $each: memberIds },
        },
      }
    );
  }
}

/**
 * Tự động thêm nhân sự vào kênh chat phòng ban khi được phân bổ vào phòng ban
 */
export async function addMembersToDepartmentChat(
  deptId: string,
  userIds: string[]
): Promise<void> {
  if (!userIds || userIds.length === 0) return;
  await connectToDatabase();

  let deptConv = await MongoChatConversationModel.findOne({
    type: "department",
    departmentId: deptId,
  });

  if (!deptConv) {
    const dept = await MongoDepartmentModel.findOne({ id: deptId }).lean();
    if (dept) {
      await createDepartmentConversation(dept);
      deptConv = await MongoChatConversationModel.findOne({
        type: "department",
        departmentId: deptId,
      });
    }
  }

  if (!deptConv) return;

  const now = new Date().toISOString();

  // Thêm thành viên vào danh sách memberIds của kênh chat phòng ban
  await MongoChatConversationModel.updateOne(
    { id: deptConv.id },
    {
      $addToSet: { memberIds: { $each: userIds } },
      $set: { updatedAt: now },
    }
  );

  // Lấy danh sách tên nhân sự vừa được thêm để gửi thông báo tin nhắn hệ thống
  const addedUsers = await MongoUserModel.find({ id: { $in: userIds } }).lean();
  const userNames = addedUsers.map((u) => u.name).join(", ");

  if (userNames) {
    const notifyContent = `Thành viên [${userNames}] đã tham gia kênh chat phòng ban.`;
    await MongoChatMessageModel.create({
      id: `msg_sys_add_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: deptConv.id,
      senderId: "system",
      senderName: "Hệ Thống Doanh Nghiệp",
      senderRole: "admin",
      content: notifyContent,
      isReadBy: [],
      createdAt: now,
      updatedAt: now,
    });

    await MongoChatConversationModel.updateOne(
      { id: deptConv.id },
      {
        $set: {
          lastMessage: {
            content: notifyContent,
            senderId: "system",
            senderName: "Hệ Thống Doanh Nghiệp",
            createdAt: now,
          },
        },
      }
    );
  }
}

/**
 * Rút nhân sự khỏi kênh chat phòng ban khi được điều chuyển hoặc gỡ khỏi phòng ban
 */
export async function removeMembersFromDepartmentChat(
  deptId: string,
  userIds: string[]
): Promise<void> {
  if (!userIds || userIds.length === 0) return;
  await connectToDatabase();

  // Không rút Admin và Giám Đốc khỏi kênh chat phòng ban
  const protectedUsers = await MongoUserModel.find({
    id: { $in: userIds },
    role: { $in: ["admin", "director"] },
  }).lean();
  const protectedIds = new Set(protectedUsers.map((u) => u.id));
  const effectiveRemoveIds = userIds.filter((id) => !protectedIds.has(id));

  if (effectiveRemoveIds.length === 0) return;

  const deptConv = await MongoChatConversationModel.findOne({
    type: "department",
    departmentId: deptId,
  });

  if (!deptConv) return;

  const now = new Date().toISOString();

  // Rút thành viên khỏi danh sách memberIds
  await MongoChatConversationModel.updateOne(
    { id: deptConv.id },
    {
      $pull: { memberIds: { $in: effectiveRemoveIds } },
      $set: { updatedAt: now },
    }
  );

  const removedUsers = await MongoUserModel.find({ id: { $in: effectiveRemoveIds } }).lean();
  const userNames = removedUsers.map((u) => u.name).join(", ");

  if (userNames) {
    const notifyContent = `Thành viên [${userNames}] đã rời khỏi kênh chat phòng ban.`;
    await MongoChatMessageModel.create({
      id: `msg_sys_rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: deptConv.id,
      senderId: "system",
      senderName: "Hệ Thống Doanh Nghiệp",
      senderRole: "admin",
      content: notifyContent,
      isReadBy: [],
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Cập nhật tên và thông tin kênh chat khi phòng ban đổi tên hoặc bổ nhiệm lãnh đạo
 */
export async function updateDepartmentChatInfo(
  deptId: string,
  newName: string,
  newManagerId?: string
): Promise<void> {
  await connectToDatabase();
  const now = new Date().toISOString();

  const lowerName = newName.toLowerCase();
  const displayName =
    lowerName.startsWith("phòng ") || lowerName.startsWith("ban ") || lowerName.startsWith("bộ phận ")
      ? newName
      : `Phòng ${newName}`;

  const updateFields: Record<string, unknown> = {
    name: displayName,
    departmentName: newName,
    updatedAt: now,
  };

  const updateOp: Record<string, unknown> = {
    $set: updateFields,
  };

  if (newManagerId) {
    updateOp.$addToSet = { memberIds: newManagerId };
  }

  await MongoChatConversationModel.updateOne(
    { type: "department", departmentId: deptId },
    updateOp
  );
}

/**
 * Xóa kênh chat phòng ban khi phòng ban bị xóa
 */
export async function deleteDepartmentChat(deptId: string): Promise<void> {
  await connectToDatabase();
  const conv = await MongoChatConversationModel.findOne({
    type: "department",
    departmentId: deptId,
  });
  if (conv) {
    await MongoChatMessageModel.deleteMany({ conversationId: conv.id });
    await MongoChatConversationModel.deleteOne({ id: conv.id });
  }
}

/**
 * Đồng bộ kênh chat cho người dùng khi tạo mới hoặc cập nhật phòng ban trực tiếp trên user
 */
export async function syncUserDepartmentChat(
  userId: string,
  newDeptName?: string,
  oldDeptName?: string
): Promise<void> {
  await connectToDatabase();
  const now = new Date().toISOString();

  // Luôn đảm bảo nằm trong kênh Toàn Công Ty
  await MongoChatConversationModel.updateOne(
    { type: "company" },
    { $addToSet: { memberIds: userId } }
  );

  // Nếu chuyển từ phòng ban cũ, rút khỏi kênh chat phòng cũ
  if (oldDeptName && oldDeptName !== newDeptName && oldDeptName !== "Khác") {
    await MongoChatConversationModel.updateOne(
      { type: "department", departmentName: oldDeptName },
      { $pull: { memberIds: userId }, $set: { updatedAt: now } }
    );
  }

  // Nếu chuyển sang phòng ban mới, thêm vào kênh chat phòng mới
  if (newDeptName && newDeptName !== "Khác") {
    let deptConv = await MongoChatConversationModel.findOne({
      type: "department",
      departmentName: { $regex: new RegExp(`^${newDeptName}$`, "i") },
    });

    if (deptConv) {
      await MongoChatConversationModel.updateOne(
        { id: deptConv.id },
        { $addToSet: { memberIds: userId }, $set: { updatedAt: now } }
      );
    } else {
      const deptDoc = await MongoDepartmentModel.findOne({
        name: { $regex: new RegExp(`^${newDeptName}$`, "i") },
      }).lean();
      if (deptDoc) {
        await createDepartmentConversation(deptDoc);
      }
    }
  }
}

/**
 * Quét toàn bộ phòng ban hiện có và đồng bộ thành viên vào các kênh chat phòng ban tương ứng
 */
export async function syncAllDepartmentChats(): Promise<void> {
  await connectToDatabase();
  const allDepts = await MongoDepartmentModel.find().lean();
  for (const dept of allDepts) {
    await createDepartmentConversation({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      managerId: dept.managerId,
    });
  }
}

export const ChatModel = {
  /**
   * Lấy danh sách cuộc trò chuyện cho một User cụ thể
   */
  async getConversationsForUser(userId: string): Promise<ChatConversation[]> {
    await ensureDefaultConversations();

    const currentUser = await MongoUserModel.findOne({ id: userId }).lean();
    if (!currentUser) return [];

    const allUsers = await MongoUserModel.find().lean();
    const userMap = new Map<string, User>();
    allUsers.forEach((u) => userMap.set(u.id, toSafeUser(u)));

    // Tìm tất cả cuộc trò chuyện mà user có quyền truy cập:
    // - type === "company"
    // - type === "department" (user thuộc departmentName đó HOẶC có trong memberIds)
    // - memberIds chứa userId
    const userDept = currentUser.department || "";
    const orConditions: Record<string, unknown>[] = [
      { type: "company" },
      { type: "department", departmentName: userDept },
      { memberIds: userId },
    ];

    // Quản trị viên (Admin) và Ban Giám Đốc (Director) có quyền theo dõi tất cả các kênh phòng ban
    if (currentUser.role === "admin" || currentUser.role === "director") {
      orConditions.push({ type: "department" });
    }

    const convDocs = await MongoChatConversationModel.find({
      $or: orConditions,
    })
      .sort({ updatedAt: -1 })
      .lean();

    const results: ChatConversation[] = [];

    for (const doc of convDocs) {
      // Đếm số tin nhắn chưa đọc
      const unreadCount = await MongoChatMessageModel.countDocuments({
        conversationId: doc.id,
        senderId: { $ne: userId },
        isReadBy: { $ne: userId },
      });

      let displayName = doc.name;
      let displayAvatar = doc.avatar;

      // Nếu là chat 1-1, lấy tên và avatar của người kia
      if (doc.type === "direct") {
        const otherUserId = doc.memberIds.find((id) => id !== userId);
        if (otherUserId && userMap.has(otherUserId)) {
          const otherUser = userMap.get(otherUserId)!;
          displayName = otherUser.name;
          displayAvatar = otherUser.avatarUrl;
        } else {
          displayName = "Người dùng nội bộ";
        }
      }

      // Populate danh sách members
      const populatedMembers = doc.memberIds
        .map((mId) => userMap.get(mId))
        .filter((u): u is User => Boolean(u));

      results.push({
        id: doc.id,
        type: doc.type,
        name: displayName,
        avatar: displayAvatar,
        departmentId: doc.departmentId,
        departmentName: doc.departmentName,
        memberIds: doc.memberIds,
        members: populatedMembers,
        createdBy: doc.createdBy,
        lastMessage: doc.lastMessage,
        unreadCount,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    }

    return results;
  },

  /**
   * Lấy chi tiết một cuộc trò chuyện
   */
  async getConversationById(convId: string, currentUserId?: string): Promise<ChatConversation | null> {
    await ensureDefaultConversations();
    const doc = await MongoChatConversationModel.findOne({ id: convId }).lean();
    if (!doc) return null;

    const allUsers = await MongoUserModel.find().lean();
    const userMap = new Map<string, User>();
    allUsers.forEach((u) => userMap.set(u.id, toSafeUser(u)));

    let displayName = doc.name;
    let displayAvatar = doc.avatar;

    if (doc.type === "direct" && currentUserId) {
      const otherUserId = doc.memberIds.find((id) => id !== currentUserId);
      if (otherUserId && userMap.has(otherUserId)) {
        const otherUser = userMap.get(otherUserId)!;
        displayName = otherUser.name;
        displayAvatar = otherUser.avatarUrl;
      }
    }

    const populatedMembers = doc.memberIds
      .map((mId) => userMap.get(mId))
      .filter((u): u is User => Boolean(u));

    let unreadCount = 0;
    if (currentUserId) {
      unreadCount = await MongoChatMessageModel.countDocuments({
        conversationId: doc.id,
        senderId: { $ne: currentUserId },
        isReadBy: { $ne: currentUserId },
      });
    }

    return {
      id: doc.id,
      type: doc.type,
      name: displayName,
      avatar: displayAvatar,
      departmentId: doc.departmentId,
      departmentName: doc.departmentName,
      memberIds: doc.memberIds,
      members: populatedMembers,
      createdBy: doc.createdBy,
      lastMessage: doc.lastMessage,
      unreadCount,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },

  /**
   * Lấy hoặc tạo mới cuộc trò chuyện 1-1 (Direct)
   */
  async getOrCreateDirectConversation(user1Id: string, user2Id: string): Promise<ChatConversation> {
    await ensureDefaultConversations();

    if (user1Id === user2Id) {
      throw new Error("Không thể tạo cuộc trò chuyện 1-1 với chính mình");
    }

    const existing = await MongoChatConversationModel.findOne({
      type: "direct",
      memberIds: { $all: [user1Id, user2Id], $size: 2 },
    });

    if (existing) {
      return this.getConversationById(existing.id, user1Id) as Promise<ChatConversation>;
    }

    const now = new Date().toISOString();
    const newId = `conv_dir_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const newDoc = await MongoChatConversationModel.create({
      id: newId,
      type: "direct",
      name: "Trò chuyện trực tiếp",
      memberIds: [user1Id, user2Id],
      createdBy: user1Id,
      createdAt: now,
      updatedAt: now,
    });

    return this.getConversationById(newDoc.id, user1Id) as Promise<ChatConversation>;
  },

  /**
   * Tạo hội nhóm chat mới (Group)
   */
  async createGroupConversation(
    creatorId: string,
    input: CreateGroupConversationInput
  ): Promise<ChatConversation> {
    await ensureDefaultConversations();

    const name = input.name.trim();
    if (!name) {
      throw new Error("Tên nhóm hội chat không được để trống");
    }

    // Đảm bảo creator luôn có trong danh sách
    const memberSet = new Set(input.memberIds || []);
    memberSet.add(creatorId);
    const memberIds = Array.from(memberSet);

    if (memberIds.length < 2) {
      throw new Error("Nhóm hội chat cần có ít nhất 2 thành viên");
    }

    const now = new Date().toISOString();
    const newId = `conv_grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const creator = await MongoUserModel.findOne({ id: creatorId });

    const newDoc = await MongoChatConversationModel.create({
      id: newId,
      type: "group",
      name,
      avatar: input.avatar || "👥",
      memberIds,
      createdBy: creatorId,
      lastMessage: {
        content: `${creator?.name || "Một thành viên"} đã tạo nhóm hội chat`,
        senderId: "system",
        senderName: "Hệ Thống",
        createdAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Tạo tin nhắn hệ thống thông báo tạo nhóm
    await MongoChatMessageModel.create({
      id: `msg_${Date.now()}_sys`,
      conversationId: newId,
      senderId: "system",
      senderName: "Hệ Thống",
      content: `${creator?.name || "Một thành viên"} đã tạo nhóm "${name}"`,
      isReadBy: [creatorId],
      createdAt: now,
      updatedAt: now,
    });

    return this.getConversationById(newDoc.id, creatorId) as Promise<ChatConversation>;
  },

  /**
   * Cập nhật thông tin hội nhóm (đổi tên, avatar, thêm/bớt thành viên)
   */
  async updateGroupConversation(
    convId: string,
    userId: string,
    input: UpdateGroupConversationInput
  ): Promise<ChatConversation> {
    await ensureDefaultConversations();

    const conv = await MongoChatConversationModel.findOne({ id: convId, type: "group" });
    if (!conv) {
      throw new Error("Không tìm thấy hội nhóm chat");
    }

    if (!conv.memberIds.includes(userId)) {
      throw new Error("Bạn không phải thành viên của hội nhóm này");
    }

    const now = new Date().toISOString();
    let memberSet = new Set(conv.memberIds);

    if (input.name && input.name.trim()) {
      conv.name = input.name.trim();
    }
    if (input.avatar) {
      conv.avatar = input.avatar;
    }

    if (input.addMemberIds && input.addMemberIds.length > 0) {
      input.addMemberIds.forEach((id) => memberSet.add(id));
    }

    if (input.removeMemberIds && input.removeMemberIds.length > 0) {
      input.removeMemberIds.forEach((id) => memberSet.delete(id));
      // Không được để nhóm 0 thành viên
      if (memberSet.size === 0) {
        memberSet.add(userId);
      }
    }

    conv.memberIds = Array.from(memberSet);
    conv.updatedAt = now;
    await conv.save();

    return this.getConversationById(convId, userId) as Promise<ChatConversation>;
  },

  /**
   * Lấy danh sách tin nhắn theo cuộc trò chuyện
   */
  async getMessages(
    conversationId: string,
    limit = 50,
    before?: string
  ): Promise<ChatMessage[]> {
    await ensureDefaultConversations();

    const query: Record<string, unknown> = { conversationId };
    if (before) {
      query.createdAt = { $lt: before };
    }

    const docs = await MongoChatMessageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Đảo ngược lại để thứ tự theo thời gian tăng dần (cũ -> mới)
    return docs.reverse().map((doc) => ({
      id: doc.id,
      conversationId: doc.conversationId,
      senderId: doc.senderId,
      senderName: doc.senderName,
      senderAvatar: doc.senderAvatar,
      senderRole: doc.senderRole,
      content: doc.content,
      attachments: doc.attachments,
      replyToId: doc.replyToId,
      replyToContent: doc.replyToContent,
      replyToSenderName: doc.replyToSenderName,
      reactions: doc.reactions,
      isReadBy: doc.isReadBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  },

  /**
   * Gửi tin nhắn mới
   */
  async sendMessage(senderId: string, input: SendMessageInput): Promise<ChatMessage> {
    await ensureDefaultConversations();

    const conv = await MongoChatConversationModel.findOne({ id: input.conversationId });
    if (!conv) {
      throw new Error("Không tìm thấy cuộc trò chuyện");
    }

    const sender = await MongoUserModel.findOne({ id: senderId });
    if (!sender) {
      throw new Error("Không tìm thấy người gửi");
    }

    // Kiểm tra quyền gửi tin nhắn:
    // 1. Kênh company: Tất cả nhân viên active đều được gửi
    // 2. Kênh department: Thành viên phòng ban, ADMIN và GIÁM ĐỐC đều có quyền gửi tin nhắn
    // 3. Kênh group/direct: Bắt buộc phải có trong memberIds
    if (conv.type === "company") {
      if (!conv.memberIds.includes(senderId)) {
        conv.memberIds.push(senderId);
        await MongoChatConversationModel.updateOne(
          { id: conv.id },
          { $addToSet: { memberIds: senderId } }
        );
      }
    } else if (conv.type === "department") {
      const isPrivileged = sender.role === "admin" || sender.role === "director";
      const isDeptMember = Boolean(
        sender.department &&
        conv.departmentName &&
        sender.department.trim().toLowerCase() === conv.departmentName.trim().toLowerCase()
      );

      if (!conv.memberIds.includes(senderId)) {
        if (isPrivileged || isDeptMember) {
          conv.memberIds.push(senderId);
          await MongoChatConversationModel.updateOne(
            { id: conv.id },
            { $addToSet: { memberIds: senderId } }
          );
        } else {
          throw new Error("Bạn không có quyền gửi tin nhắn vào kênh phòng ban này");
        }
      }
    } else {
      if (!conv.memberIds.includes(senderId)) {
        throw new Error("Bạn không phải thành viên của cuộc trò chuyện này");
      }
    }

    const now = new Date().toISOString();
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Tạo message document
    const messageDoc = await MongoChatMessageModel.create({
      id: msgId,
      conversationId: conv.id,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatarUrl,
      senderRole: sender.role,
      content: input.content?.trim() || "",
      attachments: input.attachments || [],
      replyToId: input.replyToId || undefined,
      isReadBy: [senderId],
      reactions: [],
      createdAt: now,
      updatedAt: now,
    });

    // Cập nhật lastMessage cho conversation
    const hasAttachments = Boolean(input.attachments && input.attachments.length > 0);
    const attachmentType = hasAttachments ? input.attachments![0].type : undefined;

    let snippet = input.content?.trim() || "";
    if (!snippet && hasAttachments) {
      snippet = `[Đã gửi ${input.attachments!.length} ${attachmentType === "image" ? "ảnh" : attachmentType === "video" ? "video" : "tệp"}]`;
    }

    conv.lastMessage = {
      content: snippet,
      senderId: sender.id,
      senderName: sender.name,
      createdAt: now,
      hasAttachments,
      attachmentType,
    };
    conv.updatedAt = now;
    await conv.save();

    return {
      id: messageDoc.id,
      conversationId: messageDoc.conversationId,
      senderId: messageDoc.senderId,
      senderName: messageDoc.senderName,
      senderAvatar: messageDoc.senderAvatar,
      senderRole: messageDoc.senderRole,
      content: messageDoc.content,
      attachments: messageDoc.attachments,
      replyToId: messageDoc.replyToId,
      reactions: [],
      isReadBy: [senderId],
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Đánh dấu các tin nhắn trong cuộc trò chuyện là đã đọc
   */
  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    await connectToDatabase();
    await MongoChatMessageModel.updateMany(
      {
        conversationId,
        isReadBy: { $ne: userId },
      },
      {
        $addToSet: { isReadBy: userId },
      }
    );
    return true;
  },

  /**
   * Thả reaction hoặc hủy reaction trên tin nhắn
   */
  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<ChatMessage | null> {
    await connectToDatabase();

    const msg = await MongoChatMessageModel.findOne({ id: messageId });
    if (!msg) return null;

    const user = await MongoUserModel.findOne({ id: userId });
    const userName = user ? user.name : "Người dùng";

    const reactions = msg.reactions || [];
    const existingIndex = reactions.findIndex(
      (r) => r.userId === userId && r.emoji === emoji
    );

    if (existingIndex >= 0) {
      // Đã có -> Hủy thả reaction
      reactions.splice(existingIndex, 1);
    } else {
      // Chưa có -> Thêm reaction mới
      reactions.push({ emoji, userId, userName });
    }

    msg.reactions = reactions;
    msg.updatedAt = new Date().toISOString();
    await msg.save();

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      senderRole: msg.senderRole,
      content: msg.content,
      attachments: msg.attachments,
      replyToId: msg.replyToId,
      replyToContent: msg.replyToContent,
      replyToSenderName: msg.replyToSenderName,
      reactions: msg.reactions,
      isReadBy: msg.isReadBy,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    };
  },
};

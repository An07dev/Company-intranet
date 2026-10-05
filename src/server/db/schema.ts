import mongoose, { Schema, Model } from "mongoose";
import { UserRole, UserStatus, AttendanceStatus, ContractType, TaskStatus, TaskPriority, AssetStatus, AssetCategory, AssetHandoverHistory } from "@/types";

export interface IUserDocument {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  phone?: string;
  department?: string;
  avatarUrl?: string;
  status: UserStatus;
  contractType?: ContractType;
  officialStartDate?: string;
  createdAt: string;
  updatedAt: string;
}

const UserSchema = new Schema<IUserDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    employeeCode: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
    role: { type: String, required: true },
    phone: { type: String },
    department: { type: String },
    avatarUrl: { type: String },
    status: { type: String, default: "active" },
    contractType: { type: String, enum: ["probation", "official"], default: "official" },
    officialStartDate: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export interface IAttendanceDocument {
  id: string;
  userId: string;
  employeeCode: string;
  userName: string;
  userEmail: string;
  date: string;
  checkInTime?: string;
  checkInIp?: string;
  checkOutTime?: string;
  checkOutIp?: string;
  status: AttendanceStatus;
  workDurationMinutes?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

const AttendanceSchema = new Schema<IAttendanceDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    employeeCode: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    date: { type: String, required: true, index: true },
    checkInTime: { type: String },
    checkInIp: { type: String },
    checkOutTime: { type: String },
    checkOutIp: { type: String },
    status: { type: String, required: true },
    workDurationMinutes: { type: Number },
    note: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export interface ISettingsDocument {
  key: string;
  allowedIps: string[];
  enableIpCheck: boolean;
  workStartTime: string;
  workEndTime: string;
  lateThresholdMinutes: number;
  updatedBy: string;
  updatedAt: string;
}

const SettingsSchema = new Schema<ISettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: "attendance_settings" },
    allowedIps: { type: [String], default: ["127.0.0.1", "::1", "192.168.1.*"] },
    enableIpCheck: { type: Boolean, default: true },
    workStartTime: { type: String, default: "08:00" },
    workEndTime: { type: String, default: "17:30" },
    lateThresholdMinutes: { type: Number, default: 0 },
    updatedBy: { type: String, default: "Hệ Thống" },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const MongoUserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);

export const MongoAttendanceModel: Model<IAttendanceDocument> =
  mongoose.models.Attendance || mongoose.model<IAttendanceDocument>("Attendance", AttendanceSchema);

export const MongoSettingsModel: Model<ISettingsDocument> =
  mongoose.models.Settings || mongoose.model<ISettingsDocument>("Settings", SettingsSchema);

export interface IRequestDocument {
  id: string;
  userId: string;
  employeeCode: string;
  userName: string;
  userEmail: string;
  department: string;
  type: string; // "leave" | "overtime"
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  durationShift?: string;
  otType?: string;
  otDate?: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  projectOrTask?: string;
  reason: string;
  status: string; // "pending" | "approved" | "rejected" | "cancelled"
  approverId?: string;
  approverName?: string;
  approvalNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const RequestSchema = new Schema<IRequestDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    employeeCode: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    department: { type: String, required: true },
    type: { type: String, required: true, index: true },
    leaveType: { type: String },
    startDate: { type: String },
    endDate: { type: String },
    durationDays: { type: Number },
    durationShift: { type: String },
    otType: { type: String },
    otDate: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    durationHours: { type: Number },
    projectOrTask: { type: String },
    reason: { type: String, required: true },
    status: { type: String, required: true, default: "pending", index: true },
    approverId: { type: String },
    approverName: { type: String },
    approvalNote: { type: String },
    reviewedAt: { type: String },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const MongoRequestModel: Model<IRequestDocument> =
  mongoose.models.LeaveOtRequest || mongoose.model<IRequestDocument>("LeaveOtRequest", RequestSchema);

export interface IDepartmentDocument {
  id: string;
  name: string;
  code: string;
  description?: string;
  location?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

const DepartmentSchema = new Schema<IDepartmentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    location: { type: String },
    managerId: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const MongoDepartmentModel: Model<IDepartmentDocument> =
  mongoose.models.Department || mongoose.model<IDepartmentDocument>("Department", DepartmentSchema);

// ======================= CHAT SCHEMAS =======================

export interface IChatConversationDocument {
  id: string;
  type: "company" | "department" | "direct" | "group";
  name: string;
  avatar?: string;
  departmentId?: string;
  departmentName?: string;
  memberIds: string[];
  createdBy?: string;
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
    hasAttachments?: boolean;
    attachmentType?: "image" | "video" | "file";
  };
  createdAt: string;
  updatedAt: string;
}

const ChatConversationSchema = new Schema<IChatConversationDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, enum: ["company", "department", "direct", "group"], index: true },
    name: { type: String, required: true },
    avatar: { type: String },
    departmentId: { type: String },
    departmentName: { type: String },
    memberIds: [{ type: String, index: true }],
    createdBy: { type: String },
    lastMessage: {
      content: { type: String },
      senderId: { type: String },
      senderName: { type: String },
      createdAt: { type: String },
      hasAttachments: { type: Boolean },
      attachmentType: { type: String, enum: ["image", "video", "file"] },
    },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const MongoChatConversationModel: Model<IChatConversationDocument> =
  mongoose.models.ChatConversation ||
  mongoose.model<IChatConversationDocument>("ChatConversation", ChatConversationSchema);

export interface IChatMessageDocument {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  content: string;
  attachments?: {
    id: string;
    url: string;
    name: string;
    type: "image" | "video" | "file";
    size?: number;
    mimeType?: string;
  }[];
  replyToId?: string;
  replyToContent?: string;
  replyToSenderName?: string;
  reactions?: {
    emoji: string;
    userId: string;
    userName: string;
  }[];
  isReadBy: string[];
  createdAt: string;
  updatedAt: string;
}

const ChatMessageSchema = new Schema<IChatMessageDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    senderAvatar: { type: String },
    senderRole: { type: String },
    content: { type: String, default: "" },
    attachments: [
      {
        id: { type: String, required: true },
        url: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ["image", "video", "file"], required: true },
        size: { type: Number },
        mimeType: { type: String },
      },
    ],
    replyToId: { type: String },
    replyToContent: { type: String },
    replyToSenderName: { type: String },
    reactions: [
      {
        emoji: { type: String, required: true },
        userId: { type: String, required: true },
        userName: { type: String, required: true },
      },
    ],
    isReadBy: [{ type: String }],
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });

export const MongoChatMessageModel: Model<IChatMessageDocument> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessageDocument>("ChatMessage", ChatMessageSchema);

export interface ITaskDocument {
  id: string;
  title: string;
  description?: string;
  department: string;

  creatorId: string;
  creatorName: string;
  creatorRole: UserRole;
  creatorAvatar?: string;

  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  assigneeCode?: string;
  assigneeRole: UserRole;
  assigneeAvatar?: string;
  assigneeDepartment?: string;

  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  progress: number;
  checklist?: {
    id: string;
    title: string;
    completed: boolean;
  }[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const TaskSchema = new Schema<ITaskDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    department: { type: String, required: true, index: true },

    creatorId: { type: String, required: true, index: true },
    creatorName: { type: String, required: true },
    creatorRole: { type: String, required: true },
    creatorAvatar: { type: String },

    assigneeId: { type: String, required: true, index: true },
    assigneeName: { type: String, required: true },
    assigneeEmail: { type: String, required: true },
    assigneeCode: { type: String },
    assigneeRole: { type: String, required: true },
    assigneeAvatar: { type: String },
    assigneeDepartment: { type: String },

    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed", "cancelled"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    dueDate: { type: String },
    progress: { type: Number, default: 0 },
    checklist: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    completedAt: { type: String },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

TaskSchema.index({ department: 1, status: 1, createdAt: -1 });
TaskSchema.index({ assigneeId: 1, status: 1 });
TaskSchema.index({ creatorId: 1 });

export const MongoTaskModel: Model<ITaskDocument> =
  mongoose.models.Task || mongoose.model<ITaskDocument>("Task", TaskSchema);

export interface IAssetDocument {
  id: string;
  code: string;
  name: string;
  category: AssetCategory;
  model?: string;
  serialNumber?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  condition: string;
  location?: string;
  imageUrl?: string;
  description?: string;
  status: AssetStatus;
  currentAssigneeId?: string;
  currentAssigneeName?: string;
  currentAssigneeEmail?: string;
  currentAssigneeCode?: string;
  currentAssigneeDepartment?: string;
  currentAssigneeAvatar?: string;
  assignedDate?: string;
  handoverHistory: AssetHandoverHistory[];
  createdAt: string;
  updatedAt: string;
}

const AssetSchema = new Schema<IAssetDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ["it_equipment", "office_equipment", "furniture", "vehicle", "other"],
      required: true,
      index: true,
    },
    model: { type: String },
    serialNumber: { type: String, index: true },
    purchasePrice: { type: Number },
    purchaseDate: { type: String },
    warrantyExpiryDate: { type: String },
    condition: { type: String, default: "Tốt" },
    location: { type: String },
    imageUrl: { type: String },
    description: { type: String },
    status: {
      type: String,
      enum: ["available", "in_use", "maintenance", "broken", "liquidated"],
      default: "available",
      index: true,
    },
    currentAssigneeId: { type: String, index: true },
    currentAssigneeName: { type: String },
    currentAssigneeEmail: { type: String },
    currentAssigneeCode: { type: String },
    currentAssigneeDepartment: { type: String },
    currentAssigneeAvatar: { type: String },
    assignedDate: { type: String },
    handoverHistory: [
      {
        id: { type: String, required: true },
        action: { type: String, enum: ["handover", "recall"], required: true },
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        userEmail: { type: String, required: true },
        employeeCode: { type: String },
        userDepartment: { type: String },
        performedById: { type: String, required: true },
        performedByName: { type: String, required: true },
        performedByRole: { type: String, required: true },
        date: { type: String, required: true },
        condition: { type: String, required: true },
        note: { type: String },
        createdAt: { type: String, required: true },
      },
    ],
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AssetSchema.index({ status: 1, category: 1 });
AssetSchema.index({ currentAssigneeId: 1, status: 1 });

export const MongoAssetModel: Model<IAssetDocument> =
  mongoose.models.Asset || mongoose.model<IAssetDocument>("Asset", AssetSchema);




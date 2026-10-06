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

export interface IShopeeOrderDocument {
  id: string;
  order_sn: string;
  shop_username?: string;
  buyer_username: string;
  total_amount: number;
  payment_method: string;
  order_status: string;
  status_description?: string;
  shipping_carrier: string;
  tracking_number?: string;
  items: {
    product_name: string;
    variation?: string;
    quantity: number;
  }[];
  raw_text?: string;
  synced_at: string;
  createdAt: string;
  updatedAt: string;
}

const ShopeeOrderSchema = new Schema<IShopeeOrderDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    order_sn: { type: String, required: true, unique: true, index: true },
    shop_username: { type: String, default: "baobiyensen", index: true },
    buyer_username: { type: String, required: true },
    total_amount: { type: Number, default: 0 },
    payment_method: { type: String, default: "Chưa rõ" },
    order_status: { type: String, default: "Chờ xử lý", index: true },
    status_description: { type: String, default: "" },
    shipping_carrier: { type: String, default: "" },
    tracking_number: { type: String, default: "" },
    items: [
      {
        product_name: { type: String, required: true },
        variation: { type: String, default: "" },
        quantity: { type: Number, default: 1 },
      },
    ],
    raw_text: { type: String },
    synced_at: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

ShopeeOrderSchema.index({ order_status: 1, createdAt: -1 });
ShopeeOrderSchema.index({ shop_username: 1, createdAt: -1 });

export const MongoShopeeOrderModel: Model<IShopeeOrderDocument> =
  mongoose.models.ShopeeOrder || mongoose.model<IShopeeOrderDocument>("ShopeeOrder", ShopeeOrderSchema);

export interface IShopeeProductVariationDoc {
  model_id: string;
  name: string;
  sku: string;
  price: number;
  price_display?: string;
  stock: number;
  sales: number;
  image?: string;
}

export interface IShopeeProductDocument {
  id: string;
  item_id: string;
  name: string;
  parent_sku?: string;
  image?: string;
  product_url?: string;
  price_min: number;
  price_max: number;
  price_display: string;
  stock: number;
  sales_30d: number;
  views_30d?: string;
  status: string;
  variations: IShopeeProductVariationDoc[];
  shop_username?: string;
  synced_at: string;
  createdAt: string;
  updatedAt: string;
}

const ShopeeProductSchema = new Schema<IShopeeProductDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    item_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    parent_sku: { type: String, default: "", index: true },
    image: { type: String, default: "" },
    product_url: { type: String, default: "" },
    price_min: { type: Number, default: 0 },
    price_max: { type: Number, default: 0 },
    price_display: { type: String, default: "" },
    stock: { type: Number, default: 0, index: true },
    sales_30d: { type: Number, default: 0 },
    views_30d: { type: String, default: "0" },
    status: { type: String, default: "Đang hoạt động", index: true },
    variations: [
      {
        model_id: { type: String, required: true },
        name: { type: String, default: "" },
        sku: { type: String, default: "" },
        price: { type: Number, default: 0 },
        price_display: { type: String, default: "" },
        stock: { type: Number, default: 0 },
        sales: { type: Number, default: 0 },
        image: { type: String, default: "" },
      },
    ],
    shop_username: { type: String, default: "baobiyensen", index: true },
    synced_at: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

ShopeeProductSchema.index({ shop_username: 1, createdAt: -1 });
ShopeeProductSchema.index({ status: 1, createdAt: -1 });
ShopeeProductSchema.index({ "variations.sku": 1 });

export const MongoShopeeProductModel: Model<IShopeeProductDocument> =
  mongoose.models.ShopeeProduct ||
  mongoose.model<IShopeeProductDocument>("ShopeeProduct", ShopeeProductSchema);

export interface IShopeeLogDocument {
  id: string;
  level: string; // 'info' | 'warn' | 'error' | 'success'
  type: string; // 'order_sync' | 'product_sync' | 'alarm_cron' | 'crawler_dom' | 'system'
  source: string; // 'chrome_extension_background' | 'chrome_extension_content' | 'chrome_extension_popup' | 'backend_server'
  shop_username?: string;
  message: string;
  details?: Record<string, any>;
  duration_ms?: number;
  createdAt: string;
}

const ShopeeLogSchema = new Schema<IShopeeLogDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    level: { type: String, required: true, enum: ["info", "warn", "error", "success"], index: true },
    type: { type: String, required: true, default: "system", index: true },
    source: { type: String, required: true, default: "chrome_extension", index: true },
    shop_username: { type: String, default: "baobiyensen", index: true },
    message: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    duration_ms: { type: Number },
    createdAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

ShopeeLogSchema.index({ createdAt: -1 });
ShopeeLogSchema.index({ level: 1, createdAt: -1 });
ShopeeLogSchema.index({ type: 1, createdAt: -1 });
ShopeeLogSchema.index({ shop_username: 1, createdAt: -1 });

export const MongoShopeeLogModel: Model<IShopeeLogDocument> =
  mongoose.models.ShopeeLog ||
  mongoose.model<IShopeeLogDocument>("ShopeeLog", ShopeeLogSchema);




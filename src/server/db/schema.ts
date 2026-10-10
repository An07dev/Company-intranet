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
    collection: "shopee_orders",
  }
);

ShopeeOrderSchema.index({ createdAt: -1 });
ShopeeOrderSchema.index({ order_status: 1, createdAt: -1 });
ShopeeOrderSchema.index({ shop_username: 1, createdAt: -1 });

export const MongoShopeeOrderModel: Model<IShopeeOrderDocument> =
  mongoose.models.ShopeeOrder || mongoose.model<IShopeeOrderDocument>("ShopeeOrder", ShopeeOrderSchema, "shopee_orders");

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

export interface IShopeeProductOptionDoc {
  id?: number;
  name: string;
  values: string[];
  position?: number;
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
  options?: IShopeeProductOptionDoc[];
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
    options: [
      {
        id: { type: Number },
        name: { type: String, default: "" },
        values: [{ type: String }],
        position: { type: Number, default: 1 },
      },
    ],
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
    collection: "shopee_products",
  }
);

ShopeeProductSchema.index({ shop_username: 1, createdAt: -1 });
ShopeeProductSchema.index({ status: 1, createdAt: -1 });
ShopeeProductSchema.index({ "variations.sku": 1 });

export const MongoShopeeProductModel: Model<IShopeeProductDocument> =
  mongoose.models.ShopeeProduct ||
  mongoose.model<IShopeeProductDocument>("ShopeeProduct", ShopeeProductSchema, "shopee_products");

export interface IShopeeLogDocument {
  id: string;
  level: string; // 'info' | 'warn' | 'error' | 'success'
  type: string; // 'order_sync' | 'product_sync' | 'alarm_cron' | 'crawler_dom' | 'system'
  source: string; // 'chrome_extension_background' | 'chrome_extension_content' | 'chrome_extension_popup' | 'backend_server'
  shop_username?: string;
  message: string;
  details?: Record<string, any>;
  duration_ms?: number;
  timestamp?: Date;
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
    timestamp: { type: Date, default: Date.now },
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
// TTL Index tự động dọn dẹp các bản ghi log cũ hơn 30 ngày (chống tràn bộ nhớ MongoDB Atlas)
ShopeeLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export const MongoShopeeLogModel: Model<IShopeeLogDocument> =
  mongoose.models.ShopeeLog ||
  mongoose.model<IShopeeLogDocument>("ShopeeLog", ShopeeLogSchema);

export interface IProductImageDocument {
  id: string;
  contentType: string;
  data: string;
  createdAt: Date;
}

const ProductImageSchema = new Schema<IProductImageDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    contentType: { type: String, required: true },
    data: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 86400 },
  },
  { timestamps: false, versionKey: false }
);

export const MongoProductImageModel: Model<IProductImageDocument> =
  mongoose.models.ProductImage ||
  mongoose.model<IProductImageDocument>("ProductImage", ProductImageSchema);

// ==========================================
// SAPO SUPPLIERS & RECEIVE INVENTORIES SCHEMAS
// ==========================================

export interface ISapoSupplierDocument {
  id: number;
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  tax_number?: string | null;
  status: string;
  address1?: string | null;
  raw_text?: string;
  no_dau_ky?: number;
  no_tang_trong_ky?: number;
  no_giam_trong_ky?: number;
  phai_thu_tra_cuoi_ky?: number;
  created_on?: string;
  updated_on?: string;
}

const SapoSupplierSchema = new Schema<ISapoSupplierDocument>(
  {
    id: { type: Number, required: true, unique: true, index: true },
    code: { type: String, required: true, index: true },
    name: { type: String, required: true, index: true },
    phone: { type: String, index: true },
    email: { type: String },
    tax_number: { type: String },
    status: { type: String, default: "active", index: true },
    address1: { type: String },
    raw_text: { type: String },
    no_dau_ky: { type: Number, default: 0 },
    no_tang_trong_ky: { type: Number, default: 0 },
    no_giam_trong_ky: { type: Number, default: 0 },
    phai_thu_tra_cuoi_ky: { type: Number, default: 0 },
    created_on: { type: String },
    updated_on: { type: String },
  },
  { timestamps: false, versionKey: false, collection: "sapo_suppliers" }
);

export const MongoSapoSupplierModel: Model<ISapoSupplierDocument> =
  mongoose.models.SapoSupplier ||
  mongoose.model<ISapoSupplierDocument>("SapoSupplier", SapoSupplierSchema, "sapo_suppliers");

export interface ISapoReceiveInventoryDocument {
  id: number;
  code: string;
  supplier_id: number;
  supplier_name: string;
  supplier_code?: string;
  total_price: number;
  subtotal_price: number;
  transaction_status: string;
  receipt_status: string;
  status: string;
  received_on: string;
  created_on: string;
  transactions?: Array<{
    id: number;
    amount: number;
    payment_method_name?: string;
    status: string;
    processed_on?: string;
    created_on?: string;
  }>;
  line_items?: Array<{
    product_id: number;
    variant_id: number;
    name: string;
    quantity: number;
    price: number;
    line_amount: number;
    sku?: string;
  }>;
  raw_text?: string;
}

const SapoReceiveInventorySchema = new Schema<ISapoReceiveInventoryDocument>(
  {
    id: { type: Number, required: true, unique: true, index: true },
    code: { type: String, required: true, index: true },
    supplier_id: { type: Number, required: true, index: true },
    supplier_name: { type: String, required: true, index: true },
    supplier_code: { type: String, index: true },
    total_price: { type: Number, default: 0 },
    subtotal_price: { type: Number, default: 0 },
    transaction_status: { type: String, index: true },
    receipt_status: { type: String, index: true },
    status: { type: String, default: "active", index: true },
    received_on: { type: String, index: true },
    created_on: { type: String, index: true },
    transactions: { type: [Schema.Types.Mixed], default: [] },
    line_items: { type: [Schema.Types.Mixed], default: [] },
    raw_text: { type: String },
  },
  { timestamps: false, versionKey: false, collection: "sapo_receive_inventories" }
);

SapoReceiveInventorySchema.index({ supplier_id: 1, received_on: -1 });

export const MongoSapoReceiveInventoryModel: Model<ISapoReceiveInventoryDocument> =
  mongoose.models.SapoReceiveInventory ||
  mongoose.model<ISapoReceiveInventoryDocument>("SapoReceiveInventory", SapoReceiveInventorySchema, "sapo_receive_inventories");

export interface ISapoSupplierReturnDocument {
  id: number;
  code: string;
  receive_inventory_id?: number;
  receive_inventory_code?: string;
  supplier_id: number;
  supplier_name: string;
  subtotal: number;
  status: string;
  refund_status: string;
  returned_on: string;
  created_on: string;
  raw_text?: string;
}

const SapoSupplierReturnSchema = new Schema<ISapoSupplierReturnDocument>(
  {
    id: { type: Number, required: true, unique: true, index: true },
    code: { type: String, required: true, index: true },
    receive_inventory_id: { type: Number, index: true },
    receive_inventory_code: { type: String },
    supplier_id: { type: Number, required: true, index: true },
    supplier_name: { type: String, required: true },
    subtotal: { type: Number, default: 0 },
    status: { type: String, index: true },
    refund_status: { type: String },
    returned_on: { type: String, index: true },
    created_on: { type: String, index: true },
    raw_text: { type: String },
  },
  { timestamps: false, versionKey: false, collection: "sapo_supplier_returns" }
);

SapoSupplierReturnSchema.index({ supplier_id: 1, returned_on: -1 });

export const MongoSapoSupplierReturnModel: Model<ISapoSupplierReturnDocument> =
  mongoose.models.SapoSupplierReturn ||
  mongoose.model<ISapoSupplierReturnDocument>("SapoSupplierReturn", SapoSupplierReturnSchema, "sapo_supplier_returns");

// ==========================================
// KHÁCH HÀNG THÂN THIẾT (LOYAL / VIP CUSTOMERS)
// ==========================================
export type LoyalCustomerTier = "standard" | "silver" | "gold" | "diamond";

export interface ILoyalCustomerDocument {
  id: string;
  sapo_customer_id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tier: LoyalCustomerTier;
  discount_percent: number;
  notes?: string;
  total_spent: number;
  orders_count: number;
  last_order_name?: string;
  created_at: string;
  updated_at: string;
  added_by?: string;
}

const LoyalCustomerSchema = new Schema<ILoyalCustomerDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    sapo_customer_id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    phone: { type: String, index: true },
    email: { type: String },
    address: { type: String },
    tier: {
      type: String,
      enum: ["standard", "silver", "gold", "diamond"],
      default: "standard",
      index: true,
    },
    discount_percent: { type: Number, default: 0 },
    notes: { type: String },
    total_spent: { type: Number, default: 0 },
    orders_count: { type: Number, default: 0 },
    last_order_name: { type: String },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
    added_by: { type: String, default: "Hệ thống" },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "loyal_customers",
  }
);

LoyalCustomerSchema.index({ sapo_customer_id: 1 });
LoyalCustomerSchema.index({ tier: 1, total_spent: -1 });

export const MongoLoyalCustomerModel: Model<ILoyalCustomerDocument> =
  mongoose.models.LoyalCustomer ||
  mongoose.model<ILoyalCustomerDocument>("LoyalCustomer", LoyalCustomerSchema, "loyal_customers");

// ==========================================
// SAPO CUSTOMERS CACHE / SYNC (DANH BẠ KHÁCH HÀNG SAPO)
// ==========================================
export interface ISapoCustomerDocument {
  id: number;
  first_name: string | null;
  last_name: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  orders_count: number;
  total_spent: number;
  last_order_id: number | null;
  last_order_name: string | null;
  tags: string;
  note: string | null;
  created_on: string;
  modified_on: string;
  default_address?: any;
  addresses?: any[];
  synced_at: string;
}

const SapoCustomerSchema = new Schema<ISapoCustomerDocument>(
  {
    id: { type: Number, required: true, unique: true, index: true },
    first_name: { type: String, default: "" },
    last_name: { type: String, default: "" },
    name: { type: String, default: "", index: true },
    phone: { type: String, default: "", index: true },
    email: { type: String, default: "", index: true },
    orders_count: { type: Number, default: 0 },
    total_spent: { type: Number, default: 0, index: true },
    last_order_id: { type: Number, default: null },
    last_order_name: { type: String, default: null },
    tags: { type: String, default: "" },
    note: { type: String, default: null },
    created_on: { type: String, required: true, index: true },
    modified_on: { type: String, required: true, index: true },
    default_address: { type: Schema.Types.Mixed, default: null },
    addresses: { type: [Schema.Types.Mixed], default: [] },
    synced_at: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "sapo_customers",
  }
);

SapoCustomerSchema.index({ created_on: -1 });
SapoCustomerSchema.index({ modified_on: -1 });
SapoCustomerSchema.index({ id: -1 });

export const MongoSapoCustomerModel: Model<ISapoCustomerDocument> =
  mongoose.models.SapoCustomer ||
  mongoose.model<ISapoCustomerDocument>("SapoCustomer", SapoCustomerSchema, "sapo_customers");

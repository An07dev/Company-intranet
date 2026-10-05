import { UserRole } from "./index";

export type AssetStatus = 
  | "available"    // Sẵn sàng bàn giao / Trong kho
  | "in_use"       // Đang sử dụng (đã bàn giao cho nhân viên)
  | "maintenance"  // Đang bảo dưỡng / Sửa chữa
  | "broken"       // Hỏng hóc
  | "liquidated";  // Đã thanh lý

export type AssetCategory = 
  | "it_equipment"      // Thiết bị IT & Máy tính (Laptop, PC, Màn hình, Chuột, Phím)
  | "office_equipment"  // Thiết bị văn phòng (Máy in, Máy chiếu, Máy chấm công)
  | "furniture"         // Bàn ghế, Tủ hồ sơ, Kệ
  | "vehicle"           // Phương tiện (Xe công ty)
  | "other";            // Khác (Thẻ ra vào, Khóa từ, v.v.)

export interface AssetHandoverHistory {
  id: string;
  action: "handover" | "recall"; // Bàn giao (handover) hoặc Thu hồi (recall)
  userId: string;
  userName: string;
  userEmail: string;
  employeeCode?: string;
  userDepartment?: string;
  performedById: string;
  performedByName: string;
  performedByRole: UserRole;
  date: string; // YYYY-MM-DD
  condition: string; // Tình trạng khi bàn giao / thu hồi: Mới 100%, Tốt (95%), v.v.
  note?: string; // Ghi chú biên bản bàn giao
  createdAt: string;
}

export interface Asset {
  id: string;
  code: string; // Mã tài sản (VD: TS-001, LAP-01, MN-02)
  name: string; // Tên tài sản (VD: MacBook Pro M2, Ghế Ergonomic)
  category: AssetCategory;
  model?: string; // Hãng sản xuất / Model (VD: Apple, Dell, Herman Miller)
  serialNumber?: string; // Số serial thiết bị
  purchasePrice?: number; // Giá trị mua (VNĐ)
  purchaseDate?: string; // Ngày mua (YYYY-MM-DD)
  warrantyExpiryDate?: string; // Hạn bảo hành (YYYY-MM-DD)
  condition: string; // Tình trạng thiết bị: "Mới 100%", "Tốt (95%)", "Cũ", "Lỗi pin"
  location?: string; // Vị trí / Kho (VD: "Kho Tầng 3", "Văn phòng Sales")
  imageUrl?: string; // Ảnh chụp tài sản (Base64 hoặc URL)
  description?: string; // Mô tả cấu hình chi tiết / Ghi chú kỹ thuật

  status: AssetStatus;

  // Thông tin nhân sự đang giữ tài sản (nếu status === "in_use")
  currentAssigneeId?: string;
  currentAssigneeName?: string;
  currentAssigneeEmail?: string;
  currentAssigneeCode?: string;
  currentAssigneeDepartment?: string;
  currentAssigneeAvatar?: string;
  assignedDate?: string; // Ngày bắt đầu bàn giao

  // Lịch sử các lần bàn giao và thu hồi
  handoverHistory: AssetHandoverHistory[];

  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetInput {
  code: string;
  name: string;
  category: AssetCategory;
  model?: string;
  serialNumber?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  condition?: string;
  location?: string;
  imageUrl?: string;
  description?: string;
  status?: AssetStatus;
}

export interface UpdateAssetInput {
  code?: string;
  name?: string;
  category?: AssetCategory;
  model?: string;
  serialNumber?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  condition?: string;
  location?: string;
  imageUrl?: string;
  description?: string;
  status?: AssetStatus;
}

export interface HandoverAssetInput {
  assigneeId: string; // ID nhân viên nhận bàn giao
  date?: string; // Ngày bàn giao (YYYY-MM-DD, mặc định hôm nay)
  condition?: string; // Tình trạng khi bàn giao
  note?: string; // Ghi chú biên bản bàn giao
}

export interface RecallAssetInput {
  date?: string; // Ngày nhận lại (YYYY-MM-DD, mặc định hôm nay)
  condition?: string; // Tình trạng lúc nhận lại
  newStatus?: "available" | "maintenance" | "broken"; // Trạng thái sau thu hồi (mặc định "available")
  note?: string; // Ghi chú thu hồi
}

export interface AssetStats {
  total: number;
  inUse: number;
  available: number;
  maintenance: number;
  broken: number;
  totalValue: number;
}

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  available: "Trong kho (Sẵn sàng)",
  in_use: "Đang sử dụng",
  maintenance: "Đang bảo dưỡng",
  broken: "Hỏng hóc",
  liquidated: "Đã thanh lý",
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, { bg: string; text: string; border: string; dot: string }> = {
  available: {
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  in_use: {
    bg: "bg-blue-50 dark:bg-blue-950/50",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  maintenance: {
    bg: "bg-amber-50 dark:bg-amber-950/50",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  broken: {
    bg: "bg-rose-50 dark:bg-rose-950/50",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-900",
    dot: "bg-rose-500",
  },
  liquidated: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    border: "border-zinc-200 dark:border-zinc-700",
    dot: "bg-zinc-400",
  },
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  it_equipment: "Thiết bị IT & Máy tính",
  office_equipment: "Thiết bị văn phòng",
  furniture: "Nội thất & Bàn ghế",
  vehicle: "Phương tiện đi lại",
  other: "Tài sản khác",
};

export const ASSET_CATEGORY_ICONS: Record<AssetCategory, string> = {
  it_equipment: "💻",
  office_equipment: "🖨️",
  furniture: "🪑",
  vehicle: "🚗",
  other: "📦",
};

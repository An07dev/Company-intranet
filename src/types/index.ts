export * from "./api";
export * from "./attendance";
export * from "./request";
export * from "./department";
export * from "./chat";
export * from "./task";
export * from "./asset";
export * from "./shopee";
export * from "./package";
export * from "./role";

// Vai trò trong hệ thống (Hỗ trợ mở rộng role linh hoạt)
export type UserRole = "admin" | "director" | "manager" | "employee" | string;

export type UserStatus = "active" | "inactive" | "suspended";

// Hình thức nhân sự: Thử việc (không có phép năm) và Chính thức (cộng 1 phép/tháng, max 12)
export type ContractType = "probation" | "official";

export interface User {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: UserRole;
  roleName?: string;
  allowedPages?: string[];
  defaultPage?: string;
  phone?: string;
  department?: string;
  avatarUrl?: string;
  status: UserStatus;
  contractType?: ContractType;
  officialStartDate?: string; // Ngày bắt đầu chính thức (YYYY-MM-DD)
  customLeaveDays?: number; // Cấu hình công phép thiết lập riêng (mặc định 0)
  workShiftName?: string; // Tên ca làm việc (VD: "Ca Hành Chính", "Ca Sáng", "Ca Chiều", "Tùy chỉnh")
  workStartTime?: string; // Giờ bắt đầu ca (HH:mm, VD: "08:30")
  workEndTime?: string; // Giờ kết thúc ca (HH:mm, VD: "18:00")
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  employeeCode?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string;
  department?: string;
  avatarUrl?: string;
  status?: UserStatus;
  contractType?: ContractType;
  officialStartDate?: string;
  customLeaveDays?: number;
  workShiftName?: string;
  workStartTime?: string;
  workEndTime?: string;
}

export interface UpdateUserInput {
  employeeCode?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  phone?: string;
  department?: string;
  avatarUrl?: string;
  status?: UserStatus;
  contractType?: ContractType;
  officialStartDate?: string;
  customLeaveDays?: number;
  workShiftName?: string;
  workStartTime?: string;
  workEndTime?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

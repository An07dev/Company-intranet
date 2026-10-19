export * from "./api";
export * from "./attendance";
export * from "./request";
export * from "./department";
export * from "./chat";
export * from "./task";
export * from "./asset";
export * from "./shopee";
export * from "./package";

// 4 Role chính trong hệ thống: Admin, Giám đốc, Quản lý, Nhân viên
export type UserRole = "admin" | "director" | "manager" | "employee";

export type UserStatus = "active" | "inactive" | "suspended";

// Hình thức nhân sự: Thử việc (không có phép năm) và Chính thức (cộng 1 phép/tháng, max 12)
export type ContractType = "probation" | "official";

export interface User {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  department?: string;
  avatarUrl?: string;
  status: UserStatus;
  contractType?: ContractType;
  officialStartDate?: string; // Ngày bắt đầu chính thức (YYYY-MM-DD)
  customLeaveDays?: number; // Cấu hình công phép thiết lập riêng (mặc định 0)
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

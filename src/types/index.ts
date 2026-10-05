export * from "./api";
export * from "./attendance";
export * from "./request";
export * from "./department";
export * from "./chat";
export * from "./task";
export * from "./asset";

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

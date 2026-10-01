export const APP_NAME = "Internal Portal";

export const USER_ROLES = {
  ADMIN: "admin",
  DIRECTOR: "director",
  MANAGER: "manager",
  EMPLOYEE: "employee",
} as const;

export const USER_ROLE_LABELS: Record<string, string> = {
  admin: "Admin (Quản trị viên)",
  director: "Giám Đốc",
  manager: "Quản Lý",
  employee: "Nhân Viên",
};

export const API_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

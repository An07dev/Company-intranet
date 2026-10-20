export interface SystemPageItem {
  path: string;
  label: string;
  category: "overview" | "sales" | "finance" | "warehouse" | "operations" | "hr" | "system";
  categoryLabel: string;
  description?: string;
  icon?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  allowedPages: string[];
  defaultPage: string;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  id?: string;
  name: string;
  description?: string;
  allowedPages: string[];
  defaultPage?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  allowedPages?: string[];
  defaultPage?: string;
}

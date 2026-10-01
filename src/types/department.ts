import { User } from "./index";

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  location?: string;
  managerId?: string;
  managerName?: string;
  managerAvatar?: string;
  managerEmail?: string;
  manager?: User;
  memberCount?: number;
  members?: User[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  description?: string;
  location?: string;
  managerId?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string;
  location?: string;
  managerId?: string;
}

export interface AdjustDepartmentMembersInput {
  action: "add" | "remove" | "set_manager";
  userIds: string[];
}

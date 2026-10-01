import { UserRole } from "./index";

export type TaskStatus = "todo" | "in_progress" | "review" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  department: string;

  // Người giao việc (Creator)
  creatorId: string;
  creatorName: string;
  creatorRole: UserRole;
  creatorAvatar?: string;

  // Người nhận việc (Assignee)
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  assigneeCode?: string;
  assigneeRole: UserRole;
  assigneeAvatar?: string;
  assigneeDepartment?: string;

  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  progress: number; // 0 - 100
  checklist?: TaskChecklistItem[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeId?: string; // Bỏ trống = tự giao cho mình
  department?: string;
  priority?: TaskPriority;
  dueDate?: string;
  checklist?: { title: string; completed?: boolean }[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  department?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  progress?: number;
  checklist?: TaskChecklistItem[];
}

export interface TaskFilterParams {
  tab?: "all" | "assigned_to_me" | "created_by_me" | "department";
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}

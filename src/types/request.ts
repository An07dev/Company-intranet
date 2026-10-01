export type RequestType = "leave" | "overtime";

export type LeaveType =
  | "annual" // Nghỉ phép năm
  | "unpaid" // Nghỉ không lương
  | "sick" // Nghỉ ốm đau
  | "maternity_paternity" // Thai sản
  | "bereavement_marriage" // Việc riêng có lương (hiếu, hỷ)
  | "remote_wfh"; // Làm việc từ xa (WFH)

export type OvertimeType =
  | "weekday" // Ngày thường (1.5x)
  | "weekend" // Cuối tuần (2.0x)
  | "holiday"; // Ngày lễ / Tết (3.0x)

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type DurationShift = "all_day" | "morning" | "afternoon";

export interface LeaveOtRequest {
  id: string;
  userId: string;
  employeeCode: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  department: string;
  type: RequestType;
  
  // Dành riêng cho Xin Nghỉ
  leaveType?: LeaveType;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  durationDays?: number;
  durationShift?: DurationShift;

  // Dành riêng cho Xin OT
  otType?: OvertimeType;
  otDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationHours?: number;
  projectOrTask?: string;

  // Thông tin chung
  reason: string;
  status: RequestStatus;
  approverId?: string;
  approverName?: string;
  approverAvatar?: string;
  approvalNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestInput {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  durationDays: number;
  durationShift: DurationShift;
  reason: string;
}

export interface CreateOtRequestInput {
  otType: OvertimeType;
  otDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  projectOrTask: string;
  reason: string;
}

export interface RequestStatsSummary {
  annualLeaveTotal: number;
  annualLeaveUsed: number;
  annualLeaveRemaining: number;
  approvedOtHoursThisMonth: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  contractType?: "probation" | "official";
  officialStartDate?: string;
}

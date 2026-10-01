export type AttendanceStatus = "on_time" | "late" | "early_leave" | "completed";

export interface AttendanceRecord {
  id: string;
  userId: string;
  employeeCode: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  date: string; // YYYY-MM-DD
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

export interface AttendanceSettings {
  allowedIps: string[];
  enableIpCheck: boolean;
  workStartTime: string; // HH:mm (e.g. "08:00")
  workEndTime: string;   // HH:mm (e.g. "17:30")
  lateThresholdMinutes: number; // e.g. 15
  updatedBy?: string;
  updatedAt: string;
}

export interface AttendanceStatusResponse {
  todayRecord: AttendanceRecord | null;
  clientIp: string;
  isIpAllowed: boolean;
  ipCheckEnabled: boolean;
  serverTime: string;
}

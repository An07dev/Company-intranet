import { AttendanceSettings } from "@/types";
import { connectToDatabase } from "@/server/db";
import { MongoSettingsModel } from "@/server/db/schema";

const DEFAULT_SETTINGS: AttendanceSettings = {
  allowedIps: ["127.0.0.1", "::1", "192.168.1.*"],
  enableIpCheck: true,
  workStartTime: "08:00",
  workEndTime: "17:30",
  lateThresholdMinutes: 15,
  updatedBy: "Hệ Thống",
  updatedAt: new Date().toISOString(),
};

export const SettingsModel = {
  /**
   * Lấy cấu hình điểm danh từ MongoDB (tự động khởi tạo nếu chưa có)
   */
  async getAttendanceSettings(): Promise<AttendanceSettings> {
    await connectToDatabase();
    let doc = await MongoSettingsModel.findOne({ key: "attendance_settings" }).lean();
    if (!doc) {
      doc = await MongoSettingsModel.create({
        key: "attendance_settings",
        ...DEFAULT_SETTINGS,
      });
    }
    return {
      allowedIps: doc.allowedIps || DEFAULT_SETTINGS.allowedIps,
      enableIpCheck: doc.enableIpCheck ?? DEFAULT_SETTINGS.enableIpCheck,
      workStartTime: doc.workStartTime || DEFAULT_SETTINGS.workStartTime,
      workEndTime: doc.workEndTime || DEFAULT_SETTINGS.workEndTime,
      lateThresholdMinutes: doc.lateThresholdMinutes ?? DEFAULT_SETTINGS.lateThresholdMinutes,
      updatedBy: doc.updatedBy || DEFAULT_SETTINGS.updatedBy,
      updatedAt: doc.updatedAt || DEFAULT_SETTINGS.updatedAt,
    };
  },

  /**
   * Cập nhật cấu hình điểm danh vào MongoDB
   */
  async updateAttendanceSettings(
    data: Partial<AttendanceSettings>,
    updatedBy = "Admin"
  ): Promise<AttendanceSettings> {
    await connectToDatabase();
    const updatePayload: Record<string, unknown> = {
      updatedBy,
      updatedAt: new Date().toISOString(),
    };

    if (data.allowedIps !== undefined) {
      updatePayload.allowedIps = Array.from(
        new Set(data.allowedIps.map((ip) => ip.trim()).filter(Boolean))
      );
    }
    if (data.enableIpCheck !== undefined) {
      updatePayload.enableIpCheck = Boolean(data.enableIpCheck);
    }
    if (data.workStartTime !== undefined) {
      updatePayload.workStartTime = data.workStartTime.trim();
    }
    if (data.workEndTime !== undefined) {
      updatePayload.workEndTime = data.workEndTime.trim();
    }
    if (data.lateThresholdMinutes !== undefined) {
      updatePayload.lateThresholdMinutes = Number(data.lateThresholdMinutes) || 15;
    }

    const doc = await MongoSettingsModel.findOneAndUpdate(
      { key: "attendance_settings" },
      { $set: updatePayload },
      { new: true, upsert: true }
    ).lean();

    return {
      allowedIps: doc.allowedIps,
      enableIpCheck: doc.enableIpCheck,
      workStartTime: doc.workStartTime,
      workEndTime: doc.workEndTime,
      lateThresholdMinutes: doc.lateThresholdMinutes,
      updatedBy: doc.updatedBy,
      updatedAt: doc.updatedAt,
    };
  },
};

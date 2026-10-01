"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { AttendanceSettings, ApiResponse } from "@/types";
import { Button } from "@/components/ui/Button";
import { LoadingSection } from "@/components/ui/Loading";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [detectedIp, setDetectedIp] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIpInput, setNewIpInput] = useState("");

  // Tải cấu hình hiện tại từ backend
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/settings/attendance");
        const json: ApiResponse<{
          settings: AttendanceSettings;
          detectedClientIp: string;
          isIpAllowed: boolean;
        }> = await res.json();

        if (json.success && json.data) {
          setSettings(json.data.settings);
          setDetectedIp(json.data.detectedClientIp);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Lỗi khi tải cấu hình", {
          title: "Lỗi Hệ Thống",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleAddIp = (ipToAdd?: string) => {
    const ip = (ipToAdd || newIpInput).trim();
    if (!ip || !settings) return;

    if (settings.allowedIps.includes(ip)) {
      toast.warning(`IP "${ip}" đã có trong danh sách.`);
      return;
    }

    setSettings({
      ...settings,
      allowedIps: [...settings.allowedIps, ip],
    });
    setNewIpInput("");
  };

  const handleRemoveIp = (ipToRemove: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      allowedIps: settings.allowedIps.filter((ip) => ip !== ipToRemove),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);

    try {
      const res = await fetch("/api/settings/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message || "Đã lưu cấu hình thành công!", {
          title: "Cấu Hình Hệ Thống",
        });
        if (json.data) setSettings(json.data);
      } else {
        toast.error(json.message || json.error || "Không thể lưu cấu hình", {
          title: "Cấu Hình Thất Bại",
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi kết nối", {
        title: "Lỗi Hệ Thống",
      });
    } finally {
      setSaving(false);
    }
  };

  const isPrivileged = user?.role === "admin" || user?.role === "director";

  if (!isPrivileged) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-10 text-center">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Giới Hạn Quyền Truy Cập
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Chỉ tài khoản thuộc vai trò <strong>ADMIN</strong> hoặc <strong>GIÁM ĐỐC</strong> mới có quyền cấu hình dải IP và chính sách chấm công của công ty.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSection text="Đang tải cấu hình hệ thống..." size="lg" />
      </div>
    );
  }

  const isCurrentIpInList = detectedIp && settings.allowedIps.includes(detectedIp);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 mb-2">
          <span>⚙️</span>
          Quản Trị Hệ Thống
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Cấu hình IP Chấm Công
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Thiết lập danh sách IP mạng văn phòng hợp lệ. Người dùng bắt buộc phải kết nối đúng IP này mới có thể chấm công.
        </p>
      </div>



      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Bật / Tắt kiểm tra IP */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Bắt buộc kiểm tra IP văn phòng
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Khi bật tính năng này, nhân viên chỉ chấm công được khi kết nối đúng mạng Wi-Fi/IP văn phòng.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableIpCheck}
                onChange={(e) =>
                  setSettings({ ...settings, enableIpCheck: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>
        </div>

        {/* Card 2: IP hiện tại của Admin & Tiện ích điền nhanh */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Địa chỉ IP hiện tại của bạn
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Hệ thống tự động phát hiện IP máy bạn đang gửi yêu cầu lên máy chủ.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {detectedIp || "Đang lấy..."}
              </span>
              {isCurrentIpInList ? (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Đã có trong danh sách hợp lệ
                </span>
              ) : (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Chưa có trong danh sách
                </span>
              )}
            </div>

            {!isCurrentIpInList && detectedIp && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddIp(detectedIp)}
              >
                + Thêm IP này vào danh sách
              </Button>
            )}
          </div>
        </div>

        {/* Card 3: Danh sách IP Whitelist */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Danh sách IP văn phòng hợp lệ ({settings.allowedIps.length})
            </h2>
            <span className="text-xs text-zinc-400 font-mono">Hỗ trợ IP cố định & wildcard (VD: 192.168.1.*)</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Chỉ những IP nằm trong danh sách này mới được quyền gửi yêu cầu chấm công thành công.
          </p>

          {/* Ô nhập thêm IP mới */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newIpInput}
              onChange={(e) => setNewIpInput(e.target.value)}
              placeholder="Nhập địa chỉ IP (VD: 113.161.72.15 hoặc 192.168.1.*)"
              className="flex-1 px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => handleAddIp()}
            >
              Thêm IP
            </Button>
          </div>

          {/* Danh sách Tags IP */}
          {settings.allowedIps.length === 0 ? (
            <div className="p-6 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-xs text-zinc-500">
              Chưa có địa chỉ IP nào. Hãy thêm ít nhất 1 IP văn phòng hoặc tắt tính năng kiểm tra IP.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
              {settings.allowedIps.map((ip) => (
                <span
                  key={ip}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{ip}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveIp(ip)}
                    title="Xóa IP này"
                    className="ml-1 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card 4: Cấu hình khung giờ làm việc */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Quy định giờ giấc làm việc
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Dùng để đối chiếu tính toán trạng thái Đúng giờ, Đi muộn hoặc Về sớm.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Giờ bắt đầu làm việc
              </label>
              <input
                type="time"
                value={settings.workStartTime}
                onChange={(e) =>
                  setSettings({ ...settings, workStartTime: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Giờ kết thúc làm việc
              </label>
              <input
                type="time"
                value={settings.workEndTime}
                onChange={(e) =>
                  setSettings({ ...settings, workEndTime: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Khoảng ân hạn đi muộn (phút)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.lateThresholdMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lateThresholdMinutes: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* Nút lưu cấu hình */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={saving}
            loadingText="Đang lưu cấu hình..."
          >
            Lưu thay đổi cài đặt
          </Button>
        </div>
      </form>
    </div>
  );
}

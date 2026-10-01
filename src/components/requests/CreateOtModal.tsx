"use client";

import React, { useState } from "react";
import { OvertimeType, CreateOtRequestInput } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface CreateOtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOtModal({ isOpen, onClose, onSuccess }: CreateOtModalProps) {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [otType, setOtType] = useState<OvertimeType>("weekday");
  const [otDate, setOtDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("21:00");
  const [projectOrTask, setProjectOrTask] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Tính số giờ làm thêm
  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (endMins <= startMins) return 0;
    return Math.round(((endMins - startMins) / 60) * 10) / 10;
  };

  const calculatedHours = calculateHours();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectOrTask.trim()) {
      setErrorMsg("Vui lòng nhập tên dự án hoặc công việc làm thêm.");
      return;
    }
    if (!reason.trim()) {
      setErrorMsg("Vui lòng nhập lý do cần làm thêm giờ (OT).");
      return;
    }
    if (calculatedHours <= 0) {
      setErrorMsg("Giờ kết thúc phải muộn hơn giờ bắt đầu.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload: CreateOtRequestInput & { type: "overtime" } = {
        type: "overtime",
        otType,
        otDate,
        startTime,
        endTime,
        durationHours: calculatedHours,
        projectOrTask: projectOrTask.trim(),
        reason: reason.trim(),
      };

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Gửi đơn OT thất bại");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra khi gửi đơn OT.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold text-base">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Đăng Ký Làm Thêm Giờ (OT)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gửi kế hoạch OT để cấp quản lý phê duyệt tính công
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lưu ý quy trình Giám đốc duyệt */}
        <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
          <span className="shrink-0">ℹ️</span>
          <span>Theo quy định, tất cả các đơn đăng ký OT sau khi nộp sẽ được chuyển trực tiếp đến <strong>Giám đốc</strong> phê duyệt.</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Loại làm thêm giờ */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Hình thức làm thêm (Hệ số lương) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { key: "weekday", label: "Ngày thường", rate: "150% lương" },
                { key: "weekend", label: "Cuối tuần", rate: "200% lương" },
                { key: "holiday", label: "Lễ / Tết", rate: "300% lương" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setOtType(opt.key as OvertimeType)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    otType === opt.key
                      ? "bg-blue-50/80 border-blue-500 text-blue-900 dark:bg-blue-950/60 dark:border-blue-400 dark:text-blue-100 shadow-2xs"
                      : "bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  }`}
                >
                  <div className="font-semibold text-xs">{opt.label}</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{opt.rate}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Ngày OT */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Ngày làm thêm <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={otDate}
              onChange={(e) => setOtDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              required
            />
          </div>

          {/* Khung giờ bắt đầu -> kết thúc */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Giờ bắt đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Giờ kết thúc <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                required
              />
            </div>
          </div>

          {/* Tổng số giờ OT tính toán */}
          <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-xs">
            <span className="text-blue-900 dark:text-blue-300">Tổng thời lượng làm thêm:</span>
            <span className="font-mono font-bold text-sm text-blue-700 dark:text-blue-300">
              {calculatedHours} giờ
            </span>
          </div>

          {/* Dự án / Nhiệm vụ */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Dự án / Nội dung công việc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={projectOrTask}
              onChange={(e) => setProjectOrTask(e.target.value)}
              placeholder="VD: Dự án nâng cấp Website nội bộ, xử lý sự cố máy chủ..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              required
            />
          </div>

          {/* Lý do chi tiết */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Lý do &amp; Kết quả dự kiến <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Giải trình lý do cần làm thêm ngoài giờ và mục tiêu công việc cần hoàn thành..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              required
            />
          </div>

          {/* Footer nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || calculatedHours <= 0}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting && <Spinner size="xs" color="white" />}
              <span>{submitting ? "Đang gửi đơn..." : "Gửi đơn xin OT"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

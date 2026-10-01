"use client";

import React, { useState, useEffect } from "react";
import { LeaveType, DurationShift, CreateLeaveRequestInput, ContractType } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface CreateLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  remainingLeaveDays?: number;
  contractType?: ContractType;
}

export function CreateLeaveModal({
  isOpen,
  onClose,
  onSuccess,
  remainingLeaveDays = 12,
  contractType = "official",
}: CreateLeaveModalProps) {
  const isProbation = contractType === "probation";

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [leaveType, setLeaveType] = useState<LeaveType>(isProbation ? "unpaid" : "annual");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [durationShift, setDurationShift] = useState<DurationShift>("all_day");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Khi modal mở hoặc thay đổi hình thức nhân viên, tự điều chỉnh loại đơn phù hợp
  useEffect(() => {
    if (isOpen) {
      if (isProbation && leaveType === "annual") {
        setLeaveType("unpaid");
      }
      setErrorMsg("");
    }
  }, [isOpen, isProbation]);

  if (!isOpen) return null;

  // Tính số ngày nghỉ dự kiến
  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays === 1) {
      if (durationShift === "morning" || durationShift === "afternoon") {
        return 0.5;
      }
    }
    return diffDays;
  };

  const calculatedDays = calculateDays();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg("Vui lòng nhập lý do xin nghỉ.");
      return;
    }
    if (calculatedDays <= 0) {
      setErrorMsg("Ngày kết thúc không được sớm hơn ngày bắt đầu.");
      return;
    }

    if (leaveType === "annual") {
      if (isProbation) {
        setErrorMsg("Nhân viên thử việc chưa được hưởng chế độ nghỉ phép năm.");
        return;
      }
      if (calculatedDays > remainingLeaveDays) {
        setErrorMsg(
          `Số ngày xin nghỉ (${calculatedDays} ngày) vượt quá số ngày phép năm còn lại (${remainingLeaveDays} ngày). Vui lòng chọn loại nghỉ khác hoặc giảm số ngày.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload: CreateLeaveRequestInput & { type: "leave" } = {
        type: "leave",
        leaveType,
        startDate,
        endDate,
        durationDays: calculatedDays,
        durationShift,
        reason: reason.trim(),
      };

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Gửi đơn thất bại");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra khi gửi đơn.");
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
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-base">
              🏖️
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Tạo Đơn Xin Nghỉ Phép
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gửi đơn đến cấp quản lý xem xét và phê duyệt
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

        {/* Thông báo phép năm còn lại hoặc Thông báo Thử việc */}
        {isProbation ? (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs">
            <span className="text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
              <span>⏳</span>
              <span>Hình thức: <strong>Thử việc</strong> (Chưa được nghỉ phép năm)</span>
            </span>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-white dark:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
              0 ngày phép
            </span>
          </div>
        ) : (
          <div className="px-5 py-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs">
            <span className="text-emerald-800 dark:text-emerald-300">
              Số ngày phép năm còn khả dụng:
            </span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              {remainingLeaveDays} ngày
            </span>
          </div>
        )}

        {/* Lưu ý quy trình Giám đốc duyệt */}
        <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
          <span className="shrink-0">ℹ️</span>
          <span>Theo quy định, tất cả các đơn xin nghỉ sau khi nộp sẽ được chuyển trực tiếp đến <strong>Giám đốc</strong> phê duyệt.</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Loại nghỉ phép */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Loại hình xin nghỉ <span className="text-rose-500">*</span>
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="annual" disabled={isProbation}>
                {isProbation
                  ? "❌ Nghỉ phép năm (Không áp dụng cho NV thử việc)"
                  : "Nghỉ phép năm (Có hưởng lương)"}
              </option>
              <option value="unpaid">Nghỉ không hưởng lương</option>
              <option value="sick">Nghỉ ốm đau / Khám chữa bệnh</option>
              <option value="remote_wfh">Đăng ký làm việc từ xa (WFH)</option>
              <option value="bereavement_marriage">Việc riêng có lương (Hiếu, hỷ, kết hôn)</option>
              <option value="maternity_paternity">Nghỉ chế độ thai sản</option>
            </select>
            {isProbation && (
              <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                💡 Nhân viên thử việc có thể nộp đơn <strong>Nghỉ không hưởng lương</strong> hoặc <strong>Nghỉ ốm đau / việc riêng</strong>.
              </p>
            )}
          </div>

          {/* Khoảng thời gian từ ngày -> đến ngày */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Từ ngày <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Đến ngày <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                required
              />
            </div>
          </div>

          {/* Buổi nghỉ (nếu nghỉ trong 1 ngày) */}
          {startDate === endDate && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Khung thời gian trong ngày
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { key: "all_day", label: "Cả ngày (1.0 ngày)" },
                  { key: "morning", label: "Buổi sáng (0.5 ngày)" },
                  { key: "afternoon", label: "Buổi chiều (0.5 ngày)" },
                ].map((shift) => (
                  <button
                    key={shift.key}
                    type="button"
                    onClick={() => setDurationShift(shift.key as DurationShift)}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all ${
                      durationShift === shift.key
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-xs"
                        : "bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    {shift.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tổng số ngày tính toán */}
          <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-300">Tổng thời gian xin nghỉ:</span>
            <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {calculatedDays} ngày
            </span>
          </div>

          {/* Lý do xin nghỉ */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Lý do chi tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do xin nghỉ phép cụ thể để cấp trên xem xét phê duyệt..."
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
              disabled={submitting || calculatedDays <= 0}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting && <Spinner size="xs" color="white" />}
              <span>{submitting ? "Đang gửi đơn..." : "Gửi đơn xin nghỉ"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

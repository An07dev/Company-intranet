"use client";

import React, { useState } from "react";
import { LeaveOtRequest } from "@/types";
import { Spinner } from "@/components/ui/Loading";
import { useAuth } from "@/context/AuthContext";

interface ReviewRequestModalProps {
  request: LeaveOtRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewRequestModal({
  request,
  isOpen,
  onClose,
  onSuccess,
}: ReviewRequestModalProps) {
  const { user } = useAuth();
  const isDirectorOrAdmin = user?.role === "director" || user?.role === "admin";
  const [approvalNote, setApprovalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !request) return null;

  const handleReview = async (status: "approved" | "rejected") => {
    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          approvalNote: approvalNote.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Xử lý đơn thất bại");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra khi phê duyệt đơn.");
    } finally {
      setSubmitting(false);
    }
  };

  const isLeave = request.type === "leave";

  const leaveTypeLabels: Record<string, string> = {
    annual: "Nghỉ phép năm",
    sick: "Nghỉ ốm đau",
    unpaid: "Nghỉ không lương",
    remote_wfh: "Làm việc từ xa (WFH)",
    bereavement_marriage: "Việc riêng (Hiếu, hỷ)",
    maternity_paternity: "Nghỉ thai sản",
  };

  const otTypeLabels: Record<string, string> = {
    weekday: "Ngày thường (150%)",
    weekend: "Cuối tuần (200%)",
    holiday: "Ngày lễ / Tết (300%)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base ${
                isLeave
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              }`}
            >
              {isLeave ? "🏖️" : "⚡"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {isDirectorOrAdmin ? "Phê Duyệt" : "Xem Chi Tiết"} {isLeave ? "Đơn Nghỉ Phép" : "Đơn Xin Làm Thêm (OT)"}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Cấp duyệt: Giám đốc
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Mã đơn: <span className="font-mono">{request.id}</span>
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

        {/* Nội dung chi tiết đơn */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Thông báo quy định Giám đốc duyệt */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <span className="text-base shrink-0">🏛️</span>
            <div>
              <p className="font-bold text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Quy Định Phê Duyệt Của Công Ty
              </p>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                Tất cả các đơn xin nghỉ phép và đơn đăng ký làm thêm giờ (OT) đều bắt buộc phải qua <strong>Giám đốc</strong> xem xét và phê duyệt.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {!isDirectorOrAdmin && (
            <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Bạn đang xem đơn ở chế độ chỉ đọc. Chỉ tài khoản <strong>Giám đốc</strong> mới có thẩm quyền thực hiện Phê duyệt hoặc Từ chối đơn này.</span>
            </div>
          )}

          {/* Thông tin nhân viên */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Nhân sự nộp đơn:</span>
              <div className="flex items-center gap-2">
                {request.userAvatar ? (
                  <img
                    src={request.userAvatar}
                    alt={request.userName}
                    className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                    {request.userName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {request.userName}{" "}
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">
                    {request.employeeCode}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Phòng ban:</span>
              <span className="text-zinc-700 dark:text-zinc-300">{request.department}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Thời điểm gửi đơn:</span>
              <span className="font-mono text-zinc-600 dark:text-zinc-400">
                {new Date(request.createdAt).toLocaleString("vi-VN")}
              </span>
            </div>
          </div>

          {/* Chi tiết nội dung xin nghỉ hoặc OT */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Hình thức:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {isLeave
                  ? leaveTypeLabels[request.leaveType || ""] || request.leaveType
                  : otTypeLabels[request.otType || ""] || request.otType}
              </span>
            </div>

            {isLeave ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Thời gian nghỉ:</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {request.startDate} {request.startDate !== request.endDate ? `đến ${request.endDate}` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Tổng số ngày:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {request.durationDays} ngày
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Ngày làm thêm:</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {request.otDate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Khung giờ OT:</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                    {request.startTime} - {request.endTime} ({request.durationHours} giờ)
                  </span>
                </div>
                {request.projectOrTask && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Dự án / Nhiệm vụ:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                      {request.projectOrTask}
                    </span>
                  </div>
                )}
              </>
            )}

            <div>
              <span className="text-zinc-500 dark:text-zinc-400 block mb-1">Lý do xin:</span>
              <p className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 leading-relaxed italic">
                "{request.reason}"
              </p>
            </div>
          </div>

          {/* Nhập ghi chú phản hồi duyệt - Chỉ hiển thị cho Giám đốc */}
          {isDirectorOrAdmin && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Ý kiến phản hồi / Ghi chú phê duyệt của Giám đốc
              </label>
              <textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Nhập ghi chú chỉ đạo hoặc lý do nếu từ chối (tùy chọn)..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
          )}

          {/* Footer nút hành động: Phê duyệt vs Từ chối */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              {isDirectorOrAdmin ? "Hủy bỏ" : "Đóng"}
            </button>

            {isDirectorOrAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleReview("rejected")}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Spinner size="xs" color="white" />}
                  <span>Từ chối</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReview("approved")}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Spinner size="xs" color="white" />}
                  <span>Giám Đốc Phê Duyệt</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

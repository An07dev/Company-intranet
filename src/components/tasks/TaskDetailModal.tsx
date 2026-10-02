"use client";

import React, { useState } from "react";
import { Task, User, TaskStatus, TaskPriority } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentUser: User | null;
  onTaskUpdated: (updatedTask: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

const statusOptions: { value: TaskStatus; label: string; badgeClass: string }[] = [
  { value: "todo", label: "Cần làm", badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  { value: "in_progress", label: "Đang thực hiện", badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800" },
  { value: "review", label: "Chờ phê duyệt", badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800" },
  { value: "completed", label: "Đã hoàn thành", badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" },
  { value: "cancelled", label: "Đã hủy bỏ", badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800" },
];

const priorityBadges: Record<TaskPriority, { label: string; class: string }> = {
  urgent: { label: "🔴 Khẩn cấp", class: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800" },
  high: { label: "🟠 Cao", class: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800" },
  medium: { label: "🔵 Trung bình", class: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800" },
  low: { label: "🟢 Thấp", class: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700" },
};

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  currentUser,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !task || !currentUser) return null;

  const isOwner = task.creatorId === currentUser.id;
  const isAssignee = task.assigneeId === currentUser.id;
  const isDirectorOrAdmin = currentUser.role === "admin" || currentUser.role === "director";
  const isDeptManager =
    currentUser.role === "manager" &&
    currentUser.department &&
    (currentUser.department.toLowerCase() === task.department.toLowerCase() ||
      currentUser.department.toLowerCase() === (task.assigneeDepartment || "").toLowerCase());

  const canEdit = isOwner || isAssignee || isDirectorOrAdmin || isDeptManager;
  const canDelete = isOwner || isDirectorOrAdmin || isDeptManager;

  const currentBadge = statusOptions.find((s) => s.value === task.status) || statusOptions[0];
  const priorityBadge = priorityBadges[task.priority] || priorityBadges.medium;

  // Toggle checklist item
  const handleToggleChecklist = async (itemId: string, currentCompleted: boolean) => {
    if (!canEdit) return;

    const updatedChecklist = (task.checklist || []).map((item) =>
      item.id === itemId ? { ...item, completed: !currentCompleted } : item
    );

    try {
      setSubmitting(true);
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: updatedChecklist }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Không thể cập nhật mục này");
      }
      onTaskUpdated(json.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi cập nhật checklist");
    } finally {
      setSubmitting(false);
    }
  };

  // Change status
  const handleChangeStatus = async (newStatus: TaskStatus) => {
    if (!canEdit || newStatus === task.status) return;

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Không thể cập nhật trạng thái");
      }
      onTaskUpdated(json.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi cập nhật trạng thái");
    } finally {
      setSubmitting(false);
    }
  };

  // Change progress slider
  const handleChangeProgress = async (newProgress: number) => {
    if (!canEdit) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: newProgress }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Lỗi cập nhật tiến độ");
      }
      onTaskUpdated(json.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi cập nhật");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete task
  const handleDeleteTask = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Xóa thất bại");
      }
      onTaskDeleted(task.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi khi xóa công việc");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-wrap">
            <span className={`px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold shrink-0 ${currentBadge.badgeClass}`}>
              {currentBadge.label}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold shrink-0 ${priorityBadge.class}`}>
              {priorityBadge.label}
            </span>
            <span className="text-[11px] sm:text-xs text-zinc-400 font-mono truncate hidden sm:inline">
              #{task.id}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 space-y-4 sm:space-y-5 text-xs min-w-0">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tiêu đề & Phòng ban */}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium">
                🏢 {task.department}
              </span>
              {task.dueDate && (
                <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                  <span>📅 Hạn chót:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{task.dueDate}</strong>
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
              {task.title}
            </h2>
          </div>

          {/* Mô tả */}
          <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {task.description || "Chưa có mô tả chi tiết cho nhiệm vụ này."}
          </div>

          {/* Người giao việc & Người nhận việc (HIỂN THỊ AVATAR ĐẦY ĐỦ CẢ HAI) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Người nhận việc */}
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                👤 Người thực hiện (Assignee)
              </span>
              <div className="flex items-center gap-3">
                {task.assigneeAvatar ? (
                  <img
                    src={task.assigneeAvatar}
                    alt={task.assigneeName}
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-blue-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                    {task.assigneeName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5 truncate">
                    <span>{task.assigneeName}</span>
                    {task.assigneeCode && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {task.assigneeCode}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{task.assigneeEmail}</p>
                </div>
              </div>
            </div>

            {/* Người giao việc */}
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                👑 Người giao việc (Creator)
              </span>
              <div className="flex items-center gap-3">
                {task.creatorAvatar ? (
                  <img
                    src={task.creatorAvatar}
                    alt={task.creatorName}
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-amber-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-sm shrink-0 border border-amber-300 dark:border-amber-800">
                    {task.creatorName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs truncate">
                    {task.creatorName}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {task.creatorRole === "admin"
                      ? "Quản trị viên"
                      : task.creatorRole === "director"
                      ? "Giám đốc"
                      : task.creatorRole === "manager"
                      ? "Trưởng phòng"
                      : "Nhân viên"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Thanh Tiến độ & Checklist */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Tiến độ thực hiện: <b className="font-mono text-blue-600 dark:text-blue-400">{task.progress}%</b>
              </span>
              {task.completedAt && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Hoàn thành lúc: {new Date(task.completedAt).toLocaleDateString("vi-VN")}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  task.progress === 100
                    ? "bg-emerald-500"
                    : task.progress > 50
                    ? "bg-blue-600"
                    : "bg-amber-500"
                }`}
                style={{ width: `${task.progress}%` }}
              />
            </div>

            {/* Slider điều chỉnh tiến độ nếu có quyền */}
            {canEdit && task.checklist?.length === 0 && (
              <div className="pt-1 flex items-center gap-3">
                <span className="text-[11px] text-zinc-400">Kéo để cập nhật:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={task.progress}
                  onChange={(e) => handleChangeProgress(Number(e.target.value))}
                  disabled={submitting}
                  className="flex-1 accent-blue-600 cursor-pointer"
                />
              </div>
            )}

            {/* Checklist */}
            {task.checklist && task.checklist.length > 0 && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Đầu việc con ({task.checklist.filter((c) => c.completed).length}/{task.checklist.length})
                </span>
                <div className="space-y-1.5">
                  {task.checklist.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border transition ${
                        item.completed
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-zinc-500 dark:text-zinc-400 line-through"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                      } ${canEdit ? "cursor-pointer hover:border-zinc-300" : "cursor-default"}`}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        disabled={!canEdit || submitting}
                        onChange={() => handleToggleChecklist(item.id, item.completed)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs flex-1">{item.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chuyển đổi trạng thái nhanh */}
          {canEdit && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                Chuyển trạng thái công việc:
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {statusOptions.map((opt) => {
                  const isActive = task.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isActive || submitting}
                      onClick={() => handleChangeStatus(opt.value)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                        isActive
                          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vùng Xóa công việc nếu có quyền */}
          {canDelete && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {confirmDelete ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-rose-600 text-xs font-medium">Bạn có chắc chắn muốn xóa?</span>
                  <button
                    type="button"
                    onClick={handleDeleteTask}
                    disabled={submitting}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition cursor-pointer active:scale-95"
                  >
                    Xác nhận xóa
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs transition cursor-pointer active:scale-95"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>🗑️</span>
                  <span>Xóa công việc này</span>
                </button>
              )}

              <span className="text-[11px] text-zinc-400">
                Tạo ngày {new Date(task.createdAt).toLocaleDateString("vi-VN")}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 sm:py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

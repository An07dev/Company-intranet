"use client";

import React, { useState, useEffect } from "react";
import { Task, User, TaskPriority, TaskStatus, TaskChecklistItem } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentUser: User | null;
  onTaskUpdated: (updatedTask: Task) => void;
}

const priorityOptions: { value: TaskPriority; label: string; activeClass: string; inactiveClass: string }[] = [
  {
    value: "urgent",
    label: "Khẩn cấp",
    activeClass: "bg-rose-600 text-white border-rose-600 shadow-xs",
    inactiveClass: "bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100/60",
  },
  {
    value: "high",
    label: "Cao",
    activeClass: "bg-amber-600 text-white border-amber-600 shadow-xs",
    inactiveClass: "bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100/60",
  },
  {
    value: "medium",
    label: "Trung bình",
    activeClass: "bg-blue-600 text-white border-blue-600 shadow-xs",
    inactiveClass: "bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 hover:bg-blue-100/60",
  },
  {
    value: "low",
    label: "Thấp",
    activeClass: "bg-zinc-700 text-white border-zinc-700 shadow-xs",
    inactiveClass: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700",
  },
];

const statusOptions: { value: TaskStatus; label: string; dotClass: string }[] = [
  { value: "todo", label: "Cần làm", dotClass: "bg-zinc-400" },
  { value: "in_progress", label: "Đang thực hiện", dotClass: "bg-blue-500" },
  { value: "review", label: "Chờ phê duyệt", dotClass: "bg-amber-500" },
  { value: "completed", label: "Đã hoàn thành", dotClass: "bg-emerald-500" },
  { value: "cancelled", label: "Đã hủy bỏ", dotClass: "bg-rose-500" },
];

export function EditTaskModal({
  isOpen,
  onClose,
  task,
  currentUser,
  onTaskUpdated,
}: EditTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [department, setDepartment] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [progress, setProgress] = useState(0);

  // Checklist
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");

  // Dữ liệu hỗ trợ
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Quyền phân quyền
  const isOwner = task?.creatorId === currentUser?.id;
  const isAssignee = task?.assigneeId === currentUser?.id;
  const isDirectorOrAdmin = currentUser?.role === "admin" || currentUser?.role === "director";
  const isDeptManager =
    currentUser?.role === "manager" &&
    currentUser?.department &&
    (currentUser.department.toLowerCase() === (task?.department || "").toLowerCase() ||
      currentUser.department.toLowerCase() === (task?.assigneeDepartment || "").toLowerCase());

  const canEdit = isOwner || isAssignee || isDirectorOrAdmin || isDeptManager;
  const canReassign = isOwner || isDirectorOrAdmin || isDeptManager;

  // Điền dữ liệu từ task khi mở modal
  useEffect(() => {
    if (!isOpen || !task) return;

    setErrorMsg("");
    setTitle(task.title || "");
    setDescription(task.description || "");
    setAssigneeId(task.assigneeId || "");
    setDepartment(task.department || "");
    setPriority(task.priority || "medium");
    setStatus(task.status || "todo");
    setDueDate(task.dueDate || "");
    setProgress(typeof task.progress === "number" ? task.progress : 0);
    setChecklist(
      Array.isArray(task.checklist)
        ? task.checklist.map((item) => ({ ...item }))
        : []
    );
    setNewChecklistText("");

    // Tải danh sách phòng ban
    setLoadingDepartments(true);
    fetch("/api/departments")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setDepartmentsList(
            json.data.map((d: { id: string; name: string; code?: string }) => ({
              id: d.id,
              name: d.name,
              code: d.code,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDepartments(false));

    // Tải danh sách người dùng để phân công
    setLoadingUsers(true);
    fetch("/api/users?limit=200")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.items) {
          setAllUsers(json.data.items);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [isOpen, task]);

  if (!isOpen || !task || !currentUser) return null;

  // Sắp xếp danh sách nhân sự: Director -> Admin -> Manager -> Employee
  const roleRank: Record<string, number> = {
    director: 1,
    admin: 2,
    manager: 3,
    employee: 4,
  };

  const eligibleAssignees = [...allUsers]
    .filter((u) => u.status !== "inactive")
    .sort((a, b) => {
      const rankA = roleRank[a.role] || 99;
      const rankB = roleRank[b.role] || 99;
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || "").localeCompare(b.name || "", "vi");
    });

  // Checklist actions
  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem: TaskChecklistItem = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newChecklistText.trim(),
      completed: false,
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewChecklistText("");

    // Tự động tính toán lại % nếu muốn
    const completedCount = updated.filter((c) => c.completed).length;
    const newProg = Math.round((completedCount / updated.length) * 100);
    setProgress(newProg);
    if (newProg === 100 && status !== "completed") setStatus("completed");
    else if (newProg < 100 && status === "completed") setStatus("in_progress");
  };

  const handleToggleChecklistItem = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);

    if (updated.length > 0) {
      const completedCount = updated.filter((c) => c.completed).length;
      const newProg = Math.round((completedCount / updated.length) * 100);
      setProgress(newProg);
      if (newProg === 100 && status !== "completed") setStatus("completed");
      else if (newProg < 100 && status === "completed") setStatus("in_progress");
    }
  };

  const handleEditChecklistTitle = (id: string, newTitle: string) => {
    setChecklist(checklist.map((item) => (item.id === id ? { ...item, title: newTitle } : item)));
  };

  const handleRemoveChecklistItem = (id: string) => {
    const updated = checklist.filter((item) => item.id !== id);
    setChecklist(updated);

    if (updated.length > 0) {
      const completedCount = updated.filter((c) => c.completed).length;
      const newProg = Math.round((completedCount / updated.length) * 100);
      setProgress(newProg);
      if (newProg === 100 && status !== "completed") setStatus("completed");
      else if (newProg < 100 && status === "completed") setStatus("in_progress");
    }
  };

  // Đồng bộ trạng thái và tiến độ
  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    if (newStatus === "completed") {
      setProgress(100);
      // Đánh dấu tất cả checklist hoàn thành nếu chuyển sang completed
      if (checklist.length > 0) {
        setChecklist(checklist.map((c) => ({ ...c, completed: true })));
      }
    } else if (status === "completed" && progress === 100) {
      setProgress(50);
    }
  };

  const handleProgressChange = (newProg: number) => {
    const clamped = Math.max(0, Math.min(100, newProg));
    setProgress(clamped);
    if (clamped === 100 && status !== "completed") {
      setStatus("completed");
    } else if (clamped < 100 && status === "completed") {
      setStatus("in_progress");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMsg("Bạn không có quyền chỉnh sửa công việc này");
      return;
    }

    if (!title.trim()) {
      setErrorMsg("Vui lòng nhập tiêu đề công việc");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        department: department.trim() || undefined,
        priority,
        status,
        progress,
        dueDate: dueDate || "",
        checklist,
      };

      // Chỉ gửi assigneeId nếu có thay đổi và có quyền
      if (canReassign && assigneeId && assigneeId !== task.assigneeId) {
        payload.assigneeId = assigneeId;
      }

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Cập nhật công việc thất bại");
      }

      onTaskUpdated(json.data);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-base sm:text-lg shadow-xs shrink-0">
              ✏️
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Chỉnh Sửa Công Việc / Nhiệm Vụ
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Cập nhật thông tin, người nhận việc, hạn chót và danh mục con
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-3.5 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 space-y-4 text-xs min-w-0"
        >
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Tiêu đề công việc */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
              Tiêu đề công việc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Kiểm tra và cấu hình hệ thống tường lửa quý 4..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* 2. Mô tả */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
              Mô tả chi tiết &amp; Yêu cầu đầu ra
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nêu rõ mục tiêu, phạm vi công việc, hướng dẫn hoặc tài liệu đính kèm..."
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 leading-relaxed"
            />
          </div>

          {/* 3. Phân công người thực hiện & Phòng ban */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Người nhận việc */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Người thực hiện (Assignee) <span className="text-rose-500">*</span>
                </label>
                {loadingUsers && (
                  <span className="text-[10px] text-zinc-400 animate-pulse">Đang tải...</span>
                )}
              </div>

              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={!canReassign}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {eligibleAssignees.map((u) => {
                  const roleLabel =
                    u.role === "director"
                      ? "Giám đốc"
                      : u.role === "admin"
                      ? "Admin"
                      : u.role === "manager"
                      ? "Trưởng phòng"
                      : "Nhân viên";

                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} ({roleLabel}
                      {u.department ? ` - ${u.department}` : ""})
                      {u.id === currentUser.id ? " ★ (Tôi)" : ""}
                    </option>
                  );
                })}
              </select>

              {!canReassign && (
                <p className="text-[10px] text-zinc-400 mt-1">
                  Chỉ người giao việc, Trưởng phòng hoặc Ban giám đốc mới được phân công lại người khác.
                </p>
              )}
            </div>

            {/* Phòng ban phụ trách */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Phòng ban phụ trách
                </label>
                {loadingDepartments && (
                  <span className="text-[10px] text-zinc-400 animate-pulse">Đang tải...</span>
                )}
              </div>

              {departmentsList.length > 0 ? (
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
                >
                  <option value="">-- Mặc định theo phòng ban người thực hiện --</option>
                  {departmentsList.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.code ? `(${d.code})` : ""}
                    </option>
                  ))}
                  <option value="Toàn công ty">Toàn công ty</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="VD: Phòng Kỹ Thuật..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              )}
            </div>
          </div>

          {/* 4. Trạng thái & Mức độ ưu tiên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Trạng thái */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Trạng thái công việc
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {statusOptions.map((opt) => {
                  const isActive = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleStatusChange(opt.value)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border active:scale-95 ${
                        isActive
                          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs"
                          : "bg-zinc-50 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-white dark:bg-zinc-900" : opt.dotClass}`} />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mức độ ưu tiên */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Mức độ ưu tiên
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {priorityOptions.map((p) => {
                  const isActive = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer text-center border active:scale-95 ${
                        isActive ? p.activeClass : p.inactiveClass
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. Tiến độ & Hạn chót */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80">
            {/* Tiến độ (%) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Tiến độ hoàn thành
                </label>
                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                  {progress}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  className="flex-1 accent-blue-600 cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-center text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Hạn chót */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Hạn chót hoàn thành
                </label>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                  >
                    Xóa hạn
                  </button>
                )}
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono cursor-pointer"
              />
            </div>
          </div>

          {/* 6. Danh sách công việc con (Checklist) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>📋 Danh sách đầu việc con (Checklist)</span>
                {checklist.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {checklist.filter((c) => c.completed).length}/{checklist.length} xong
                  </span>
                )}
              </label>
              <span className="text-[10px] text-zinc-400">Tự động đồng bộ tiến độ</span>
            </div>

            {/* Ô thêm mục mới */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Nhập tên việc con cần làm rồi bấm Enter hoặc nút Thêm..."
                className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                disabled={!newChecklistText.trim()}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                + Thêm
              </button>
            </div>

            {/* Danh sách items */}
            {checklist.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {checklist.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 group"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleEditChecklistTitle(item.id, e.target.value)}
                      className={`flex-1 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none ${
                        item.completed ? "line-through text-zinc-400 dark:text-zinc-500" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 p-1 rounded-md transition cursor-pointer"
                      title="Xóa mục này"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer nút hành động */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

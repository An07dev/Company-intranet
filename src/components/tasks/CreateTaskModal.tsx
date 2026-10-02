"use client";

import React, { useState, useEffect } from "react";
import { User, TaskPriority, Task } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onTaskCreated: (newTask: Task) => void;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  currentUser,
  onTaskCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [department, setDepartment] = useState("");

  // Checklist con
  const [checklistItems, setChecklistItems] = useState<{ id: string; title: string }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");

  // Danh sách users có thể giao việc
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Danh sách phòng ban query từ cơ sở dữ liệu
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isEmployee = currentUser?.role === "employee";
  const isManager = currentUser?.role === "manager";
  const isDirectorOrAdmin = currentUser?.role === "admin" || currentUser?.role === "director";

  // Tải danh sách nhân sự để chọn người nhận việc
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg("");
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
    setChecklistItems([]);
    setNewChecklistText("");

    if (currentUser) {
      setAssigneeId(currentUser.id);
      setDepartment(currentUser.department || "");
    }

    // Query danh sách phòng ban lưu sẵn trong cơ sở dữ liệu
    setLoadingDepartments(true);
    fetch("/api/departments")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const list = json.data.map((d: { id: string; name: string; code: string }) => ({
            id: d.id,
            name: d.name,
            code: d.code,
          }));
          setDepartmentsList(list);

          // Nếu chưa có department hoặc tài khoản chưa có department, chọn phòng ban đầu tiên trong DB
          if (currentUser?.department) {
            setDepartment(currentUser.department);
          } else if (list.length > 0) {
            setDepartment(list[0].name);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDepartments(false));

    if (!isEmployee) {
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
    }
  }, [isOpen, currentUser, isEmployee]);

  if (!isOpen || !currentUser) return null;

  // Lọc danh sách nhân viên có thể giao việc theo đúng thẩm quyền:
  // - Quản lý: chỉ cùng phòng ban hoặc chính mình
  // - Admin / Director: toàn công ty
  const eligibleAssignees = allUsers.filter((u) => {
    if (u.id === currentUser.id) return true;
    if (isDirectorOrAdmin) return true;
    if (isManager) {
      const myDept = (currentUser.department || "").trim().toLowerCase();
      const uDept = (u.department || "").trim().toLowerCase();
      return myDept && myDept === uDept;
    }
    return false;
  });

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklistItems([
      ...checklistItems,
      { id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, title: newChecklistText.trim() },
    ]);
    setNewChecklistText("");
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Vui lòng nhập tiêu đề công việc");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload = {
        title: title.trim(),
        description: description.trim(),
        assigneeId: isEmployee ? currentUser.id : assigneeId || currentUser.id,
        department: department.trim() || currentUser.department || "Toàn công ty",
        priority,
        dueDate: dueDate || undefined,
        checklist: checklistItems.map((c) => ({ title: c.title, completed: false })),
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Tạo công việc thất bại");
      }

      onTaskCreated(json.data);
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
              ⚡
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Tạo Công Việc / Nhiệm Vụ Mới
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                {isEmployee
                  ? "Tự tạo công việc cá nhân cần hoàn thành"
                  : isManager
                  ? `Giao việc cho nhân sự thuộc phòng ${currentUser.department || ""}`
                  : "Phân bổ và giao việc toàn công ty"}
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
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 space-y-3.5 sm:space-y-4 text-xs min-w-0">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Tiêu đề */}
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
              Mô tả chi tiết & Yêu cầu đầu ra
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nêu rõ mục tiêu, phạm vi công việc, hướng dẫn hoặc tài liệu đính kèm..."
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 leading-relaxed"
            />
          </div>

          {/* 3. Phân công người thực hiện & Mức độ ưu tiên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Người nhận việc */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Người thực hiện (Assignee)
              </label>

              {isEmployee ? (
                <div className="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{currentUser.name} (Chính bạn)</p>
                    <p className="text-[10px] text-zinc-400 truncate">{currentUser.email}</p>
                  </div>
                </div>
              ) : (
                <select
                  value={assigneeId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setAssigneeId(selId);
                    const selected = eligibleAssignees.find((u) => u.id === selId);
                    if (selected?.department) {
                      setDepartment(selected.department);
                    }
                  }}
                  disabled={loadingUsers}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                >
                  <option value={currentUser.id}>Giao cho chính mình ({currentUser.name})</option>
                  {eligibleAssignees
                    .filter((u) => u.id !== currentUser.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.employeeCode || "NV"} - {u.department || "Chưa phòng ban"})
                      </option>
                    ))}
                </select>
              )}

              {isManager && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  * Trưởng phòng chỉ có quyền phân công cho nhân sự trong phòng ban ({currentUser.department || "N/A"}).
                </p>
              )}
            </div>

            {/* Mức độ ưu tiên */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              >
                <option value="low">🟢 Thấp (Low)</option>
                <option value="medium">🔵 Trung bình (Medium)</option>
                <option value="high">🟠 Cao (High)</option>
                <option value="urgent">🔴 Khẩn cấp (Urgent)</option>
              </select>
            </div>
          </div>

          {/* 4. Hạn chót & Phòng ban */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Hạn chót hoàn thành (Deadline)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center justify-between">
                <span>
                  Thuộc Phòng Ban <span className="text-rose-500">*</span>
                </span>
                {loadingDepartments && (
                  <span className="text-[10px] text-zinc-400 font-normal">Đang tải DB...</span>
                )}
              </label>

              {isEmployee ? (
                /* Với nhân viên: Cố định theo phòng ban đã lưu trong DB của tài khoản */
                <div className="px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    🏢 {department || currentUser.department || "Chưa phân bổ"}
                  </span>
                  <span className="text-[10px] text-zinc-400 shrink-0 font-medium">
                    Phòng của bạn
                  </span>
                </div>
              ) : isManager ? (
                /* Với Trưởng phòng: Phòng ban quản lý trong DB */
                <div className="px-3.5 py-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 text-xs text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 truncate">
                    👑 {currentUser.department || department || "Chưa phân bổ"}
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium shrink-0">
                    Phòng bạn quản lý
                  </span>
                </div>
              ) : (
                /* Với Giám đốc & Admin: Chọn đúng từ danh sách phòng ban query từ DB */
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={loadingDepartments}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
                >
                  <option value="">-- Chọn phòng ban từ cơ sở dữ liệu --</option>
                  {departmentsList.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                  {department && !departmentsList.some((d) => d.name === department) && (
                    <option value={department}>{department}</option>
                  )}
                </select>
              )}
            </div>
          </div>

          {/* 5. Checklist nhiệm vụ con */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
              Danh sách đầu việc con (Checklist)
            </label>

            {/* List checklist items */}
            {checklistItems.length > 0 && (
              <div className="space-y-1.5 mb-2.5">
                {checklistItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-zinc-400 text-[10px] w-4">{idx + 1}.</span>
                      <span className="text-zinc-800 dark:text-zinc-200 truncate">{item.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="text-zinc-400 hover:text-rose-500 transition px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add checklist input */}
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
                placeholder="Thêm một đầu việc con và nhấn Enter..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" />
                  <span>Đang tạo công việc...</span>
                </>
              ) : (
                <span>Tạo công việc</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

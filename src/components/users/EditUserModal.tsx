"use client";

import React, { useState, useEffect } from "react";
import { User, UserRole, UserStatus, ContractType } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableDepartments: string[];
}

export function EditUserModal({
  user,
  isOpen,
  onClose,
  onSuccess,
  availableDepartments,
}: EditUserModalProps) {
  const [name, setName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [customDept, setCustomDept] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [contractType, setContractType] = useState<ContractType>("official");
  const [officialStartDate, setOfficialStartDate] = useState("");
  const [status, setStatus] = useState<UserStatus>("active");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmployeeCode(user.employeeCode || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      const isKnownDept = availableDepartments.includes(user.department || "");
      if (isKnownDept || !user.department) {
        setDepartment(user.department || availableDepartments[0] || "Bộ Phận Phát Triển Sản Phẩm");
        setCustomDept("");
      } else {
        setDepartment("custom");
        setCustomDept(user.department);
      }
      setRole(user.role || "employee");
      setContractType(user.contractType || "official");
      setOfficialStartDate(user.officialStartDate || user.createdAt?.slice(0, 10) || "");
      setStatus(user.status || "active");
      setErrorMsg("");
    }
  }, [user, availableDepartments]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên nhân sự");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Vui lòng nhập email hợp lệ");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const finalDepartment = department === "custom" ? customDept.trim() : department;

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          employeeCode: employeeCode.trim() || undefined,
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          department: finalDepartment || "Khác",
          role,
          status,
          contractType,
          officialStartDate: contractType === "official" ? officialStartDate : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Cập nhật tài khoản thất bại");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra khi cập nhật");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
              ✏️
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Chỉnh Sửa Thông Tin Người Dùng
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Cập nhật chức danh, phòng ban và quyền hạn tài khoản
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* 1. Họ và tên & Mã nhân viên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Mã nhân viên
              </label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
              />
            </div>
          </div>

          {/* 2. Email & Số điện thoại */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Email đăng nhập <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0987654321"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>
          </div>

          {/* 3. Phòng ban & Vai trò */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Phòng ban
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
              >
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                <option value="custom">+ Thêm phòng ban khác...</option>
              </select>

              {department === "custom" && (
                <input
                  type="text"
                  required
                  value={customDept}
                  onChange={(e) => setCustomDept(e.target.value)}
                  placeholder="Nhập tên phòng ban mới..."
                  className="w-full mt-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Vai trò / Quyền hạn <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
              >
                <option value="employee">👤 Nhân viên</option>
                <option value="manager">👔 Quản lý / Trưởng phòng</option>
                <option value="director">👑 Giám đốc điều hành</option>
                <option value="admin">🛡️ Quản trị viên (Admin)</option>
              </select>
            </div>
          </div>

          {/* 4. Phân loại nhân sự & Chế độ nghỉ phép */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Hình thức nhân viên &amp; Chế độ phép <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setContractType("official")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                    contractType === "official"
                      ? "border-blue-500 bg-blue-50/80 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-600 shadow-xs"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">
                    <span>🏢</span> Chính thức
                  </span>
                  <span className="text-[10px] mt-1 opacity-80">
                    Cộng 1 phép/tháng từ lúc lên chính thức (max 12)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setContractType("probation")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                    contractType === "probation"
                      ? "border-amber-500 bg-amber-50/80 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-600 shadow-xs"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">
                    <span>⏳</span> Thử việc
                  </span>
                  <span className="text-[10px] mt-1 opacity-80">
                    Không có phép năm theo quy định
                  </span>
                </button>
              </div>
            </div>

            {contractType === "official" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Ngày lên chính thức <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={officialStartDate}
                  onChange={(e) => setOfficialStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Số ngày phép năm sẽ được tính lũy tiến: mỗi tháng +1 ngày tính từ ngày này (tối đa 12 ngày/năm).
                </p>
              </div>
            )}
          </div>

          {/* 5. Trạng thái tài khoản */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Trạng thái hoạt động
            </label>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="edit-status"
                  value="active"
                  checked={status === "active"}
                  onChange={() => setStatus("active")}
                  className="accent-emerald-600"
                />
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  🟢 Đang hoạt động
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="edit-status"
                  value="inactive"
                  checked={status === "inactive"}
                  onChange={() => setStatus("inactive")}
                  className="accent-zinc-500"
                />
                <span className="text-zinc-600 dark:text-zinc-400">
                  🔴 Đã khóa / Tạm dừng
                </span>
              </label>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              {submitting && <Spinner size="sm" />}
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Department, User, UserRole, ContractType } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface DepartmentMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  canEdit: boolean;
  usersList: User[];
  onSuccess: () => void;
}

export function DepartmentMembersModal({
  isOpen,
  onClose,
  department,
  canEdit,
  usersList,
  onSuccess,
}: DepartmentMembersModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [contractFilter, setContractFilter] = useState<string>("all");
  const [allCompanyUsers, setAllCompanyUsers] = useState<User[]>(usersList || []);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sub-tab thêm nhân sự: "transfer" (chọn nhân sự có sẵn) hoặc "create" (tạo nhân sự mới)
  const [addMode, setAddMode] = useState<"transfer" | "create">("transfer");

  // Form tạo nhân sự mới trực tiếp cho phòng
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserCode, setNewUserCode] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("employee");
  const [newUserContract, setNewUserContract] = useState<ContractType>("official");
  const [newUserPassword, setNewUserPassword] = useState("employee123");

  // Fetch danh sách users toàn công ty để luôn có danh sách mới nhất
  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?limit=200");
      const json = await res.json();
      if (res.ok && json.success) {
        const list =
          json.data?.items ||
          json.data?.users ||
          (Array.isArray(json.data) ? json.data : []);
        setAllCompanyUsers(list);
      }
    } catch (e) {
      console.error("Lỗi tải users trong modal:", e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAllUsers();
      // Sinh mã nhân viên ngẫu nhiên mặc định
      const randomCode = `NV-${Math.floor(100 + Math.random() * 900)}`;
      setNewUserCode(randomCode);
    }
  }, [isOpen, fetchAllUsers]);

  useEffect(() => {
    if (usersList && usersList.length > 0) {
      setAllCompanyUsers(usersList);
    }
  }, [usersList]);

  if (!isOpen || !department) return null;

  const members = department.members || [];
  const manager = department.manager;

  // Lọc thành viên trong phòng
  const filteredMembers = members.filter((member) => {
    const matchSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.employeeCode && member.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchContract =
      contractFilter === "all" ||
      (contractFilter === "official" && member.contractType === "official") ||
      (contractFilter === "probation" && member.contractType === "probation");

    return matchSearch && matchContract;
  });

  // Danh sách nhân sự có thể thêm/chuyển vào phòng (chưa thuộc phòng này)
  const currentMemberIds = new Set(members.map((m) => m.id));
  const availableUsers = allCompanyUsers.filter((u) => !currentMemberIds.has(u.id));

  // Thực hiện điều chỉnh nhân sự sẵn có
  const handleAdjustMembers = async (action: "add" | "remove" | "set_manager", userId: string) => {
    try {
      setSubmittingAction(`${action}_${userId}`);
      setErrorMsg("");
      setSuccessMsg("");

      const res = await fetch(`/api/departments/${department.id}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userIds: [userId],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Thao tác điều chỉnh nhân sự thất bại");
      }

      setSuccessMsg(
        action === "add"
          ? "Đã thêm nhân sự vào phòng ban thành công"
          : action === "remove"
            ? "Đã rút nhân sự khỏi phòng ban"
            : "Đã cập nhật Trưởng phòng ban thành công"
      );

      setSelectedUserToAdd("");
      await fetchAllUsers();
      onSuccess();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmittingAction(null);
    }
  };

  // Tạo tài khoản nhân sự mới gán trực tiếp vào phòng ban này
  const handleCreateNewEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên nhân sự mới");
      return;
    }
    if (!newUserEmail.trim() || !newUserEmail.includes("@")) {
      setErrorMsg("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }

    try {
      setSubmittingAction("create_new_user");
      setErrorMsg("");
      setSuccessMsg("");

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim().toLowerCase(),
          employeeCode: newUserCode.trim() || undefined,
          phone: newUserPhone.trim() || undefined,
          role: newUserRole,
          department: department.name, // Gán trực tiếp vào phòng ban hiện tại
          contractType: newUserContract,
          password: newUserPassword || "employee123",
          status: "active",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Tạo nhân sự mới thất bại");
      }

      setSuccessMsg(`Đã tạo thành công nhân viên "${newUserName}" và gán vào ${department.name}`);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPhone("");
      setNewUserCode(`NV-${Math.floor(100 + Math.random() * 900)}`);
      setAddMode("transfer");

      await fetchAllUsers();
      onSuccess();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi khi tạo nhân sự mới");
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2.5 bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm sm:text-base shadow-xs shrink-0">
              👥
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {department.name}
                </h3>
                <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0 font-mono">
                  {department.code}
                </span>
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 shrink-0">
                  {members.length} nhân sự
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                {canEdit
                  ? "Điều chỉnh nhân sự, phân bổ thành viên & bổ nhiệm trưởng phòng"
                  : "Danh sách nhân sự & cơ cấu tổ chức phòng ban (Chế độ xem)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Thông báo quyền xem nếu không thể edit */}
        {!canEdit && (
          <div className="bg-amber-50 dark:bg-amber-950/30 px-3.5 sm:px-4 py-2 border-b border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 shrink-0">
            <span>ℹ️</span>
            <span>
              Bạn đang ở chế độ xem thông tin phòng ban. Chỉ có <b>Quản trị viên</b> hoặc <b>Giám đốc</b> mới có quyền điều chỉnh nhân sự.
            </span>
          </div>
        )}

        {/* Thông báo Alert trạng thái */}
        {errorMsg && (
          <div className="mx-3 sm:mx-5 mt-2.5 sm:mt-3 p-2.5 sm:p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">{errorMsg}</span>
            </div>
            <button type="button" onClick={() => setErrorMsg("")} className="text-xs hover:underline cursor-pointer shrink-0 ml-2 font-medium">
              Đóng
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-3 sm:mx-5 mt-2.5 sm:mt-3 p-2.5 sm:p-3 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0">✓</span>
              <span className="truncate">{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg("")} className="text-xs hover:underline cursor-pointer shrink-0 ml-2 font-medium">
              Đóng
            </button>
          </div>
        )}

        {/* Body chính có thanh cuộn dọc duy nhất, TUYỆT ĐỐI KHÔNG tràn ngang */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-4 sm:space-y-5 min-w-0">
          {/* Card Trưởng phòng ban */}
          {(manager || department.managerName) ? (
            <div className="p-3 sm:p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-linear-to-r from-amber-50/60 via-amber-50/30 to-transparent dark:from-amber-950/20 dark:via-amber-950/10 dark:to-transparent flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                {manager?.avatarUrl || department.managerAvatar ? (
                  <img
                    src={manager?.avatarUrl || department.managerAvatar}
                    alt={manager?.name || department.managerName}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 ring-2 ring-amber-400/60 shadow-xs"
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-sm border border-amber-300 dark:border-amber-800 shrink-0 shadow-xs">
                    {(manager?.name || department.managerName || "M").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {manager?.name || department.managerName}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/60 shrink-0">
                      👑 Trưởng phòng
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate flex items-center gap-2">
                    <span className="truncate">{manager?.email || department.managerEmail}</span>
                    {manager?.employeeCode && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
                        {manager.employeeCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs text-zinc-400 flex items-center gap-2">
              <span>👑</span>
              <span>Phòng ban này hiện chưa có Trưởng phòng được bổ nhiệm.</span>
            </div>
          )}

          {/* Vùng Thêm / Chuyển nhân sự vào phòng (Dành cho Admin/Director) */}
          {canEdit && (
            <div className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-3 min-w-0">
              {/* Header chuyển đổi tab thêm nhân viên */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setAddMode("transfer")}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer text-center truncate ${addMode === "transfer"
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                      }`}
                  >
                    Có sẵn ({availableUsers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("create")}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer text-center truncate flex items-center justify-center gap-1 ${addMode === "create"
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                      }`}
                  >
                    <span>➕ Tạo mới</span>
                  </button>
                </div>

                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {addMode === "transfer"
                    ? `${availableUsers.length} nhân sự có thể thêm`
                    : "Tạo tài khoản & gán trực tiếp vào phòng ban"}
                </span>
              </div>

              {/* Chế độ 1: Chọn nhân sự có sẵn */}
              {addMode === "transfer" && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1 items-stretch sm:items-center min-w-0">
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedUserToAdd}
                      onChange={(e) => setSelectedUserToAdd(e.target.value)}
                      className="w-full min-w-0 px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 truncate"
                    >
                      <option value="">-- Chọn nhân viên từ danh sách toàn công ty --</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.employeeCode || "NV"} - {u.email}) | Phòng hiện tại: {u.department || "Chưa phân bổ"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => selectedUserToAdd && handleAdjustMembers("add", selectedUserToAdd)}
                    disabled={!selectedUserToAdd || submittingAction !== null}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs whitespace-nowrap active:scale-98"
                  >
                    {submittingAction?.startsWith("add_") ? (
                      <>
                        <Spinner size="sm" />
                        <span>Đang thêm...</span>
                      </>
                    ) : (
                      <>
                        <span>+ Thêm vào phòng</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Chế độ 2: Tạo nhân sự mới trực tiếp */}
              {addMode === "create" && (
                <form onSubmit={handleCreateNewEmployee} className="space-y-3 pt-2 min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                    <div className="min-w-0">
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Họ và tên *
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Nguyễn Văn Anh"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        required
                        className="w-full min-w-0 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Địa chỉ Email *
                      </label>
                      <input
                        type="email"
                        placeholder="VD: vananh@company.internal"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        required
                        className="w-full min-w-0 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Mã nhân viên
                      </label>
                      <input
                        type="text"
                        value={newUserCode}
                        onChange={(e) => setNewUserCode(e.target.value.toUpperCase())}
                        placeholder="VD: NV-009"
                        className="w-full min-w-0 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        placeholder="VD: 0912345678"
                        className="w-full min-w-0 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Loại hợp đồng
                      </label>
                      <select
                        value={newUserContract}
                        onChange={(e) => setNewUserContract(e.target.value as ContractType)}
                        className="w-full min-w-0 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
                      >
                        <option value="official">Chính thức (Có phép năm)</option>
                        <option value="probation">Thử việc (Không có phép năm)</option>
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Vai trò hệ thống
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        className="w-full min-w-0 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
                      >
                        <option value="employee">Nhân viên (employee)</option>
                        <option value="manager">Quản lý (manager)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Mật khẩu khởi tạo: <b className="font-mono text-zinc-800 dark:text-zinc-200">{newUserPassword}</b>
                    </span>
                    <button
                      type="submit"
                      disabled={submittingAction === "create_new_user"}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      {submittingAction === "create_new_user" ? (
                        <>
                          <Spinner size="sm" className="text-white" />
                          <span>Đang tạo nhân sự...</span>
                        </>
                      ) : (
                        <span>+ Tạo & Thêm vào phòng ban</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Thanh tìm kiếm & lọc thành viên nội bộ (Chung 1 hàng ngang) */}
          <div className="flex items-center gap-2 pt-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Tìm tên, email, mã NV..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 min-w-0 pl-8 pr-7 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="shrink-0">
              <select
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="h-9 px-2.5 sm:px-3 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Tất cả hình thức</option>
                <option value="official">Chính thức</option>
                <option value="probation">Thử việc</option>
              </select>
            </div>
          </div>

          {/* Danh sách thành viên */}
          <div className="space-y-2 min-w-0">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Danh sách nhân viên ({filteredMembers.length})</span>
              {filteredMembers.length !== members.length && (
                <span className="text-[11px] text-zinc-400">
                  (Đã lọc từ tổng số {members.length})
                </span>
              )}
            </div>

            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-500 dark:text-zinc-400">
                {members.length === 0
                  ? "Phòng ban này chưa có nhân sự nào được phân bổ."
                  : "Không tìm thấy nhân viên nào phù hợp với bộ lọc."}
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 min-w-0">
                {filteredMembers.map((member) => {
                  const isManager = department.managerId === member.id;
                  const isBusy = submittingAction !== null;

                  return (
                    <div
                      key={member.id}
                      className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition min-w-0"
                    >
                      {/* Thông tin nhân viên */}
                      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700 mt-0.5 sm:mt-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold flex items-center justify-center text-xs shrink-0 border border-zinc-200 dark:border-zinc-700 mt-0.5 sm:mt-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                              {member.name}
                            </span>
                            {member.employeeCode && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono shrink-0">
                                {member.employeeCode}
                              </span>
                            )}
                            {isManager && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 shrink-0">
                                👑 Trưởng phòng
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {member.email}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                              {member.role === "admin"
                                ? "Quản trị viên"
                                : member.role === "director"
                                ? "Giám đốc"
                                : member.role === "manager"
                                ? "Quản lý"
                                : "Nhân viên"}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                member.contractType === "official"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {member.contractType === "official" ? "Chính thức" : "Thử việc"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Các thao tác dành cho Admin / Director */}
                      {canEdit && (
                        <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/60 shrink-0">
                          {!isManager && (
                            <button
                              type="button"
                              onClick={() => handleAdjustMembers("set_manager", member.id)}
                              disabled={isBusy}
                              title="Bổ nhiệm làm Trưởng phòng"
                              className="px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition disabled:opacity-50 cursor-pointer flex items-center gap-1 whitespace-nowrap active:scale-95"
                            >
                              <span>👑</span>
                              <span>Bổ nhiệm</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleAdjustMembers("remove", member.id)}
                            disabled={isBusy}
                            title="Rút nhân sự khỏi phòng ban này"
                            className="px-2.5 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition disabled:opacity-50 cursor-pointer flex items-center gap-1 whitespace-nowrap active:scale-95"
                          >
                            <span>✕</span>
                            <span>Rút khỏi phòng</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Tổng cộng: <b className="text-zinc-900 dark:text-zinc-100">{members.length}</b> nhân sự
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

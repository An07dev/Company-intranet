"use client";

import React, { useState } from "react";
import { User, ChatConversation } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newConv: ChatConversation) => void;
  usersList: User[];
  currentUserId: string;
}

const EMOJI_AVATARS = ["👥", "🚀", "💡", "🎯", "🔥", "⭐", "🎉", "☕", "⚽", "🎮", "📚", "🛠️"];

export function CreateGroupModal({
  isOpen,
  onClose,
  onSuccess,
  usersList,
  currentUserId,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("👥");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchMember, setSearchMember] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Lọc danh sách nhân viên để chọn (loại trừ bản thân)
  const availableUsers = usersList.filter((u) => u.id !== currentUserId);
  const filteredUsers = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchMember.toLowerCase()) ||
      u.email.toLowerCase().includes(searchMember.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchMember.toLowerCase()))
  );

  const toggleSelectMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setErrorMsg("Vui lòng nhập tên nhóm hội chat");
      return;
    }
    if (selectedMemberIds.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất 1 thành viên để tham gia nhóm");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "group",
          name: groupName.trim(),
          avatar: selectedEmoji,
          memberIds: selectedMemberIds,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Tạo nhóm thất bại");
      }

      setGroupName("");
      setSelectedMemberIds([]);
      onSuccess(json.data);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo nhóm");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg border border-blue-200 dark:border-blue-900/40">
              👥
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Tạo Hội Nhóm Chat Mới
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Thiết lập nhóm trao đổi công việc, dự án hoặc hội nhóm theo sở thích
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          {/* 1. Tên nhóm & Icon đại diện */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tên hội nhóm chat *
            </label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-lg flex items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  {selectedEmoji}
                </button>
              </div>
              <input
                type="text"
                placeholder="VD: Nhóm Dự Án Web Portal, Ban Văn Thể Mỹ..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            {/* Chọn Emoji đại diện */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] text-zinc-400 mr-1">Biểu tượng:</span>
              {EMOJI_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition cursor-pointer ${
                    selectedEmoji === emoji
                      ? "bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Chọn thành viên */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Thêm thành viên ({selectedMemberIds.length} đã chọn)
              </label>
              {selectedMemberIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds([])}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>

            {/* Tìm kiếm thành viên */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Tìm thành viên theo tên, email, phòng ban..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden"
              />
            </div>

            {/* Danh sách người dùng */}
            <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400">
                  Không tìm thấy nhân viên nào
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedMemberIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectMember(u.id)}
                      className={`p-2.5 flex items-center justify-between gap-2.5 transition cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/70 dark:bg-blue-950/30"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center text-xs shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {u.email} {u.department ? `• ${u.department}` : ""}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {isSelected && "✓"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <span>Tạo nhóm chat</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

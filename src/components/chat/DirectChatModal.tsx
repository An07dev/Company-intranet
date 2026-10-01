"use client";

import React, { useState } from "react";
import { User, ChatConversation } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface DirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (newConv: ChatConversation) => void;
  usersList: User[];
  currentUserId: string;
}

export function DirectChatModal({
  isOpen,
  onClose,
  onSelectUser,
  usersList,
  currentUserId,
}: DirectChatModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const availableUsers = usersList.filter((u) => u.id !== currentUserId);
  const filteredUsers = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.employeeCode && u.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStartChat = async (targetUser: User) => {
    try {
      setSubmittingId(targetUser.id);
      setErrorMsg("");

      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "direct",
          targetUserId: targetUser.id,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Không thể tạo cuộc trò chuyện");
      }

      onSelectUser(json.data);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header Modal */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-sm font-bold">
              💬
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Nhắn Tin Trực Tiếp (1-1)
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Chọn đồng nghiệp để bắt đầu cuộc trò chuyện riêng tư
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên, email, mã NV, phòng ban..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mx-3 mt-2 p-2.5 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 p-2">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Không tìm thấy đồng nghiệp nào
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isBusy = submittingId === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => !isBusy && handleStartChat(u)}
                  className="p-2.5 rounded-xl flex items-center justify-between gap-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center text-xs shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {u.name}
                        </span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                          {u.employeeCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {u.department || "Chưa phân bổ"} • {u.email}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isBusy ? (
                      <Spinner size="sm" />
                    ) : (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Nhắn tin →
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

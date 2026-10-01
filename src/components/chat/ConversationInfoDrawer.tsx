"use client";

import React, { useState } from "react";
import { ChatConversation, ChatMessage, User } from "@/types";

interface ConversationInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: ChatConversation;
  messages: ChatMessage[];
  currentUserId: string;
  allUsers: User[];
  onAddMember?: (userId: string) => void;
}

export function ConversationInfoDrawer({
  isOpen,
  onClose,
  conversation,
  messages,
  currentUserId,
  allUsers,
  onAddMember,
}: ConversationInfoDrawerProps) {
  const [activeTab, setActiveTab] = useState<"members" | "media">("members");
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");

  if (!isOpen) return null;

  // Lọc ra các tệp đính kèm trong cuộc trò chuyện
  const allAttachments = messages.flatMap((m) => m.attachments || []);
  const imageAttachments = allAttachments.filter((a) => a.type === "image");
  const fileAttachments = allAttachments.filter((a) => a.type === "file" || a.type === "video");

  // Thành viên có thể thêm vào nhóm
  const existingMemberIds = new Set(conversation.memberIds);
  const addableUsers = allUsers.filter((u) => !existingMemberIds.has(u.id));

  return (
    <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200">
      {/* Header Drawer */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Thông Tin Hội Thoại
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Info Overview */}
      <div className="p-5 flex flex-col items-center text-center border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-2xl font-bold mb-3 shadow-sm overflow-hidden">
          {conversation.avatar && conversation.avatar.length <= 4 ? (
            conversation.avatar
          ) : conversation.avatar ? (
            <img src={conversation.avatar} alt={conversation.name} className="w-full h-full object-cover" />
          ) : (
            conversation.name.charAt(0).toUpperCase()
          )}
        </div>
        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
          {conversation.name}
        </h4>
        <p className="text-[11px] text-zinc-400 mt-0.5">
          {conversation.type === "company" && "Kênh thảo luận toàn công ty"}
          {conversation.type === "department" && `Kênh nội bộ ${conversation.departmentName || "phòng ban"}`}
          {conversation.type === "direct" && "Trò chuyện trực tiếp 1-1"}
          {conversation.type === "group" && "Hội nhóm tự tạo"}
        </p>
      </div>

      {/* Tabs: Thành viên / Phương tiện */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`flex-1 py-2.5 text-center transition cursor-pointer border-b-2 ${
            activeTab === "members"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Thành viên ({conversation.members?.length || conversation.memberIds.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("media")}
          className={`flex-1 py-2.5 text-center transition cursor-pointer border-b-2 ${
            activeTab === "media"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Tệp &amp; Ảnh ({allAttachments.length})
        </button>
      </div>

      {/* Tab 1: Thành viên */}
      {activeTab === "members" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Thêm thành viên mới (nếu là nhóm chat) */}
          {conversation.type === "group" && onAddMember && addableUsers.length > 0 && (
            <div className="space-y-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block">
                + Thêm thành viên vào nhóm
              </span>
              <div className="flex gap-1.5">
                <select
                  value={selectedUserToAdd}
                  onChange={(e) => setSelectedUserToAdd(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">-- Chọn đồng nghiệp --</option>
                  {addableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.employeeCode})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedUserToAdd) {
                      onAddMember(selectedUserToAdd);
                      setSelectedUserToAdd("");
                    }
                  }}
                  disabled={!selectedUserToAdd}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-50 cursor-pointer"
                >
                  Thêm
                </button>
              </div>
            </div>
          )}

          {/* Danh sách thành viên */}
          <div className="space-y-2">
            {(conversation.members || []).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                      {m.name} {m.id === currentUserId ? "(Bạn)" : ""}
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate block">
                      {m.department || m.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Phương tiện & Tệp */}
      {activeTab === "media" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {allAttachments.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-400">
              Chưa có ảnh hoặc tệp nào được gửi
            </div>
          ) : (
            <>
              {/* Thư viện ảnh */}
              {imageAttachments.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
                    Hình ảnh ({imageAttachments.length})
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {imageAttachments.map((img) => (
                      <a
                        key={img.id}
                        href={img.url}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 block hover:opacity-90 transition"
                      >
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Tệp tài liệu & Video */}
              {fileAttachments.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
                    Tài liệu &amp; Video ({fileAttachments.length})
                  </span>
                  <div className="space-y-1.5">
                    {fileAttachments.map((f) => (
                      <a
                        key={f.id}
                        href={f.url}
                        download={f.name}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 transition text-xs"
                      >
                        <span className="text-base">{f.type === "video" ? "🎬" : "📎"}</span>
                        <span className="truncate flex-1 font-medium">{f.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

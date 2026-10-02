"use client";

import React, { useState } from "react";
import { ChatConversation, ChatConversationType } from "@/types";

interface ChatSidebarProps {
  conversations: ChatConversation[];
  selectedConvId: string | null;
  onSelectConversation: (conv: ChatConversation) => void;
  onOpenDirectModal: () => void;
  onOpenGroupModal: () => void;
  loading?: boolean;
}

export function ChatSidebar({
  conversations,
  selectedConvId,
  onSelectConversation,
  onOpenDirectModal,
  onOpenGroupModal,
  loading = false,
}: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<"all" | ChatConversationType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Lọc danh sách theo tab và từ khóa tìm kiếm
  const filteredConversations = conversations.filter((c) => {
    const matchesTab = activeTab === "all" || c.type === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.lastMessage?.content && c.lastMessage.content.toLowerCase().includes(q));

    return matchesTab && matchesSearch;
  });

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      if (isToday) {
        return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    } catch {
      return "";
    }
  };

  const getConvTypeBadge = (type: ChatConversationType) => {
    switch (type) {
      case "company":
        return <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">Công ty</span>;
      case "department":
        return <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">Phòng ban</span>;
      case "direct":
        return <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">1-1</span>;
      case "group":
        return <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">Nhóm</span>;
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
      {/* 1. Header Toolbar */}
      <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="shrink-0">💬</span>
            <span className="truncate">Hộp Thoại Nội Bộ</span>
          </h2>
          <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 truncate">
            {conversations.length} cuộc trò chuyện
          </p>
        </div>

        {/* Nút tạo mới */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenDirectModal}
            title="Nhắn tin 1-1 với đồng nghiệp"
            className="px-2 sm:px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-xs font-semibold flex items-center gap-1 shadow-2xs active:scale-95"
          >
            <span>💬</span>
            <span>1-1</span>
          </button>
          <button
            type="button"
            onClick={onOpenGroupModal}
            title="Tạo hội nhóm chat mới"
            className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer text-xs font-semibold flex items-center gap-1 shadow-2xs active:scale-95"
          >
            <span>+</span>
            <span>Nhóm</span>
          </button>
        </div>
      </div>

      {/* 2. Thanh tìm kiếm */}
      <div className="p-2.5 sm:p-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Tìm cuộc trò chuyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* 3. Filter Tabs */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition cursor-pointer active:scale-95 ${
              activeTab === "all"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("company")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition cursor-pointer ${
              activeTab === "company"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Công ty
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("department")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition cursor-pointer ${
              activeTab === "department"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Phòng ban
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("direct")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition cursor-pointer ${
              activeTab === "direct"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            1-1
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("group")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition cursor-pointer ${
              activeTab === "group"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Nhóm
          </button>
        </div>
      </div>

      {/* 4. Danh sách cuộc hội thoại */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className="p-2 sm:px-2.5 rounded-xl flex items-center gap-3 animate-pulse bg-zinc-50/50 dark:bg-zinc-800/20"
              >
                {/* Avatar Skeleton */}
                <div className="w-10 h-10 rounded-2xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />

                {/* Text Skeleton */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-md"
                        style={{ width: `${80 + (idx % 4) * 25}px` }}
                      />
                      <div className="h-3 w-12 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-full" />
                    </div>
                    <div className="h-2.5 w-8 bg-zinc-200/60 dark:bg-zinc-800/60 rounded" />
                  </div>
                  <div
                    className="h-2.5 bg-zinc-200/70 dark:bg-zinc-800/70 rounded"
                    style={{ width: `${110 + (idx % 3) * 35}px` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-zinc-400">
            Không tìm thấy cuộc trò chuyện nào
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConvId === conv.id;
            const hasUnread = (conv.unreadCount || 0) > 0;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`p-2.5 sm:p-3 sm:px-3.5 flex items-center gap-2.5 sm:gap-3 transition cursor-pointer active:scale-[0.99] ${
                  isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800/80 border-l-4 border-blue-600"
                    : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-base font-bold shadow-2xs overflow-hidden">
                    {conv.avatar && conv.avatar.length <= 4 ? (
                      conv.avatar
                    ) : conv.avatar ? (
                      <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" />
                    ) : (
                      conv.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Icon loại cuộc trò chuyện nhỏ góc */}
                  <div className="absolute -bottom-1 -right-1 text-[10px]">
                    {conv.type === "company" && "🏢"}
                    {conv.type === "department" && "💼"}
                    {conv.type === "group" && "👥"}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className={`text-xs truncate max-w-[130px] min-[380px]:max-w-[160px] sm:max-w-none ${hasUnread ? "font-bold text-zinc-900 dark:text-zinc-100" : "font-semibold text-zinc-800 dark:text-zinc-200"}`}>
                        {conv.name}
                      </span>
                      {getConvTypeBadge(conv.type)}
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                      {formatMessageTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                    </span>
                  </div>

                  {/* Tin nhắn gần nhất & Badge chưa đọc */}
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[11px] truncate ${hasUnread ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}`}>
                      {conv.lastMessage?.senderName ? `${conv.lastMessage.senderName}: ` : ""}
                      {conv.lastMessage?.content || "Chưa có tin nhắn"}
                    </p>

                    {hasUnread && (
                      <span className="h-4 min-w-[16px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                        {conv.unreadCount! > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

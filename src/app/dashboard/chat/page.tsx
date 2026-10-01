"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ChatConversation, ChatMessage, ChatAttachment, User } from "@/types";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { DirectChatModal } from "@/components/chat/DirectChatModal";
import { ConversationInfoDrawer } from "@/components/chat/ConversationInfoDrawer";

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State hội thoại & tin nhắn
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // State tương tác
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // State modals
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);

  // State mobile: hiển thị chat view hay sidebar
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Fetch danh sách users toàn công ty
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?limit=200");
      const json = await res.json();
      if (res.ok && json.success) {
        const list = json.data?.items || json.data?.users || (Array.isArray(json.data) ? json.data : []);
        setAllUsers(list);
      }
    } catch (e) {
      console.error("Lỗi fetch users:", e);
    }
  }, []);

  // Fetch danh sách cuộc trò chuyện
  const fetchConversations = useCallback(async (selectFirstIfNone = false) => {
    try {
      const res = await fetch("/api/chat/conversations");
      const json = await res.json();
      if (res.ok && json.success) {
        const list: ChatConversation[] = json.data || [];
        setConversations(list);

        // Nếu chưa chọn cuộc hội thoại nào hoặc cần chọn đầu tiên
        if (selectFirstIfNone && list.length > 0) {
          setActiveConv((prev) => prev || list[0]);
        }
      }
    } catch (e) {
      console.error("Lỗi fetch conversations:", e);
    }
  }, []);

  // Fetch tin nhắn của cuộc trò chuyện hiện tại
  const fetchMessages = useCallback(async (convId: string, markRead = true) => {
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${convId}&limit=100`);
      const json = await res.json();
      if (res.ok && json.success) {
        setMessages(json.data || []);

        if (markRead) {
          // Gọi API đánh dấu đã đọc
          fetch("/api/chat/messages/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: convId }),
          }).catch(console.error);

          // Cập nhật lại unreadCount local cho conversation
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }
      }
    } catch (e) {
      console.error("Lỗi fetch messages:", e);
    }
  }, []);

  // Khởi tạo ban đầu
  useEffect(() => {
    fetchUsers();
    fetchConversations(true);
  }, [fetchUsers, fetchConversations]);

  // Khi activeConv thay đổi -> Tải tin nhắn của hội thoại đó
  useEffect(() => {
    if (activeConv) {
      setLoadingMessages(true);
      fetchMessages(activeConv.id, true).finally(() => setLoadingMessages(false));
    } else {
      setMessages([]);
    }
  }, [activeConv, fetchMessages]);

  // Real-time Polling: Kiểm tra tin nhắn mới và cập nhật danh sách mỗi 2.5 giây
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Cập nhật danh sách conversations để nhận biết tin nhắn mới ở các phòng khác
      fetchConversations(false);

      // 2. Nếu đang mở một cuộc trò chuyện, fetch tin nhắn mới của nó
      if (activeConv) {
        fetchMessages(activeConv.id, true);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeConv, fetchConversations, fetchMessages]);

  // Chọn cuộc trò chuyện
  const handleSelectConversation = (conv: ChatConversation) => {
    setActiveConv(conv);
    setReplyingTo(null);
    setMobileView("chat");
  };

  // Gửi tin nhắn mới (kết hợp Optimistic UI)
  const handleSendMessage = async (
    content: string,
    attachments: ChatAttachment[],
    replyToId?: string
  ) => {
    if (!activeConv || !user) return;

    // Optimistic message
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConv.id,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatarUrl,
      senderRole: user.role,
      content,
      attachments,
      replyToId,
      replyToContent: replyingTo?.content,
      replyToSenderName: replyingTo?.senderName,
      reactions: [],
      isReadBy: [user.id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConv.id,
          content,
          attachments,
          replyToId,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const savedMsg: ChatMessage = json.data;
        // Thay thế tin nhắn tạm bằng tin nhắn chuẩn từ server
        setMessages((prev) => prev.map((m) => (m.id === tempId ? savedMsg : m)));
        // Cập nhật lại cuộc trò chuyện
        fetchConversations(false);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(json.message || json.error || "Không thể gửi tin nhắn", {
          title: "Gửi Tin Nhắn Thất Bại",
        });
      }
    } catch (err) {
      console.error("Lỗi khi gửi tin nhắn:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(err instanceof Error ? err.message : "Lỗi kết nối", {
        title: "Lỗi Hệ Thống",
      });
    }
  };

  // Thả reaction emoji
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      // Optimistic update
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = msg.reactions || [];
          const idx = reactions.findIndex((r) => r.userId === user.id && r.emoji === emoji);
          let newReactions = [...reactions];
          if (idx >= 0) {
            newReactions.splice(idx, 1);
          } else {
            newReactions.push({ emoji, userId: user.id, userName: user.name });
          }
          return { ...msg, reactions: newReactions };
        })
      );

      await fetch(`/api/chat/messages/${messageId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      console.error("Lỗi toggle reaction:", err);
    }
  };

  // Thêm thành viên vào nhóm chat
  const handleAddMemberToGroup = async (targetUserId: string) => {
    if (!activeConv) return;
    try {
      const res = await fetch(`/api/chat/conversations/${activeConv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addMemberIds: [targetUserId],
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActiveConv(json.data);
        fetchConversations(false);
      }
    } catch (err) {
      console.error("Lỗi thêm thành viên:", err);
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] w-full flex overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Cột Trái: Sidebar hội thoại (Ẩn trên mobile khi đang xem chat) */}
      <div className={`${mobileView === "chat" ? "hidden md:flex" : "flex"} w-full md:w-auto h-full shrink-0`}>
        <ChatSidebar
          conversations={conversations}
          selectedConvId={activeConv?.id || null}
          onSelectConversation={handleSelectConversation}
          onOpenDirectModal={() => setIsDirectModalOpen(true)}
          onOpenGroupModal={() => setIsGroupModalOpen(true)}
        />
      </div>

      {/* Khung Chính: Tin nhắn hội thoại */}
      {activeConv ? (
        <div
          className={`${
            mobileView === "list" ? "hidden md:flex" : "flex"
          } flex-1 min-w-0 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/40 overflow-hidden relative`}
        >
          {/* Header cuộc trò chuyện */}
          <div className="p-3 sm:px-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Nút quay lại trên mobile */}
                <button
                  type="button"
                  onClick={() => setMobileView("list")}
                  className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden cursor-pointer"
                >
                  ←
                </button>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden">
                  {activeConv.avatar && activeConv.avatar.length <= 4 ? (
                    activeConv.avatar
                  ) : activeConv.avatar ? (
                    <img src={activeConv.avatar} alt={activeConv.name} className="w-full h-full object-cover" />
                  ) : (
                    activeConv.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {activeConv.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 truncate">
                    <span>
                      {activeConv.type === "company" && "Kênh toàn công ty"}
                      {activeConv.type === "department" && `Kênh ${activeConv.departmentName || "phòng ban"}`}
                      {activeConv.type === "direct" && "Trò chuyện trực tiếp 1-1"}
                      {activeConv.type === "group" && "Hội nhóm"}
                    </span>
                    <span>•</span>
                    <span>{activeConv.members?.length || activeConv.memberIds.length} thành viên</span>
                  </div>
                </div>
              </div>

              {/* Toolbar góc phải */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  title="Xem thông tin hội thoại & phương tiện"
                  className={`p-2 rounded-xl transition cursor-pointer text-xs font-semibold flex items-center gap-1 ${
                    isDrawerOpen
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  <span>ℹ️</span>
                  <span className="hidden sm:inline">Chi tiết</span>
                </button>
              </div>
            </div>

            {/* Danh sách tin nhắn */}
            <ChatMessageList
              messages={messages}
              currentUserId={user?.id || ""}
              onReplyMessage={(msg) => setReplyingTo(msg)}
              onToggleReaction={handleToggleReaction}
              loading={loadingMessages}
            />

            {/* Khung soạn thảo tin nhắn */}
            <ChatInput
              onSendMessage={handleSendMessage}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </div>
        ) : (
          /* Màn hình trống khi chưa chọn hội thoại */
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8 bg-zinc-50/50 dark:bg-zinc-950/40">
            <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl mb-3 shadow-xs">
              💬
            </div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              Hệ Thống Trò Chuyện &amp; Tin Nhắn Nội Bộ
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-1 leading-relaxed">
              Chọn một kênh trao đổi toàn công ty, phòng ban, nhắn tin trực tiếp 1-1 hoặc tạo nhóm hội chat để bắt đầu giao tiếp ngay.
            </p>
          </div>
        )}

        {/* Cột Phải: Drawer thông tin chi tiết */}
        {activeConv && isDrawerOpen && (
          <ConversationInfoDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            conversation={activeConv}
            messages={messages}
            currentUserId={user?.id || ""}
            allUsers={allUsers}
            onAddMember={handleAddMemberToGroup}
          />
        )}

      {/* Modal tạo nhóm */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onSuccess={(newConv) => {
          fetchConversations(false);
          handleSelectConversation(newConv);
        }}
        usersList={allUsers}
        currentUserId={user?.id || ""}
      />

      {/* Modal chat 1-1 */}
      <DirectChatModal
        isOpen={isDirectModalOpen}
        onClose={() => setIsDirectModalOpen(false)}
        onSelectUser={(newConv) => {
          fetchConversations(false);
          handleSelectConversation(newConv);
        }}
        usersList={allUsers}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}

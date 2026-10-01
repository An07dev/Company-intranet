"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChatMessage, ChatAttachment, User } from "@/types";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  onReplyMessage: (msg: ChatMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  loading: boolean;
}

const COMMON_REACTIONS = ["👍", "❤️", "😂", "😮", "🎉", "🔥"];

export function ChatMessageList({
  messages,
  currentUserId,
  onReplyMessage,
  onToggleReaction,
  loading,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [previewMediaType, setPreviewMediaType] = useState<"image" | "video">("image");
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
      {loading && messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-xs text-zinc-400">
          Đang tải tin nhắn...
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl mb-2">
            💬
          </div>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            Chưa có tin nhắn nào
          </h4>
          <p className="text-xs text-zinc-400 max-w-xs mt-1">
            Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện!
          </p>
        </div>
      ) : (
        messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUserId;
          const isSystem = msg.senderId === "system";

          if (isSystem) {
            return (
              <div key={msg.id || idx} className="flex justify-center my-2">
                <span className="text-[11px] px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-center max-w-md">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id || idx}
              className={`group flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
            >
              {/* Avatar người gửi (nếu là người khác) */}
              {!isMe && (
                <div className="w-7 h-7 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center text-[11px] shrink-0 overflow-hidden mb-1 shadow-2xs">
                  {msg.senderAvatar ? (
                    <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
                  ) : (
                    msg.senderName.charAt(0).toUpperCase()
                  )}
                </div>
              )}

              {/* Khối bong bóng tin nhắn */}
              <div className={`relative max-w-[85%] sm:max-w-[70%] space-y-1 ${isMe ? "items-end" : "items-start"}`}>
                {/* Tên người gửi & vai trò */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      {msg.senderName}
                    </span>
                    {msg.senderRole && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                        {msg.senderRole === "admin"
                          ? "Admin"
                          : msg.senderRole === "director"
                          ? "Giám đốc"
                          : msg.senderRole === "manager"
                          ? "Quản lý"
                          : "Nhân viên"}
                      </span>
                    )}
                  </div>
                )}

                {/* Bong bóng chính */}
                <div
                  className={`relative p-3 rounded-2xl shadow-2xs text-xs leading-relaxed ${
                    isMe
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-br-xs"
                      : "bg-white text-zinc-800 dark:bg-zinc-800/90 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 rounded-bl-xs"
                  }`}
                >
                  {/* Trích dẫn tin nhắn cũ nếu có */}
                  {msg.replyToContent && (
                    <div
                      className={`mb-2 p-2 rounded-lg border-l-2 text-[11px] ${
                        isMe
                          ? "bg-white/10 border-white/50 text-zinc-200 dark:bg-black/10 dark:text-zinc-700 dark:border-zinc-700"
                          : "bg-zinc-50 dark:bg-zinc-900/60 border-blue-500 text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      <span className="font-bold block text-[10px]">
                        {msg.replyToSenderName || "Tin nhắn"}:
                      </span>
                      <p className="line-clamp-2">{msg.replyToContent}</p>
                    </div>
                  )}

                  {/* Nội dung văn bản */}
                  {msg.content && (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  )}

                  {/* Tệp đính kèm (Ảnh / Video / File) */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {msg.attachments.map((att) => (
                        <div key={att.id} className="overflow-hidden rounded-xl">
                          {att.type === "image" && (
                            <div
                              onClick={() => {
                                setPreviewMediaUrl(att.url);
                                setPreviewMediaType("image");
                              }}
                              className="relative cursor-pointer group/img overflow-hidden rounded-xl border border-black/10 max-h-72"
                            >
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-full h-auto object-cover group-hover/img:scale-102 transition duration-200"
                              />
                            </div>
                          )}

                          {att.type === "video" && (
                            <div className="rounded-xl overflow-hidden border border-black/10">
                              <video
                                src={att.url}
                                controls
                                className="w-full max-h-72 bg-black rounded-xl"
                              />
                            </div>
                          )}

                          {att.type === "file" && (
                            <a
                              href={att.url}
                              download={att.name}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-2.5 p-2 rounded-xl transition ${
                                isMe
                                  ? "bg-white/15 hover:bg-white/20 text-white dark:bg-black/10 dark:text-zinc-900 dark:hover:bg-black/15"
                                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center text-sm font-bold shrink-0">
                                📎
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-xs truncate">{att.name}</div>
                                <div className="text-[10px] opacity-70">
                                  {formatFileSize(att.size)} • Nhấn để tải về
                                </div>
                              </div>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Thời gian gửi & Trạng thái */}
                  <div
                    className={`mt-1 flex items-center gap-1 justify-end text-[10px] ${
                      isMe ? "text-white/70 dark:text-zinc-500" : "text-zinc-400"
                    }`}
                  >
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMe && <span>✓✓</span>}
                  </div>
                </div>

                {/* Danh sách Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {msg.reactions.map((r, rIdx) => {
                      const isMyReaction = r.userId === currentUserId;
                      return (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => onToggleReaction(msg.id, r.emoji)}
                          title={`${r.userName} đã thả ${r.emoji}`}
                          className={`text-xs px-1.5 py-0.5 rounded-full border transition cursor-pointer flex items-center gap-1 ${
                            isMyReaction
                              ? "bg-blue-100 dark:bg-blue-950/60 border-blue-400 text-blue-800 dark:text-blue-300"
                              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <span>{r.emoji}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Toolbar ẩn (hiện khi hover vào tin nhắn) */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                {/* Nút thả reaction */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)
                    }
                    title="Thả cảm xúc"
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-xs"
                  >
                    😀
                  </button>

                  {/* Popup Emoji Quick Picker */}
                  {activeReactionMsgId === msg.id && (
                    <div className="absolute bottom-full mb-1 z-30 flex items-center gap-1 p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg animate-in fade-in zoom-in-95 duration-100">
                      {COMMON_REACTIONS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            onToggleReaction(msg.id, em);
                            setActiveReactionMsgId(null);
                          }}
                          className="w-7 h-7 text-sm flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg cursor-pointer transition"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nút trả lời (Reply) */}
                <button
                  type="button"
                  onClick={() => onReplyMessage(msg)}
                  title="Trả lời tin nhắn này"
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-xs"
                >
                  ↩️
                </button>
              </div>
            </div>
          );
        })
      )}

      <div ref={bottomRef} />

      {/* Lightbox Preview Ảnh / Video */}
      {previewMediaUrl && (
        <div
          onClick={() => setPreviewMediaUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {previewMediaType === "image" ? (
              <img
                src={previewMediaUrl}
                alt="Preview"
                className="max-h-[85vh] w-auto rounded-2xl shadow-2xl object-contain"
              />
            ) : (
              <video
                src={previewMediaUrl}
                controls
                autoPlay
                className="max-h-[85vh] w-auto rounded-2xl shadow-2xl"
              />
            )}
            <button
              type="button"
              onClick={() => setPreviewMediaUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white flex items-center justify-center font-bold text-sm shadow-md cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

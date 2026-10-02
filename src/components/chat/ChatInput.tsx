"use client";

import React, { useState, useRef } from "react";
import { ChatAttachment, ChatMessage } from "@/types";
import { Spinner } from "@/components/ui/Loading";

interface ChatInputProps {
  onSendMessage: (content: string, attachments: ChatAttachment[], replyToId?: string) => Promise<void>;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  disabled?: boolean;
}

const QUICK_EMOJIS = ["😀", "👍", "❤️", "😂", "🎉", "🔥", "🚀", "💼", "👏", "☕"];

export function ChatInput({
  onSendMessage,
  replyingTo,
  onCancelReply,
  disabled = false,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Xử lý upload tệp (ảnh, video, document)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/chat/upload", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setPendingAttachments((prev) => [...prev, json.data]);
        } else {
          alert(json.error || json.message || "Tải tệp lên thất bại");
        }
      }
    } catch (err) {
      console.error("Lỗi upload:", err);
      alert("Đã xảy ra lỗi khi tải tệp lên");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (attId: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Gửi tin nhắn
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!content.trim() && pendingAttachments.length === 0) || sending || uploading) return;

    try {
      setSending(true);
      const text = content.trim();
      const atts = [...pendingAttachments];
      const replyId = replyingTo?.id;

      setContent("");
      setPendingAttachments([]);
      onCancelReply();

      await onSendMessage(text, atts, replyId);

      // Reset chiều cao textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="p-2 sm:p-3 sm:px-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
      {/* Khối xem trước khi đang trả lời tin nhắn (Reply) */}
      {replyingTo && (
        <div className="mb-2 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border-l-4 border-blue-600 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-blue-600 dark:text-blue-400 block text-[10px] sm:text-[11px]">
              Đang trả lời {replyingTo.senderName}:
            </span>
            <p className="text-zinc-600 dark:text-zinc-300 truncate max-w-md text-[11px]">
              {replyingTo.content || "[Tệp đính kèm]"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer active:scale-95 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Danh sách tệp đang chờ gửi */}
      {pendingAttachments.length > 0 && (
        <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="relative p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center gap-2 text-xs shrink-0 max-w-[180px] sm:max-w-[200px]"
            >
              {att.type === "image" ? (
                <img src={att.url} alt={att.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : att.type === "video" ? (
                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-xs">
                  ▶
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center text-xs">
                  📎
                </div>
              )}
              <span className="truncate text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
                {att.name}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form nhập chính */}
      <form onSubmit={handleSubmit} className="flex items-end gap-1.5 sm:gap-2">
        {/* Nút đính kèm ảnh, video, file */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          title="Đính kèm ảnh, video hoặc tệp tin"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 disabled:opacity-50 active:scale-95"
        >
          {uploading ? (
            <Spinner size="sm" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>

        {/* Nút chọn emoji */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Thêm biểu tượng cảm xúc"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 active:scale-95 text-base"
          >
            😀
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 left-0 z-30 grid grid-cols-5 gap-1 p-1.5 sm:p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl w-48 sm:w-auto sm:flex sm:items-center">
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => insertEmoji(em)}
                  className="w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center text-base cursor-pointer transition active:scale-125"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Textarea nhập tin nhắn */}
        <div className="flex-1 relative min-w-0">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            disabled={disabled}
            className="w-full py-2 px-3 sm:py-2.5 sm:px-3.5 text-xs sm:text-sm rounded-xl sm:rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-none max-h-28 sm:max-h-32 focus:outline-hidden transition leading-snug"
          />
        </div>

        {/* Nút Gửi */}
        <button
          type="submit"
          disabled={disabled || (!content.trim() && pendingAttachments.length === 0) || sending || uploading}
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl sm:rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
        >
          {sending ? (
            <Spinner size="sm" className="text-white dark:text-zinc-900" />
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

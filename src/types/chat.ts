import { User } from "./index";

export type ChatConversationType = "company" | "department" | "direct" | "group";

export interface ChatAttachment {
  id: string;
  url: string;
  name: string;
  type: "image" | "video" | "file";
  size?: number; // bytes
  mimeType?: string;
}

export interface ChatMessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  content: string;
  attachments?: ChatAttachment[];
  replyToId?: string;
  replyToContent?: string;
  replyToSenderName?: string;
  reactions?: ChatMessageReaction[];
  isReadBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversation {
  id: string;
  type: ChatConversationType;
  name: string;
  avatar?: string;
  departmentId?: string;
  departmentName?: string;
  memberIds: string[];
  members?: User[];
  createdBy?: string;
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
    hasAttachments?: boolean;
    attachmentType?: "image" | "video" | "file";
  };
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
  attachments?: ChatAttachment[];
  replyToId?: string;
}

export interface CreateDirectConversationInput {
  targetUserId: string;
}

export interface CreateGroupConversationInput {
  name: string;
  memberIds: string[];
  avatar?: string;
}

export interface UpdateGroupConversationInput {
  name?: string;
  avatar?: string;
  addMemberIds?: string[];
  removeMemberIds?: string[];
}

import { NextRequest } from "next/server";
import { ChatModel } from "@/server/models/chat.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

/**
 * GET /api/chat/messages?conversationId=...&limit=50&before=...
 * Lấy danh sách tin nhắn theo cuộc trò chuyện
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn cần đăng nhập để xem tin nhắn", 401);
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return apiError("Thiếu tham số conversationId", 400);
    }

    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const before = searchParams.get("before") || undefined;

    const messages = await ChatModel.getMessages(conversationId, limit, before);
    return apiSuccess(messages, "Lấy tin nhắn thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy danh sách tin nhắn";
    return apiError(message, 500);
  }
}

/**
 * POST /api/chat/messages
 * Gửi tin nhắn mới (chứa văn bản, ảnh, video, tài liệu, trả lời tin nhắn)
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn cần đăng nhập để gửi tin nhắn", 401);
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.conversationId) {
      return apiError("Thiếu thông tin cuộc trò chuyện (conversationId)", 400);
    }

    const content = body.content || "";
    const attachments = body.attachments || [];

    if (!content.trim() && attachments.length === 0) {
      return apiError("Tin nhắn phải có nội dung hoặc tệp đính kèm", 400);
    }

    const newMsg = await ChatModel.sendMessage(authUser.userId, {
      conversationId: body.conversationId,
      content,
      attachments,
      replyToId: body.replyToId,
    });

    return apiSuccess(newMsg, "Gửi tin nhắn thành công", 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi gửi tin nhắn";
    return apiError(message, 400);
  }
}

import { NextRequest } from "next/server";
import { ChatModel } from "@/server/models/chat.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

/**
 * POST /api/chat/messages/read
 * Đánh dấu đã đọc tất cả tin nhắn trong một cuộc trò chuyện
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn cần đăng nhập để thao tác", 401);
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.conversationId) {
      return apiError("Thiếu tham số conversationId", 400);
    }

    await ChatModel.markAsRead(body.conversationId, authUser.userId);
    return apiSuccess({ success: true }, "Đã đánh dấu đọc tin nhắn");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi đánh dấu đọc tin nhắn";
    return apiError(message, 500);
  }
}

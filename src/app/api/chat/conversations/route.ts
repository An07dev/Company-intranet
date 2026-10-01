import { NextRequest } from "next/server";
import { ChatModel } from "@/server/models/chat.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

/**
 * GET /api/chat/conversations
 * Lấy danh sách tất cả cuộc hội thoại (Toàn công ty, Phòng ban, 1-1, Nhóm) của user hiện tại
 */
export async function GET() {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn cần đăng nhập để truy cập tin nhắn", 401);
    }

    const conversations = await ChatModel.getConversationsForUser(authUser.userId);
    return apiSuccess(conversations, "Lấy danh sách cuộc trò chuyện thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy danh sách cuộc trò chuyện";
    return apiError(message, 500);
  }
}

/**
 * POST /api/chat/conversations
 * Tạo cuộc trò chuyện mới: 1-1 (direct) hoặc Nhóm hội chat (group)
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn cần đăng nhập để tạo cuộc trò chuyện", 401);
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.type) {
      return apiError("Thiếu thông tin loại cuộc trò chuyện (type: 'direct' | 'group')", 400);
    }

    if (body.type === "direct") {
      if (!body.targetUserId) {
        return apiError("Thiếu mã người nhận (targetUserId)", 400);
      }
      const conv = await ChatModel.getOrCreateDirectConversation(
        authUser.userId,
        body.targetUserId
      );
      return apiSuccess(conv, "Tạo hoặc lấy cuộc trò chuyện 1-1 thành công", 201);
    }

    if (body.type === "group") {
      if (!body.name || !body.name.trim()) {
        return apiError("Vui lòng nhập tên hội nhóm chat", 400);
      }
      const conv = await ChatModel.createGroupConversation(authUser.userId, {
        name: body.name.trim(),
        memberIds: body.memberIds || [],
        avatar: body.avatar,
      });
      return apiSuccess(conv, "Tạo nhóm hội chat mới thành công", 201);
    }

    return apiError("Loại cuộc trò chuyện không hợp lệ", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi tạo cuộc trò chuyện";
    return apiError(message, 400);
  }
}

import { NextRequest } from "next/server";
import { ChatModel } from "@/server/models/chat.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chat/conversations/[id]
 * Lấy thông tin chi tiết một cuộc trò chuyện
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn cần đăng nhập để xem thông tin cuộc trò chuyện", 401);
    }

    const { id } = await params;
    const conversation = await ChatModel.getConversationById(id, authUser.userId);

    if (!conversation) {
      return apiError("Không tìm thấy cuộc trò chuyện", 404);
    }

    return apiSuccess(conversation, "Lấy thông tin cuộc trò chuyện thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy thông tin cuộc trò chuyện";
    return apiError(message, 500);
  }
}

/**
 * PUT /api/chat/conversations/[id]
 * Cập nhật thông tin hội nhóm chat (đổi tên, avatar, thêm/rút thành viên)
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn cần đăng nhập để cập nhật hội nhóm", 401);
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body) {
      return apiError("Thiếu dữ liệu cập nhật", 400);
    }

    const updated = await ChatModel.updateGroupConversation(id, authUser.userId, body);
    return apiSuccess(updated, "Cập nhật hội nhóm chat thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi cập nhật hội nhóm chat";
    return apiError(message, 400);
  }
}

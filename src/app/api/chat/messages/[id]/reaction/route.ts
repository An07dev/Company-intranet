import { NextRequest } from "next/server";
import { ChatModel } from "@/server/models/chat.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/chat/messages/[id]/reaction
 * Thả hoặc hủy reaction emoji trên một tin nhắn
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn cần đăng nhập để thao tác", 401);
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body || !body.emoji) {
      return apiError("Thiếu emoji reaction", 400);
    }

    const updatedMessage = await ChatModel.toggleReaction(id, authUser.userId, body.emoji);
    if (!updatedMessage) {
      return apiError("Không tìm thấy tin nhắn", 404);
    }

    return apiSuccess(updatedMessage, "Cập nhật reaction thành công");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi cập nhật reaction";
    return apiError(message, 500);
  }
}

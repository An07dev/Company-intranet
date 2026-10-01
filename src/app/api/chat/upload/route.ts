import { NextRequest } from "next/server";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/upload
 * Nhận file upload (ảnh, video, tệp tài liệu) và lưu vào /public/uploads/chat/
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn cần đăng nhập để tải lên tệp tin", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("Không tìm thấy tệp tin tải lên", 400);
    }

    // Giới hạn dung lượng 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return apiError("Dung lượng tệp vượt quá giới hạn 50MB", 400);
    }

    const mimeType = file.type || "application/octet-stream";
    let type: "image" | "video" | "file" = "file";

    if (mimeType.startsWith("image/")) {
      type = "image";
    } else if (mimeType.startsWith("video/")) {
      type = "video";
    }

    // Đảm bảo thư mục lưu trữ tồn tại
    const uploadDir = path.join(process.cwd(), "public", "uploads", "chat");
    await fs.mkdir(uploadDir, { recursive: true });

    // Tạo tên tệp an toàn
    const originalName = file.name || "upload_file";
    const extension = path.extname(originalName) || "";
    const sanitizedBase = path
      .basename(originalName, extension)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);

    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${sanitizedBase}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    // Ghi buffer vào file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/chat/${fileName}`;

    return apiSuccess(
      {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url: publicUrl,
        name: originalName,
        type,
        size: file.size,
        mimeType,
      },
      "Tải tệp lên thành công",
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi xử lý tải lên tệp tin";
    return apiError(message, 500);
  }
}

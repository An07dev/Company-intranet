import { NextRequest } from "next/server";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { UserModel } from "@/server/models/user.model";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * POST /api/users/avatar
 * Tải lên ảnh đại diện cá nhân và lưu vào /public/uploads/avatars/
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn chưa đăng nhập hoặc phiên đã hết hạn", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("Không tìm thấy tệp ảnh tải lên", 400);
    }

    // Giới hạn dung lượng ảnh 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return apiError("Kích thước tệp ảnh vượt quá giới hạn 5MB", 400);
    }

    const mimeType = file.type || "";
    if (!mimeType.startsWith("image/")) {
      return apiError("Định dạng tệp không hợp lệ. Vui lòng tải lên file ảnh (JPEG, PNG, WEBP, GIF)", 400);
    }

    // Đảm bảo thư mục lưu trữ tồn tại
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await fs.mkdir(uploadDir, { recursive: true });

    // Tạo tên tệp an toàn
    const extension = path.extname(file.name) || ".jpg";
    const fileName = `avatar_${authUser.userId}_${Date.now()}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    // Ghi buffer vào file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${fileName}`;

    // Cập nhật ngay vào database cho user
    const updatedUser = await UserModel.updateProfile(authUser.userId, {
      avatarUrl,
    });

    return apiSuccess({ avatarUrl, user: updatedUser }, "Tải lên ảnh đại diện thành công!");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi tải ảnh đại diện";
    return apiError(message, 500);
  }
}

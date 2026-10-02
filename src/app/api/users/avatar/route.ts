import { NextRequest } from "next/server";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";
import { UserModel } from "@/server/models/user.model";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/avatar
 * Lấy ảnh đại diện của người dùng từ cơ sở dữ liệu (Database)
 */
export async function GET() {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn chưa đăng nhập hoặc phiên đã hết hạn", 401);
    }

    const user = await UserModel.findById(authUser.userId);
    if (!user) {
      return apiError("Không tìm thấy thông tin người dùng", 404);
    }

    const isBase64 = Boolean(user.avatarUrl && user.avatarUrl.startsWith("data:image/"));

    return apiSuccess(
      {
        avatarUrl: user.avatarUrl || null,
        isBase64,
        storedInDatabase: true,
      },
      "Lấy ảnh đại diện từ cơ sở dữ liệu thành công"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi lấy ảnh đại diện";
    return apiError(message, 500);
  }
}

/**
 * POST /api/users/avatar
 * Tải lên ảnh đại diện cá nhân, chuyển đổi thành Base64 và lưu trực tiếp vào Database (MongoDB)
 * Hỗ trợ cả 2 phương thức:
 * 1. JSON payload: { base64: "data:image/jpeg;base64,..." }
 * 2. FormData: file nhị phân (sẽ được server chuyển đổi sang Base64 và lưu vào DB)
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Bạn chưa đăng nhập hoặc phiên đã hết hạn", 401);
    }

    const contentType = request.headers.get("content-type") || "";
    let base64Avatar = "";

    // TRƯỜNG HỢP 1: Client gửi Base64 trực tiếp dạng JSON (tối ưu nhất, đã nén từ client)
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (!body || (!body.base64 && !body.avatarUrl)) {
        return apiError("Thiếu dữ liệu ảnh đại diện base64 trong payload", 400);
      }

      base64Avatar = (body.base64 || body.avatarUrl).trim();

      if (!base64Avatar.startsWith("data:image/")) {
        return apiError("Định dạng ảnh Base64 không hợp lệ. Chuỗi phải bắt đầu bằng 'data:image/...'", 400);
      }
    }
    // TRƯỜNG HỢP 2: Client gửi file nhị phân qua FormData
    else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const base64Field = formData.get("base64") as string | null;

      if (base64Field && base64Field.startsWith("data:image/")) {
        base64Avatar = base64Field.trim();
      } else {
        const file = formData.get("file") as File | null;
        if (!file) {
          return apiError("Không tìm thấy tệp ảnh tải lên", 400);
        }

        // Giới hạn dung lượng tối đa 10MB
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          return apiError("Kích thước tệp ảnh vượt quá giới hạn 10MB", 400);
        }

        const mimeType = file.type || "image/jpeg";
        if (!mimeType.startsWith("image/")) {
          return apiError("Định dạng tệp không hợp lệ. Vui lòng tải lên file ảnh (JPEG, PNG, WEBP, GIF)", 400);
        }

        // Đọc buffer nhị phân và chuyển đổi sang chuỗi Base64 Data URL
        const buffer = Buffer.from(await file.arrayBuffer());
        base64Avatar = `data:${mimeType};base64,${buffer.toString("base64")}`;

        // Lưu thêm 1 bản file dự phòng vào thư mục /public/uploads/avatars/
        try {
          const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
          await fs.mkdir(uploadDir, { recursive: true });
          const extension = path.extname(file.name) || ".jpg";
          const fileName = `avatar_${authUser.userId}_${Date.now()}${extension}`;
          const filePath = path.join(uploadDir, fileName);
          await fs.writeFile(filePath, buffer);
        } catch (fsErr) {
          console.warn("[Avatar Upload] Không thể lưu file dự phòng tĩnh, tiếp tục lưu trực tiếp vào DB:", fsErr);
        }
      }
    } else {
      return apiError("Định dạng yêu cầu không hỗ trợ. Vui lòng gửi JSON hoặc multipart/form-data", 400);
    }

    if (!base64Avatar) {
      return apiError("Không thể xử lý dữ liệu ảnh", 400);
    }

    // LƯU TRỰC TIẾP CHUỖI BASE64 VÀO DATABASE CHO USER
    const updatedUser = await UserModel.updateProfile(authUser.userId, {
      avatarUrl: base64Avatar,
    });

    return apiSuccess(
      {
        avatarUrl: base64Avatar,
        user: updatedUser,
        isBase64: true,
        storedInDatabase: true,
      },
      "Đã lưu ảnh đại diện (Base64) trực tiếp vào cơ sở dữ liệu thành công!"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi xử lý tải ảnh đại diện";
    return apiError(message, 500);
  }
}

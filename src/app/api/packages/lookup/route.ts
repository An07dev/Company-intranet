import { NextRequest } from "next/server";
import { PackageModel } from "@/server/models/package.model";
import { getAuthUserFromCookies } from "@/server/utils/auth";
import { apiError, apiSuccess } from "@/server/utils/response";

/**
 * GET /api/packages/lookup?code=...
 * Tra cứu nhanh kiện hàng khi quét mã QR hoặc mã vạch
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserFromCookies();
    if (!authUser) {
      return apiError("Vui lòng đăng nhập để tra cứu", 401);
    }

    const { searchParams } = new URL(request.url);
    let code = searchParams.get("code") || "";

    if (!code || !code.trim()) {
      return apiError("Mã quét không được để trống", 400);
    }

    code = code.trim();

    // Nếu mã quét là đường dẫn URL (ví dụ https://domain/dashboard/packages?code=PKG-...), trích xuất mã
    try {
      if (code.startsWith("http://") || code.startsWith("https://")) {
        const parsedUrl = new URL(code);
        const codeInParam = parsedUrl.searchParams.get("code") || parsedUrl.searchParams.get("id");
        if (codeInParam) {
          code = codeInParam;
        } else {
          // Lấy path segment cuối cùng
          const segments = parsedUrl.pathname.split("/").filter(Boolean);
          if (segments.length > 0) {
            code = segments[segments.length - 1];
          }
        }
      }
    } catch {
      // ignore
    }

    // Nếu mã quét là JSON (ví dụ {"code": "PKG-..."})
    if (code.startsWith("{") && code.endsWith("}")) {
      try {
        const parsed = JSON.parse(code);
        if (parsed.code) code = parsed.code;
        else if (parsed.id) code = parsed.id;
      } catch {
        // ignore
      }
    }

    const pkg = await PackageModel.getPackageByIdOrCode(code);

    if (!pkg) {
      return apiError(`Không tìm thấy kiện hàng nào khớp với mã "${code}"`, 404);
    }

    return apiSuccess(pkg, "Tra cứu kiện hàng thành công");
  } catch (error: any) {
    console.error("GET /api/packages/lookup error:", error);
    return apiError(error.message || "Lỗi khi tra cứu kiện hàng", 500);
  }
}

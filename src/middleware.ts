import { NextResponse, NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "auth_session_token";
const AUTH_SECRET = process.env.AUTH_SECRET || "internal_portal_jwt_secret_key_2026_super_secure";

// Danh sách các đường dẫn công khai không cần đăng nhập
const PUBLIC_PATHS = [
  "/",
  "/api/auth/login",
  "/api/auth/demo-accounts",
  "/api/health",
];

/**
 * Hàm xác thực JWT trên Edge Runtime bằng Web Crypto API tiêu chuẩn (Không phụ thuộc thư viện ngoài)
 */
async function verifyJwtEdge(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const base64 = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
    const binary = atob(padded);
    const sigBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      sigBytes[i] = binary.charCodeAt(i);
    }

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    if (!isValid) return null;

    const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bỏ qua các file tĩnh, hình ảnh, tài nguyên nội bộ Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/images") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|json|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Lấy token từ Cookie hoặc Header Authorization
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const headerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = cookieToken || headerToken;

  const user = token ? await verifyJwtEdge(token, AUTH_SECRET) : null;
  const isAuthenticated = Boolean(user);

  // 3. Xử lý trang Đăng nhập ("/")
  if (pathname === "/") {
    if (isAuthenticated) {
      // Đã đăng nhập -> chuyển thẳng vào Dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Chưa đăng nhập -> cho phép vào trang đăng nhập
    return NextResponse.next();
  }

  // 4. Bỏ qua các route công khai khác
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) {
    return NextResponse.next();
  }

  // 5. Xử lý các route giao diện /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      // Chưa đăng nhập -> Redirect về trang Login kèm callbackUrl
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 6. Xử lý các route API được bảo vệ /api/*
  if (pathname.startsWith("/api/")) {
    // Nếu là endpoint từ Chrome Extension đồng bộ (/api/shopee/*), cho phép tiếp nhận dữ liệu
    if (pathname.startsWith("/api/shopee/")) {
      return NextResponse.next();
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Phiên làm việc đã hết hạn hoặc chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    // Đã xác thực -> Gắn thêm thông tin user vào headers để các API handler đọc nhanh
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.userId || "");
    requestHeaders.set("x-user-email", user.email || "");
    requestHeaders.set("x-user-role", user.role || "");
    requestHeaders.set("x-user-name", encodeURIComponent(user.name || ""));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

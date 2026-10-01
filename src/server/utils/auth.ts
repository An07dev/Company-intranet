import crypto from "crypto";
import { cookies } from "next/headers";
import { User } from "@/types";

const AUTH_SECRET = process.env.AUTH_SECRET || "internal_portal_jwt_secret_key_2026_super_secure";
export const AUTH_COOKIE_NAME = "auth_session_token";

interface JwtHeader {
  alg: "HS256";
  typ: "JWT";
}

export interface JwtPayload {
  userId: string;
  employeeCode?: string;
  email: string;
  name: string;
  role: User["role"];
  department?: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Tạo JWT token được ký bằng HMAC-SHA256 (Native Node.js crypto, không cần thư viện ngoài)
 */
export function signAuthToken(payload: Omit<JwtPayload, "iat" | "exp">, expiresInSeconds = 86400 * 7): string {
  const header: JwtHeader = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Giải mã và xác thực chữ ký token
 */
export function verifyAuthToken(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (signature !== expectedSignature) {
      return null;
    }

    const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // Token hết hạn
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Lấy user hiện tại từ Cookie trong Route Handler hoặc Server Component
 */
export async function getAuthUserFromCookies(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

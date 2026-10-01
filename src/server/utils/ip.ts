import { NextRequest } from "next/server";

/**
 * Trích xuất IP chính xác của client từ NextRequest
 */
export function getClientIp(request: NextRequest): string {
  // 1. Kiểm tra header x-forwarded-for (thường có khi qua Proxy/Nginx/Cloudflare)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return normalizeIp(firstIp);
  }

  // 2. Header của Nginx / Cloudflare
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return normalizeIp(realIp.trim());

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return normalizeIp(cfIp.trim());

  // 3. Fallback cho localhost
  return "127.0.0.1";
}

/**
 * Chuẩn hóa địa chỉ IP
 */
export function normalizeIp(ip: string): string {
  let cleaned = ip.trim();
  // Loại bỏ tiền tố IPv4-mapped IPv6 (::ffff:192.168.1.1 -> 192.168.1.1)
  if (cleaned.startsWith("::ffff:")) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

/**
 * Kiểm tra xem IP của client có nằm trong danh sách IP được phép hay không
 */
export function isIpMatched(clientIp: string, allowedIps: string[]): boolean {
  const normalizedClient = normalizeIp(clientIp);

  // Danh sách alias của localhost
  const localhostAliases = ["127.0.0.1", "::1", "localhost"];
  const isClientLocal = localhostAliases.includes(normalizedClient);

  for (const allowed of allowedIps) {
    const normalizedAllowed = normalizeIp(allowed);

    // 1. Nếu client là localhost và allowed cũng có localhost
    if (isClientLocal && localhostAliases.includes(normalizedAllowed)) {
      return true;
    }

    // 2. Khớp tuyệt đối (Exact match)
    if (normalizedClient === normalizedAllowed) {
      return true;
    }

    // 3. Khớp dải tiền tố Wildcard (ví dụ: 192.168.1.*)
    if (normalizedAllowed.endsWith("*")) {
      const prefix = normalizedAllowed.slice(0, -1);
      if (normalizedClient.startsWith(prefix)) {
        return true;
      }
    }
  }

  return false;
}

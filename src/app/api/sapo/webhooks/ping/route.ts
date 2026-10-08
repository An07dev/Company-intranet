import { NextResponse } from "next/server";
import { SapoService } from "@/server/services/sapo.service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

const TOPIC_NAMES: Record<string, string> = {
  "orders/create": "Đơn hàng mới tạo",
  "orders/updated": "Cập nhật đơn hàng",
  "orders/cancelled": "Hủy đơn hàng",
  "products/update": "Cập nhật sản phẩm & tồn kho",
  "products/delete": "Xóa sản phẩm trên Sapo",
};

export async function GET() {
  const startTime = Date.now();

  try {
    const data = await SapoService.getWebhooks();
    const latencyMs = Date.now() - startTime;
    const rawWebhooks = data?.webhooks || [];

    const webhooks = rawWebhooks.map((w: any) => ({
      id: w.id,
      topic: w.topic,
      topic_name: TOPIC_NAMES[w.topic] || w.topic,
      address: w.address,
      format: w.format || "json",
      created_on: w.created_on,
      modified_on: w.modified_on,
      status: "active",
      is_valid_target: w.address?.includes("/api/webhooks/sapo"),
    }));

    const requiredTopics = [
      { topic: "orders/create", label: "Tạo đơn hàng mới" },
      { topic: "orders/updated", label: "Cập nhật đơn hàng" },
      { topic: "orders/cancelled", label: "Hủy đơn hàng" },
      { topic: "products/update", label: "Cập nhật sản phẩm & tồn kho" },
      { topic: "products/delete", label: "Xóa sản phẩm khỏi Sapo" },
    ].map((req) => {
      const found = webhooks.find((w: any) => w.topic === req.topic);
      return {
        ...req,
        registered: Boolean(found),
        webhook_id: found?.id || null,
        address: found?.address || null,
      };
    });

    const allRegistered = requiredTopics.every((t) => t.registered);

    return NextResponse.json(
      {
        success: true,
        connected: true,
        latency_ms: latencyMs,
        store_domain: "cua-hang-yen-sen.mysapo.net",
        total_webhooks: webhooks.length,
        webhooks,
        required_topics: requiredTopics,
        all_active: allRegistered,
        timestamp: new Date().toISOString(),
        message: `Kết nối Sapo Omnichannel thành công! Xác thực ${webhooks.length} webhook đang kích hoạt trên Sapo (Độ trễ: ${latencyMs}ms).`,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: false,
        connected: false,
        latency_ms: latencyMs,
        store_domain: "cua-hang-yen-sen.mysapo.net",
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
        message: `Không thể kết nối tới Sapo API: ${error.message || String(error)}`,
      },
      { status: 502, headers: corsHeaders }
    );
  }
}

export async function POST() {
  return GET();
}

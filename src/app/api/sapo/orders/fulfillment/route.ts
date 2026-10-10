import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

export const maxDuration = 30;

function getCarrierTrackingUrl(carrier: string, trackingNumber: string): string {
  if (!trackingNumber) return "";
  const c = carrier.toLowerCase();
  if (c.includes("spx") || c.includes("shopee xpress")) {
    return `https://spx.vn/track?${encodeURIComponent(trackingNumber)}`;
  }
  if (c.includes("ghn") || c.includes("giao hàng nhanh")) {
    return `https://donhang.ghn.vn/?order_code=${encodeURIComponent(trackingNumber)}`;
  }
  if (c.includes("ghtk") || c.includes("giao hàng tiết kiệm")) {
    return `https://khachhang.ghtk.vn/tra-cuu-don-hang?tracking=${encodeURIComponent(trackingNumber)}`;
  }
  if (c.includes("viettel")) {
    return `https://viettelpost.vn/tra-cuu-hanh-trinh-don/?order_number=${encodeURIComponent(trackingNumber)}`;
  }
  if (c.includes("j&t") || c.includes("jt express")) {
    return `https://jtexpress.vn/track?billcodes=${encodeURIComponent(trackingNumber)}`;
  }
  if (c.includes("vnpost") || c.includes("bưu điện")) {
    return `http://www.vnpost.vn/vi-vn/dinh-vi/buu-pham?key=${encodeURIComponent(trackingNumber)}`;
  }
  return "";
}

function parseSapoErrorDetail(
  error: any,
  fallbackMessage: string
): { displayMessage: string; rawError: string } {
  const rawError = error?.message || String(error);
  let extractedJson: any = null;
  const jsonMatch = rawError.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      extractedJson = JSON.parse(jsonMatch[0]);
    } catch {}
  }

  const data = extractedJson || error?.response || {};

  if (data?.errors && Array.isArray(data.errors)) {
    const list = data.errors.map((e: any) => {
      if (typeof e === "string") return e;
      const field = e.fields?.length ? `[${e.fields.join(", ")}] ` : "";
      return `${field}${e.message || JSON.stringify(e)}`;
    });
    return { displayMessage: list.join(" • "), rawError };
  }

  if (data?.errors && typeof data.errors === "object") {
    const list = Object.entries(data.errors).map(([key, val]) => {
      const valStr = Array.isArray(val) ? val.join(", ") : String(val);
      return `Trường "${key}": ${valStr}`;
    });
    return { displayMessage: list.join(" • "), rawError };
  }

  if (data?.error_description) {
    return { displayMessage: data.error_description, rawError };
  }

  if (data?.error) {
    return { displayMessage: String(data.error), rawError };
  }

  return { displayMessage: rawError || fallbackMessage, rawError };
}

/**
 * POST /api/sapo/orders/fulfillment
 * Đẩy đơn hàng qua đơn vị vận chuyển & đồng bộ Sapo Omnichannel
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const now = new Date().toISOString();
    const body = await request.json();

    const {
      order_sn,
      shipping_carrier,
      tracking_number,
      tracking_url,
      shipping_note = "",
      notify_customer = false,
      line_items,
    } = body;

    if (!order_sn) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã đơn hàng order_sn" },
        { status: 400 }
      );
    }

    if (!shipping_carrier) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn đơn vị vận chuyển" },
        { status: 400 }
      );
    }

    const cleanTrackingNumber = tracking_number ? String(tracking_number).trim() : "";

    // 1. Tìm đơn hàng trong cơ sở dữ liệu
    const order = await MongoShopeeOrderModel.findOne({ order_sn });
    if (!order) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy đơn hàng #${order_sn} trong hệ thống` },
        { status: 404 }
      );
    }

    if (order.order_status === "Đã hủy") {
      return NextResponse.json(
        { success: false, message: `Đơn hàng #${order_sn} đã hủy, không thể tạo phiếu giao hàng!` },
        { status: 400 }
      );
    }

    // 2. Xác định Sapo Order ID
    let sapoId: number | string | null = null;
    let existingRaw: any = null;

    if (order.raw_text) {
      try {
        existingRaw = JSON.parse(order.raw_text);
        if (existingRaw?.id) sapoId = existingRaw.id;
      } catch {}
    }

    if (!sapoId && order.id && /^\d+$/.test(String(order.id)) && String(order.id).length >= 7) {
      sapoId = order.id;
    }

    if (!sapoId) {
      try {
        const cleanSn = String(order_sn).replace(/^#/, "").trim();
        const searchRes = await SapoService.getOrders({ query: cleanSn, limit: 5 });
        const matched =
          searchRes.orders?.find(
            (o: any) =>
              String(o.order_number) === cleanSn ||
              String(o.name).replace(/^#/, "") === cleanSn ||
              String(o.id) === cleanSn
          ) || searchRes.orders?.[0];
        if (matched?.id) {
          sapoId = matched.id;
          existingRaw = matched;
        }
      } catch (searchErr: any) {
        console.warn("[Fulfillment Sapo Order Search Warning]:", searchErr.message);
      }
    }

    if (!sapoId) {
      return NextResponse.json(
        {
          success: false,
          message: `Không tìm thấy ID tương ứng trên Sapo Omnichannel cho đơn hàng #${order_sn}`,
        },
        { status: 400 }
      );
    }

    // 3. Chuẩn bị URL tra cứu
    const finalTrackingUrl =
      tracking_url && tracking_url.trim()
        ? tracking_url.trim()
        : getCarrierTrackingUrl(shipping_carrier, cleanTrackingNumber);

    // 4. Tạo payload Fulfillment gửi Sapo
    const fulfillmentPayload: any = {
      tracking_company: shipping_carrier,
      notify_customer: Boolean(notify_customer),
    };

    if (cleanTrackingNumber) {
      fulfillmentPayload.tracking_number = cleanTrackingNumber;
    }

    if (finalTrackingUrl) {
      fulfillmentPayload.tracking_url = finalTrackingUrl;
    }

    if (Array.isArray(line_items) && line_items.length > 0) {
      fulfillmentPayload.line_items = line_items.map((it: any) => ({
        id: Number(it.id),
        quantity: Number(it.quantity) || 1,
      }));
    }

    let sapoFulfillmentRes: any = null;
    try {
      sapoFulfillmentRes = await SapoService.createFulfillment(sapoId, fulfillmentPayload);
    } catch (sapoErr: any) {
      console.error(`[Sapo Fulfillment Error] Đơn ${order_sn} (Sapo ID ${sapoId}):`, sapoErr);
      const { displayMessage, rawError } = parseSapoErrorDetail(
        sapoErr,
        "Lỗi khi gửi yêu cầu vận chuyển lên Sapo"
      );
      return NextResponse.json(
        {
          success: false,
          message: displayMessage,
          sapo_detail: displayMessage,
          error: rawError,
        },
        { status: 500 }
      );
    }

    // 5. Lấy lại thông tin chi tiết đơn hàng từ Sapo để đồng bộ dữ liệu mới nhất
    let updatedSapoOrder: any = null;
    try {
      const freshOrderRes = await SapoService.getOrderById(sapoId);
      if (freshOrderRes?.order) {
        updatedSapoOrder = freshOrderRes.order;
      }
    } catch (fetchErr) {
      console.warn("[Fulfillment Fresh Order Fetch Warning]:", fetchErr);
    }

    // Xác định mã tracking trả về từ Sapo hoặc đối tác
    const assignedTracking =
      sapoFulfillmentRes?.fulfillment?.tracking_number ||
      updatedSapoOrder?.fulfillments?.[0]?.tracking_number ||
      cleanTrackingNumber ||
      "";

    const finalRawText = updatedSapoOrder
      ? JSON.stringify(updatedSapoOrder)
      : existingRaw
      ? JSON.stringify({
          ...existingRaw,
          fulfillment_status: "fulfilled",
          fulfillments: [
            ...(existingRaw.fulfillments || []),
            sapoFulfillmentRes?.fulfillment || {
              tracking_company: shipping_carrier,
              tracking_number: assignedTracking,
              tracking_url: finalTrackingUrl,
            },
          ],
        })
      : order.raw_text;

    // 6. Cập nhật MongoDB
    const newStatus = "Đang giao";
    const updateData: any = {
      order_status: newStatus,
      shipping_carrier,
      tracking_number: assignedTracking,
      raw_text: finalRawText,
      updatedAt: now,
    };

    if (shipping_note) {
      updateData.status_description = `ĐVVC: ${shipping_carrier}${assignedTracking ? ` | Vận đơn: ${assignedTracking}` : ""} | Ghi chú VC: ${shipping_note}`;
    }

    await MongoShopeeOrderModel.updateOne({ order_sn }, { $set: updateData });
    const updatedDoc = await MongoShopeeOrderModel.findOne({ order_sn });

    // 7. Ghi nhật ký hệ thống
    const fulfillmentCode = sapoFulfillmentRes?.fulfillment?.name || sapoFulfillmentRes?.fulfillment?.id || "";
    await LogModel.createLog({
      level: "info",
      type: "order_fulfillment",
      source: "sapo_fulfillment_api",
      shop_username: order.shop_username,
      message: assignedTracking
        ? `Đã đẩy đơn #${order_sn} qua ${shipping_carrier} thành công! Mã vận đơn: ${assignedTracking}${
            fulfillmentCode ? ` (Phiếu Sapo: ${fulfillmentCode})` : ""
          }`
        : `Đã tạo yêu cầu vận chuyển đơn #${order_sn} qua ${shipping_carrier} trên Sapo thành công!${
            fulfillmentCode ? ` (Phiếu Sapo: ${fulfillmentCode})` : ""
          }`,
      details: {
        order_sn,
        sapo_id: sapoId,
        shipping_carrier,
        tracking_number: assignedTracking,
        tracking_url: finalTrackingUrl,
        shipping_note,
        sapo_fulfillment: sapoFulfillmentRes?.fulfillment,
      },
    });

    return NextResponse.json({
      success: true,
      message: assignedTracking
        ? `Đã đẩy đơn hàng #${order_sn} qua ${shipping_carrier} và đồng bộ Sapo thành công! Mã vận đơn: ${assignedTracking}`
        : `Đã gửi yêu cầu vận chuyển đơn hàng #${order_sn} qua ${shipping_carrier} lên Sapo thành công! Đối tác sẽ tự động cấp mã vận đơn và đồng bộ về hệ thống.`,
      data: updatedDoc,
      fulfillment: sapoFulfillmentRes?.fulfillment,
      tracking_number: assignedTracking,
      tracking_url: finalTrackingUrl,
    });
  } catch (error: any) {
    console.error("[Fulfillment API Unexpected Error]:", error);
    const { displayMessage, rawError } = parseSapoErrorDetail(
      error,
      "Lỗi hệ thống khi xử lý vận chuyển đơn hàng"
    );
    return NextResponse.json(
      {
        success: false,
        message: displayMessage,
        error: rawError,
      },
      { status: 500 }
    );
  }
}

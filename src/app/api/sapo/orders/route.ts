import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

export const maxDuration = 30;

function mapSapoOrder(o: any, now: string) {
  const orderSn = String(o.order_number || o.name || o.reference_order_number || o.id);
  const rawSource = String(o.source_name || o.channel || "sapo").toLowerCase();

  let shopSource = "sapo_web";
  if (rawSource.includes("shopee")) shopSource = "sapo_shopee";
  else if (rawSource.includes("tiktok")) shopSource = "sapo_tiktok";
  else if (rawSource.includes("lazada")) shopSource = "sapo_lazada";
  else if (rawSource === "admin" || rawSource.includes("pos") || rawSource.includes("internal")) shopSource = "sapo_pos";
  else if (rawSource.includes("facebook")) shopSource = "sapo_facebook";
  else if (rawSource.includes("zalo")) shopSource = "sapo_zalo";
  else shopSource = `sapo_${rawSource}`;

  const buyerName =
    o.shipping_address?.name ||
    [o.customer?.last_name, o.customer?.first_name].filter(Boolean).join(" ").trim() ||
    o.customer?.name ||
    "Khách lẻ";

  let orderStatus = "Chờ xử lý";
  if (o.cancelled_on || o.status === "cancelled" || o.financial_status === "voided") {
    orderStatus = "Đã hủy";
  } else if (o.fulfillment_status === "fulfilled" || o.status === "closed") {
    orderStatus = "Đã giao";
  } else if (o.fulfillment_status === "partial") {
    orderStatus = "Đang giao";
  } else if (o.financial_status === "paid") {
    orderStatus = "Đã thanh toán";
  }

  const items = Array.isArray(o.line_items)
    ? o.line_items.map((item: any) => ({
        product_name: String(item.title || item.name || "Sản phẩm"),
        variation: String(item.variant_title || ""),
        quantity: Number(item.quantity) || 1,
      }))
    : [];

  return {
    id: orderSn,
    order_sn: orderSn,
    shop_username: shopSource,
    buyer_username: buyerName,
    total_amount: Number(o.total_price) || 0,
    payment_method: o.gateway || o.payment_gateway_names?.[0] || "Tiền mặt / COD",
    order_status: orderStatus,
    status_description: `Kênh: ${rawSource.toUpperCase()} | Trạng thái: ${orderStatus} | Ghi chú: ${o.note || "Không có"}`,
    shipping_carrier: o.fulfillments?.[0]?.tracking_company || "",
    tracking_number: o.fulfillments?.[0]?.tracking_number || "",
    items,
    raw_text: JSON.stringify(o),
    synced_at: now,
    createdAt: o.created_on || o.created_at || now,
    updatedAt: now,
  };
}

/**
 * POST /api/sapo/orders - Tạo đơn hàng mới trực tiếp lên Sapo Omnichannel
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const now = new Date().toISOString();
    const body = await request.json();

    const {
      shop_username = "sapo_pos",
      buyer_name,
      buyer_phone,
      buyer_address,
      items,
      payment_method = "COD",
      shipping_carrier = "",
      tracking_number = "",
      note = "",
      tags = "internal_website",
    } = body;

    if (!buyer_name) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên khách hàng" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Đơn hàng phải có ít nhất 1 sản phẩm" },
        { status: 400 }
      );
    }

    const sourceName = shop_username.replace(/^sapo_/, "");

    const sapoPayload = {
      source_name: sourceName,
      note,
      tags,
      email: "khachhang@yensen.vn",
      shipping_address: {
        name: buyer_name,
        phone: buyer_phone || "",
        address1: buyer_address || "Việt Nam",
        city: "Hồ Chí Minh",
        country: "Vietnam",
      },
      line_items: items.map((it: any) => ({
        title: it.product_name || it.title || "Sản phẩm",
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
      })),
      gateway: payment_method,
    };

    const sapoRes = await SapoService.createOrder(sapoPayload);
    const sapoOrder = sapoRes.order;

    if (!sapoOrder) {
      throw new Error("Sapo không phản hồi thông tin đơn hàng vừa tạo");
    }

    // Map & lưu vào MongoDB
    const doc = mapSapoOrder(sapoOrder, now);
    doc.shop_username = shop_username;
    if (shipping_carrier) doc.shipping_carrier = shipping_carrier;
    if (tracking_number) doc.tracking_number = tracking_number;

    await MongoShopeeOrderModel.updateOne(
      { order_sn: doc.order_sn },
      { $set: doc },
      { upsert: true }
    );

    await LogModel.createLog({
      level: "success",
      type: "order_create",
      source: "sapo_order_create",
      shop_username,
      message: `Đã tạo đơn hàng mới trên Sapo: #${doc.order_sn} - Khách: ${buyer_name}`,
      details: { order_sn: doc.order_sn, total: doc.total_amount },
    });

    return NextResponse.json({
      success: true,
      message: `Tạo đơn hàng #${doc.order_sn} thành công trên Sapo Omnichannel!`,
      data: doc,
    });
  } catch (error: any) {
    console.error("[Sapo Create Order Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi khi tạo đơn hàng lên Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sapo/orders - Cập nhật ghi chú, tag, người nhận hoặc mã vận đơn
 */
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const now = new Date().toISOString();
    const body = await request.json();
    const { order_sn, note, tags, buyer_username, shipping_carrier, tracking_number } = body;

    if (!order_sn) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã đơn hàng order_sn" },
        { status: 400 }
      );
    }

    const existingOrder = await MongoShopeeOrderModel.findOne({ order_sn });
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn hàng trong hệ thống" },
        { status: 404 }
      );
    }

    // Trích xuất Sapo ID từ raw_text nếu có
    let sapoId: number | string | null = null;
    if (existingOrder.raw_text) {
      try {
        const raw = JSON.parse(existingOrder.raw_text);
        if (raw.id) sapoId = raw.id;
      } catch {}
    }

    // Nếu có sapoId, đồng bộ ngược lên Sapo Admin REST API
    if (sapoId) {
      try {
        const sapoUpdate: any = {};
        if (note !== undefined) sapoUpdate.note = note;
        if (tags !== undefined) sapoUpdate.tags = tags;
        if (Object.keys(sapoUpdate).length > 0) {
          await SapoService.updateOrder(sapoId, sapoUpdate);
        }
      } catch (err: any) {
        console.warn(`[Sapo Sync Warning] Không thể cập nhật lên Sapo API cho đơn ${order_sn}:`, err.message);
      }
    }

    // Cập nhật document trong MongoDB
    const updateFields: any = { updatedAt: now };
    if (note !== undefined) {
      updateFields.status_description = `Ghi chú: ${note}`;
    }
    if (buyer_username !== undefined) updateFields.buyer_username = buyer_username;
    if (shipping_carrier !== undefined) updateFields.shipping_carrier = shipping_carrier;
    if (tracking_number !== undefined) updateFields.tracking_number = tracking_number;

    await MongoShopeeOrderModel.updateOne({ order_sn }, { $set: updateFields });

    await LogModel.createLog({
      level: "info",
      type: "order_update",
      source: "sapo_order_edit",
      shop_username: existingOrder.shop_username,
      message: `Đã cập nhật thông tin đơn hàng #${order_sn}`,
      details: body,
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thông tin đơn hàng #${order_sn} thành công!`,
    });
  } catch (error: any) {
    console.error("[Sapo Update Order Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi cập nhật đơn hàng",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sapo/orders - Thao tác trạng thái đơn (Hủy đơn, Đóng đơn, Mở lại đơn)
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const now = new Date().toISOString();
    const body = await request.json();
    const { order_sn, action, reason = "customer" } = body;

    if (!order_sn || !action) {
      return NextResponse.json(
        { success: false, message: "Thiếu order_sn hoặc hành động action" },
        { status: 400 }
      );
    }

    const order = await MongoShopeeOrderModel.findOne({ order_sn });
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn hàng" },
        { status: 404 }
      );
    }

    let sapoId: number | string | null = null;
    if (order.raw_text) {
      try {
        const raw = JSON.parse(order.raw_text);
        if (raw.id) sapoId = raw.id;
      } catch {}
    }

    let newStatus = order.order_status;

    if (action === "cancel") {
      if (sapoId) {
        try {
          await SapoService.cancelOrder(sapoId, reason);
        } catch (err: any) {
          console.warn("[Sapo Cancel Warning]:", err.message);
        }
      }
      newStatus = "Đã hủy";
    } else if (action === "close") {
      if (sapoId) {
        try {
          await SapoService.closeOrder(sapoId);
        } catch (err: any) {
          console.warn("[Sapo Close Warning]:", err.message);
        }
      }
      newStatus = "Đã giao";
    } else if (action === "open") {
      if (sapoId) {
        try {
          await SapoService.openOrder(sapoId);
        } catch (err: any) {
          console.warn("[Sapo Open Warning]:", err.message);
        }
      }
      newStatus = "Chờ xử lý";
    }

    await MongoShopeeOrderModel.updateOne(
      { order_sn },
      { $set: { order_status: newStatus, updatedAt: now } }
    );

    await LogModel.createLog({
      level: "info",
      type: "order_action",
      source: "sapo_order_action",
      shop_username: order.shop_username,
      message: `Thao tác [${action.toUpperCase()}] đơn hàng #${order_sn} -> Trạng thái: ${newStatus}`,
      details: { order_sn, action, reason, newStatus },
    });

    return NextResponse.json({
      success: true,
      message: `Thao tác [${action}] đơn hàng #${order_sn} thành công! Trạng thái mới: ${newStatus}`,
      data: { order_sn, order_status: newStatus },
    });
  } catch (error: any) {
    console.error("[Sapo Order Action Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi thực hiện hành động trên đơn hàng",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

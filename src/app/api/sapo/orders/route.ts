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
  if (o.cancelled_on || o.cancel_reason || o.status === "cancelled" || o.financial_status === "voided") {
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
 * Helper: Bóc tách lỗi chi tiết từ Sapo API (hỗ trợ array, object, error_description, 500 error)
 */
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

  // Case 1: errors là danh sách các lỗi [{ message, fields }]
  if (data?.errors && Array.isArray(data.errors)) {
    const list = data.errors.map((e: any) => {
      if (typeof e === "string") return e;
      const field = e.fields?.length ? `[${e.fields.join(", ")}] ` : "";
      return `${field}${e.message || JSON.stringify(e)}`;
    });
    return { displayMessage: list.join(" • "), rawError };
  }

  // Case 2: errors là object { "phone": ["is invalid"], "email": ["must be valid email"] }
  if (data?.errors && typeof data.errors === "object") {
    const list = Object.entries(data.errors).map(([key, val]) => {
      const valStr = Array.isArray(val) ? val.join(", ") : String(val);
      return `Trường "${key}": ${valStr}`;
    });
    return { displayMessage: list.join(" • "), rawError };
  }

  // Case 3: error_description
  if (data?.error_description) {
    return { displayMessage: data.error_description, rawError };
  }

  // Case 4: Lỗi 500 từ Sapo
  if (data?.error === "Internal server error" || rawError.includes("500") || rawError.includes("Internal Server Error")) {
    return {
      displayMessage: "Máy chủ Sapo phản hồi lỗi 500 (Internal Server Error). Vui lòng kiểm tra lại thông tin khách hàng, số điện thoại hoặc sản phẩm trong đơn.",
      rawError,
    };
  }

  if (data?.error) {
    return { displayMessage: String(data.error), rawError };
  }

  return { displayMessage: rawError || fallbackMessage, rawError };
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
      shop_username = "Tại quầy",
      source_name,
      buyer_name,
      buyer_phone,
      buyer_email,
      buyer_address,
      items,
      payment_method = "Tiền mặt",
      payment_status,
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

    // Xử lý nguồn đơn (source_name) do người dùng tự do nhập hoặc chọn
    const rawInputSource = (source_name || shop_username || "Tại quầy").trim();

    // Sapo bảo vệ các từ khóa hệ thống (chính xác chữ thường):
    // ["pos", "web", "admin", "shopee", "lazada", "tiktok"].
    // Nếu truyền đúng các từ khóa này, Sapo API sẽ từ chối 422 "cannot be set to a protected value".
    // Tự động chuyển đổi các từ khóa này sang tên hiển thị hợp lệ trên Sapo Admin:
    let finalSourceName = rawInputSource;
    const lower = rawInputSource.toLowerCase();
    if (lower === "pos" || lower === "sapo_pos") {
      finalSourceName = "Tại quầy";
    } else if (lower === "web" || lower === "sapo_web") {
      finalSourceName = "Website";
    } else if (lower === "admin") {
      finalSourceName = "Quản trị viên";
    } else if (lower === "shopee" || lower === "sapo_shopee") {
      finalSourceName = "Kênh Shopee";
    } else if (lower === "lazada" || lower === "sapo_lazada") {
      finalSourceName = "Kênh Lazada";
    } else if (lower === "tiktok" || lower === "sapo_tiktok") {
      finalSourceName = "Kênh TikTok";
    } else {
      finalSourceName = rawInputSource.replace(/^sapo_/i, "");
    }

    const cleanTag = finalSourceName.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    // Xử lý phương thức thanh toán & trạng thái thanh toán
    const paymentLabel = (payment_method || "Tiền mặt").trim();
    const cleanPayTag = paymentLabel.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    // Mặc định: Chuyển khoản, Ví điện tử, Tiền mặt, Thẻ -> Đã thanh toán ("paid")
    // COD -> Chưa thanh toán ("pending")
    const isPaid = payment_status
      ? payment_status === "paid"
      : paymentLabel !== "COD" && !paymentLabel.toLowerCase().includes("thu hộ");

    // Gộp tags bao gồm kênh bán hàng và phương thức thanh toán
    const combinedTags = Array.from(
      new Set(
        [
          "internal_website",
          cleanTag ? `channel_${cleanTag}` : "channel_pos",
          `httt_${cleanPayTag}`,
          isPaid ? "da_thanh_toan" : "chua_thanh_toan",
          ...(tags ? tags.split(",").map((t: string) => t.trim()) : []),
        ].filter(Boolean)
      )
    ).join(",");

    // Phân tách họ và tên khách hàng để Sapo lưu chuẩn trường Customer (Khách hàng)
    const cleanBuyerName = (buyer_name || "").trim();
    const nameParts = cleanBuyerName.split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts[0] : "";
    const firstName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0] || "Khách lẻ";

    const customerData: any = {
      first_name: firstName,
      last_name: lastName,
    };
    if (buyer_phone) customerData.phone = buyer_phone;
    if (buyer_email) customerData.email = buyer_email;

    const addressData: any = {
      first_name: firstName,
      last_name: lastName,
      name: cleanBuyerName,
      phone: buyer_phone || "",
      address1: buyer_address || "Việt Nam",
      city: "Hồ Chí Minh",
      country: "Vietnam",
    };

    const calculatedTotal = items.reduce(
      (sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
      0
    );

    const orderNote = note
      ? `${note} | HTTT: ${paymentLabel} (${isPaid ? "Đã thanh toán" : "Chưa thanh toán"})`
      : `Hình thức thanh toán: ${paymentLabel} (${isPaid ? "Đã thanh toán" : "Chưa thanh toán"})`;

    const sapoPayload: any = {
      source_name: finalSourceName,
      note: orderNote,
      tags: combinedTags,
      customer: customerData,
      shipping_address: addressData,
      billing_address: addressData,
      line_items: items.map((it: any) => ({
        title: it.product_name || it.title || "Sản phẩm",
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
      })),
      gateway: paymentLabel,
      financial_status: isPaid ? "paid" : "pending",
      note_attributes: [
        { name: "created_via", value: "internal_website" },
        { name: "sales_channel", value: finalSourceName },
        { name: "payment_method", value: paymentLabel },
        { name: "hình_thức_thanh_toán", value: paymentLabel },
        { name: "trạng_thái_thanh_toán", value: isPaid ? "Đã thanh toán" : "Chưa thanh toán" },
      ],
    };

    if (buyer_email) {
      sapoPayload.email = buyer_email;
    }

    // Nếu đã thanh toán, đính kèm giao dịch thanh toán để Sapo Admin hiển thị đúng phương thức và số tiền đã nhận
    if (isPaid && calculatedTotal > 0) {
      sapoPayload.transactions = [
        {
          amount: calculatedTotal,
          gateway: paymentLabel,
          kind: "sale",
          status: "success",
        },
      ];
    }

    const sapoRes = await SapoService.createOrder(sapoPayload);
    const sapoOrder = sapoRes.order;

    if (!sapoOrder) {
      throw new Error("Sapo không phản hồi thông tin đơn hàng vừa tạo");
    }

    // Map & lưu vào MongoDB
    const doc = mapSapoOrder(sapoOrder, now);
    doc.shop_username = finalSourceName;
    doc.payment_method = paymentLabel;
    if (isPaid && doc.order_status === "Chờ xử lý") {
      doc.order_status = "Đã thanh toán";
    }
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
      shop_username: finalSourceName,
      message: `Đã tạo đơn hàng mới trên Sapo: #${doc.order_sn} - Nguồn: ${finalSourceName} - Khách: ${buyer_name}`,
      details: { order_sn: doc.order_sn, total: doc.total_amount, source_name: finalSourceName },
    });

    return NextResponse.json({
      success: true,
      message: `Tạo đơn hàng #${doc.order_sn} thành công trên Sapo Omnichannel!`,
      data: doc,
    });
  } catch (error: any) {
    console.error("[Sapo Create Order Error]:", error);
    const { displayMessage, rawError } = parseSapoErrorDetail(error, "Lỗi khi tạo đơn hàng lên Sapo");
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
}

/**
 * PUT /api/sapo/orders - Cập nhật thông tin chi tiết đơn hàng (Đồng bộ Sapo Omnichannel)
 */
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const now = new Date().toISOString();
    const body = await request.json();
    const {
      order_sn,
      buyer_name,
      buyer_username,
      buyer_phone,
      buyer_email,
      buyer_address,
      source_name,
      shop_username,
      payment_method,
      shipping_carrier,
      tracking_number,
      note,
      tags,
      items,
    } = body;

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
    let existingRaw: any = {};
    if (existingOrder.raw_text) {
      try {
        existingRaw = JSON.parse(existingOrder.raw_text);
        if (existingRaw.id) sapoId = existingRaw.id;
      } catch {}
    }

    if (!sapoId && existingOrder.id && /^\d+$/.test(String(existingOrder.id)) && String(existingOrder.id).length >= 7) {
      sapoId = existingOrder.id;
    }

    const cleanBuyerName = (buyer_name || buyer_username || existingOrder.buyer_username || "").trim();

    // Nếu có sapoId, đồng bộ ngược lên Sapo Admin REST API
    let sapoUpdated = false;
    if (sapoId) {
      try {
        const sapoUpdate: any = {};
        if (note !== undefined) sapoUpdate.note = note;
        if (tags !== undefined) sapoUpdate.tags = tags;

        // Cập nhật địa chỉ nhận hàng trên Sapo
        if (buyer_name || buyer_phone || buyer_address) {
          sapoUpdate.shipping_address = {
            ...(existingRaw.shipping_address || {}),
            name: cleanBuyerName,
            phone: buyer_phone !== undefined ? buyer_phone : (existingRaw.shipping_address?.phone || ""),
            address1: buyer_address !== undefined ? buyer_address : (existingRaw.shipping_address?.address1 || "Việt Nam"),
          };
        }

        // Cập nhật thông tin khách hàng trên Sapo
        if (buyer_name || buyer_phone || buyer_email) {
          const nameParts = cleanBuyerName.split(/\s+/);
          const lastName = nameParts.length > 1 ? nameParts[0] : "";
          const firstName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0] || "Khách lẻ";

          sapoUpdate.customer = {
            ...(existingRaw.customer || {}),
            first_name: firstName,
            last_name: lastName,
            name: cleanBuyerName,
            phone: buyer_phone !== undefined ? buyer_phone : (existingRaw.customer?.phone || ""),
            email: buyer_email !== undefined ? buyer_email : (existingRaw.customer?.email || ""),
          };
        }

        if (Object.keys(sapoUpdate).length > 0) {
          const sapoRes = await SapoService.updateOrder(sapoId, sapoUpdate);
          sapoUpdated = true;
          if (sapoRes?.order) {
            existingRaw = { ...existingRaw, ...sapoRes.order };
          }
        }
      } catch (err: any) {
        console.error(`[Sapo Sync Order Error] Không thể cập nhật lên Sapo API cho đơn ${order_sn}:`, err);
        const { displayMessage, rawError } = parseSapoErrorDetail(err, "Lỗi cập nhật đơn hàng lên Sapo");
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
    }

    // Cập nhật document trong MongoDB
    const updateFields: any = { updatedAt: now };
    if (cleanBuyerName) updateFields.buyer_username = cleanBuyerName;
    if (note !== undefined) updateFields.status_description = `Ghi chú: ${note}`;
    if (shipping_carrier !== undefined) updateFields.shipping_carrier = shipping_carrier;
    if (tracking_number !== undefined) updateFields.tracking_number = tracking_number;
    if (payment_method !== undefined) updateFields.payment_method = payment_method;
    if (source_name !== undefined || shop_username !== undefined) {
      updateFields.shop_username = source_name || shop_username;
    }

    // Cập nhật danh sách sản phẩm & tổng tiền nếu có
    if (Array.isArray(items) && items.length > 0) {
      updateFields.items = items.map((it: any) => ({
        product_name: String(it.product_name || it.title || "Sản phẩm"),
        variation: String(it.variation || it.variant_title || ""),
        quantity: Number(it.quantity) || 1,
      }));

      const newTotal = items.reduce(
        (sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
        0
      );
      if (newTotal > 0) {
        updateFields.total_amount = newTotal;
      }
    }

    // Cập nhật raw_text đồng bộ
    if (existingRaw) {
      if (cleanBuyerName) {
        if (!existingRaw.shipping_address) existingRaw.shipping_address = {};
        existingRaw.shipping_address.name = cleanBuyerName;
      }
      if (buyer_phone !== undefined) {
        if (!existingRaw.shipping_address) existingRaw.shipping_address = {};
        existingRaw.shipping_address.phone = buyer_phone;
      }
      if (buyer_address !== undefined) {
        if (!existingRaw.shipping_address) existingRaw.shipping_address = {};
        existingRaw.shipping_address.address1 = buyer_address;
      }
      if (note !== undefined) existingRaw.note = note;
      updateFields.raw_text = JSON.stringify(existingRaw);
    }

    await MongoShopeeOrderModel.updateOne({ order_sn }, { $set: updateFields });

    const updatedDoc = await MongoShopeeOrderModel.findOne({ order_sn });

    await LogModel.createLog({
      level: "info",
      type: "order_update",
      source: "sapo_order_edit",
      shop_username: updatedDoc?.shop_username || existingOrder.shop_username,
      message: `Đã cập nhật thông tin đơn hàng #${order_sn} (${sapoUpdated ? "Đồng bộ Sapo thành công" : "Cập nhật nội bộ"})`,
      details: body,
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thông tin đơn hàng #${order_sn} thành công!${sapoUpdated ? " (Đã đồng bộ lên Sapo)" : ""}`,
      data: updatedDoc,
      sapo_synced: sapoUpdated,
    });
  } catch (error: any) {
    console.error("[Sapo Update Order Error]:", error);
    const { displayMessage, rawError } = parseSapoErrorDetail(error, "Lỗi cập nhật đơn hàng");
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
}

/**
 * DELETE /api/sapo/orders - Xóa đơn hàng và đồng bộ xóa vĩnh viễn trên Sapo Omnichannel
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    let orderSn = searchParams.get("order_sn");

    if (!orderSn) {
      try {
        const body = await request.json();
        orderSn = body?.order_sn;
      } catch {}
    }

    if (!orderSn) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã đơn hàng order_sn" },
        { status: 400 }
      );
    }

    const order = await MongoShopeeOrderModel.findOne({ order_sn: orderSn });
    if (!order) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy đơn hàng #${orderSn} trong hệ thống` },
        { status: 404 }
      );
    }

    // Tìm Sapo ID để xóa trên Sapo Omnichannel
    let sapoId: number | string | null = null;
    if (order.raw_text) {
      try {
        const raw = JSON.parse(order.raw_text);
        if (raw.id) sapoId = raw.id;
      } catch {}
    }

    if (!sapoId && order.id && /^\d+$/.test(String(order.id)) && String(order.id).length >= 7) {
      sapoId = order.id;
    }

    if (!sapoId) {
      try {
        const cleanSn = String(orderSn).replace(/^#/, "").trim();
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
        }
      } catch (searchErr: any) {
        console.warn("[Sapo Delete Search Warning]:", searchErr.message);
      }
    }

    let sapoDeleted = false;
    let sapoErrorMsg = "";

    // Xóa trên Sapo nếu có sapoId
    if (sapoId) {
      try {
        await SapoService.deleteOrder(sapoId);
        sapoDeleted = true;
        console.log(`[Sapo Delete Success] Đã xóa đơn ${orderSn} (Sapo ID: ${sapoId}) trên Sapo Omnichannel`);
      } catch (err: any) {
        console.error(`[Sapo Delete Error] Không thể xóa trên Sapo cho đơn ${orderSn}:`, err);
        const { displayMessage } = parseSapoErrorDetail(err, "Lỗi xóa đơn trên Sapo");
        sapoErrorMsg = displayMessage;
      }
    }

    // Xóa khỏi MongoDB
    await MongoShopeeOrderModel.deleteOne({ order_sn: orderSn });

    await LogModel.createLog({
      level: "warn",
      type: "order_delete",
      source: "sapo_order_delete",
      shop_username: order.shop_username,
      message: `Đã xóa đơn hàng #${orderSn} (${sapoDeleted ? "Đã đồng bộ xóa trên Sapo" : "Xóa nội bộ"})`,
      details: { order_sn: orderSn, sapoId, sapoDeleted, sapoErrorMsg },
    });

    return NextResponse.json({
      success: true,
      message: sapoDeleted
        ? `Đã xóa đơn hàng #${orderSn} và đồng bộ xóa thành công trên Sapo Omnichannel!`
        : `Đã xóa đơn hàng #${orderSn} thành công!${sapoErrorMsg ? ` (Ghi chú Sapo: ${sapoErrorMsg})` : ""}`,
      sapo_deleted: sapoDeleted,
      sapo_id: sapoId,
    });
  } catch (error: any) {
    console.error("[Delete Order API Error]:", error);
    const { displayMessage, rawError } = parseSapoErrorDetail(error, "Lỗi khi xóa đơn hàng");
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
        { success: false, message: "Không tìm thấy đơn hàng trong hệ thống" },
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

    // Nếu không có sapoId trong raw_text, thử lấy từ order.id hoặc tìm kiếm trực tiếp trên Sapo
    if (!sapoId) {
      if (order.id && /^\d+$/.test(String(order.id)) && String(order.id).length >= 7) {
        sapoId = order.id;
      } else {
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
          }
        } catch (searchErr: any) {
          console.warn("[Sapo Order Search Warning]:", searchErr.message);
        }
      }
    }

    if (!sapoId) {
      return NextResponse.json(
        {
          success: false,
          message: `Không tìm thấy mã đơn tương ứng trên Sapo Omnichannel cho đơn hàng #${order_sn}`,
        },
        { status: 400 }
      );
    }

    let sapoResponse: any = null;
    let newStatus = order.order_status;

    if (action === "cancel") {
      sapoResponse = await SapoService.cancelOrder(sapoId, reason);
      newStatus = "Đã hủy";
    } else if (action === "close") {
      sapoResponse = await SapoService.closeOrder(sapoId);
      newStatus = "Đã giao";
    } else if (action === "open") {
      sapoResponse = await SapoService.openOrder(sapoId);
      newStatus = "Chờ xử lý";
    } else {
      return NextResponse.json(
        { success: false, message: `Hành động không hợp lệ: ${action}` },
        { status: 400 }
      );
    }

    const updatedRaw = sapoResponse?.order ? JSON.stringify(sapoResponse.order) : order.raw_text;

    await MongoShopeeOrderModel.updateOne(
      { order_sn },
      {
        $set: {
          order_status: newStatus,
          raw_text: updatedRaw,
          updatedAt: now,
        },
      }
    );

    await LogModel.createLog({
      level: "info",
      type: "order_action",
      source: "sapo_order_action",
      shop_username: order.shop_username,
      message: `Thao tác [${action.toUpperCase()}] đơn hàng #${order_sn} trên Sapo thành công -> Trạng thái: ${newStatus}`,
      details: { order_sn, sapoId, action, reason, newStatus },
    });

    const actionText =
      action === "cancel" ? "hủy" : action === "close" ? "hoàn tất / đóng" : "mở lại";

    return NextResponse.json({
      success: true,
      message: `Đã ${actionText} đơn hàng #${order_sn} thành công trên Sapo! Trạng thái mới: ${newStatus}`,
      data: { order_sn, order_status: newStatus, sapo_order: sapoResponse?.order },
    });
  } catch (error: any) {
    console.error("[Sapo Order Action Error]:", error);
    const { displayMessage, rawError } = parseSapoErrorDetail(error, "Lỗi thao tác trên Sapo");
    return NextResponse.json(
      {
        success: false,
        message: displayMessage,
        sapo_detail: displayMessage,
        error: rawError,
      },
      { status: 400 }
    );
  }
}

/**
 * GET /api/sapo/orders?order_sn=...
 * Kiểm tra và làm mới trạng thái thời gian thực của đơn hàng từ Sapo Admin về hệ thống
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const orderSn = searchParams.get("order_sn");

    if (!orderSn) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã đơn hàng order_sn" },
        { status: 400 }
      );
    }

    const order = await MongoShopeeOrderModel.findOne({ order_sn: orderSn });
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn hàng trong hệ thống" },
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

    if (!sapoId && order.id && /^\d+$/.test(String(order.id)) && String(order.id).length >= 7) {
      sapoId = order.id;
    }

    let sapoOrder: any = null;
    if (sapoId) {
      try {
        const res = await SapoService.getOrderById(sapoId);
        sapoOrder = res.order;
      } catch (err: any) {
        console.warn(`[Sapo Sync Warning] Không lấy được theo ID ${sapoId}:`, err.message);
      }
    }

    if (!sapoOrder) {
      const cleanSn = String(orderSn).replace(/^#/, "").trim();
      const searchRes = await SapoService.getOrders({ query: cleanSn, limit: 5 });
      sapoOrder =
        searchRes.orders?.find(
          (o: any) =>
            String(o.order_number) === cleanSn ||
            String(o.name).replace(/^#/, "") === cleanSn ||
            String(o.id) === cleanSn
        ) || searchRes.orders?.[0];
    }

    if (!sapoOrder) {
      return NextResponse.json(
        {
          success: false,
          message: `Không tìm thấy thông tin đơn #${orderSn} trên Sapo Omnichannel`,
        },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const mapped = mapSapoOrder(sapoOrder, now);

    // Cập nhật lại vào MongoDB
    await MongoShopeeOrderModel.updateOne(
      { order_sn: orderSn },
      {
        $set: {
          order_status: mapped.order_status,
          status_description: mapped.status_description,
          shipping_carrier: mapped.shipping_carrier || order.shipping_carrier,
          tracking_number: mapped.tracking_number || order.tracking_number,
          raw_text: JSON.stringify(sapoOrder),
          synced_at: now,
          updatedAt: now,
        },
      }
    );

    const updatedDoc = await MongoShopeeOrderModel.findOne({ order_sn: orderSn });

    return NextResponse.json({
      success: true,
      message: `Đã làm mới trạng thái đơn #${orderSn} từ Sapo: ${mapped.order_status}`,
      order: updatedDoc,
      sapo_order: sapoOrder,
    });
  } catch (error: any) {
    console.error("[Sapo Get Order Status Error]:", error);
    const { displayMessage, rawError } = parseSapoErrorDetail(error, "Lỗi kiểm tra trạng thái từ Sapo");
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
}

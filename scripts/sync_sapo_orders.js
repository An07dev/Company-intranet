const mongoose = require("mongoose");

const apiKey = process.env.SAPO_API_KEY || "9e84e8ba383f4f99a8cf2487932d4afe";
const secret = process.env.SAPO_API_SECRET || "b4ddea44a45447a1ab29e3680fc76c16";
const storeDomain = process.env.SAPO_STORE_DOMAIN || "cua-hang-yen-sen.mysapo.net";

const auth = Buffer.from(`${apiKey}:${secret}`).toString("base64");
const headers = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};

async function syncOrders() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/internal_website";
  await mongoose.connect(mongoUri);
  console.log(`[Sync] Đã kết nối MongoDB: ${mongoUri.split("@").pop()}`);

  console.log("[Sync] Đang tải đơn hàng mở (status=open) và đóng (status=closed) từ Sapo...");
  const [openRes, closedRes] = await Promise.all([
    fetch(`https://${storeDomain}/admin/orders.json?status=open&limit=100`, { headers }),
    fetch(`https://${storeDomain}/admin/orders.json?status=closed&limit=100`, { headers }),
  ]);

  const openOrders = (await openRes.json()).orders || [];
  const closedOrders = (await closedRes.json()).orders || [];
  const rawOrders = [...openOrders, ...closedOrders];

  console.log(`[Sync] Đã lấy thành công ${rawOrders.length} đơn hàng từ Sapo Omnichannel.`);

  const col = mongoose.connection.collection("shopee_orders");
  let inserted = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const o of rawOrders) {
    const orderSn = String(o.order_number || o.name || o.id);
    const rawSource = String(o.source_name || o.channel || "sapo").toLowerCase();

    let shopSource = "sapo_web";
    if (rawSource.includes("shopee")) shopSource = "sapo_shopee";
    else if (rawSource.includes("tiktok")) shopSource = "sapo_tiktok";
    else if (rawSource.includes("lazada")) shopSource = "sapo_lazada";
    else if (rawSource === "admin" || rawSource.includes("pos")) shopSource = "sapo_pos";
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
    } else if (o.fulfillment_status === "fulfilled") {
      orderStatus = "Đã giao";
    } else if (o.fulfillment_status === "partial") {
      orderStatus = "Đang giao";
    } else if (o.financial_status === "paid") {
      orderStatus = "Đã thanh toán";
    }

    const items = Array.isArray(o.line_items)
      ? o.line_items.map((item) => ({
          product_name: String(item.title || item.name || "Sản phẩm"),
          variation: String(item.variant_title || ""),
          quantity: Number(item.quantity) || 1,
        }))
      : [];

    const doc = {
      order_sn: orderSn,
      shop_username: shopSource,
      buyer_username: buyerName,
      total_amount: Number(o.total_price) || 0,
      payment_method: o.gateway || o.payment_gateway_names?.[0] || "Chưa rõ",
      order_status: orderStatus,
      status_description: `Kênh: ${rawSource.toUpperCase()} | Thanh toán: ${o.financial_status || "N/A"} | Giao hàng: ${o.fulfillment_status || "Chưa giao"}`,
      shipping_carrier: o.fulfillments?.[0]?.tracking_company || "",
      tracking_number: o.fulfillments?.[0]?.tracking_number || "",
      items,
      raw_text: JSON.stringify(o),
      synced_at: now,
      createdAt: o.created_on || o.created_at || now,
      updatedAt: now,
    };

    const res = await col.updateOne(
      { order_sn: orderSn },
      { $set: doc },
      { upsert: true }
    );
    if (res.upsertedCount > 0) inserted++;
    else if (res.modifiedCount > 0) updated++;
  }

  const totalInDb = await col.countDocuments();
  console.log(`[Sync Thành Công] Thêm mới: ${inserted} đơn, Cập nhật: ${updated} đơn.`);
  console.log(`[Thống Kê DB] Tổng số đơn hàng trong Database hiện tại: ${totalInDb} đơn.`);
  process.exit(0);
}

syncOrders().catch((err) => {
  console.error("[Sync Lỗi]:", err);
  process.exit(1);
});

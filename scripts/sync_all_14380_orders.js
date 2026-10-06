const mongoose = require("mongoose");

const apiKey = process.env.SAPO_API_KEY || "9e84e8ba383f4f99a8cf2487932d4afe";
const secret = process.env.SAPO_API_SECRET || "b4ddea44a45447a1ab29e3680fc76c16";
const storeDomain = process.env.SAPO_STORE_DOMAIN || "cua-hang-yen-sen.mysapo.net";

const auth = Buffer.from(`${apiKey}:${secret}`).toString("base64");
const headers = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};

async function sapoGet(endpoint) {
  const res = await fetch(`https://${storeDomain}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`Sapo API lỗi [${res.status}]: ${res.statusText}`);
  }
  return res.json();
}

function mapSapoOrder(o, now) {
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

  return {
    id: orderSn,
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
}

async function syncAll14kOrders() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/internal_website";
  await mongoose.connect(mongoUri);
  console.log(`[Database] Đã kết nối: ${mongoUri}`);

  const orderCol = mongoose.connection.collection("shopee_orders");
  const now = new Date().toISOString();

  console.log("=== BẮT ĐẦU ĐỒNG BỘ TOÀN BỘ 14.380 ĐƠN HÀNG TỪ SAPO ===");

  const fetchStatusList = [
    { status: "open", totalPages: 4, label: "Đơn đang mở (Open - 953 đơn)" },
    { status: "cancelled", totalPages: 11, label: "Đơn đã hủy (Cancelled - 2.591 đơn)" },
    { status: "closed", totalPages: 44, label: "Đơn đã hoàn tất (Closed - 10.836 đơn)" },
  ];

  let totalSynced = 0;

  for (const group of fetchStatusList) {
    console.log(`\n>> Đang kéo: ${group.label} (${group.totalPages} trang)...`);

    for (let p = 1; p <= group.totalPages; p++) {
      try {
        const data = await sapoGet(`/admin/orders.json?status=${group.status}&limit=250&page=${p}`);
        const orders = data.orders || [];
        if (orders.length === 0) break;

        const bulkOps = orders.map((o) => {
          const doc = mapSapoOrder(o, now);
          return {
            updateOne: {
              filter: { order_sn: doc.order_sn },
              update: { $set: doc },
              upsert: true,
            },
          };
        });

        if (bulkOps.length > 0) {
          await orderCol.bulkWrite(bulkOps, { ordered: false });
        }

        totalSynced += orders.length;
        process.stdout.write(`   + Trang ${p}/${group.totalPages}: đã lưu ${orders.length} đơn (Tổng tích lũy: ${totalSynced} đơn)\r`);
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`\n   Lỗi trang ${p}:`, err.message);
      }
    }
    console.log("");
  }

  const finalCount = await orderCol.countDocuments();
  console.log("\n=======================================================");
  console.log(`🎉 ĐỒNG BỘ TOÀN BỘ LỊCH SỬ THÀNH CÔNG!`);
  console.log(`Tổng số đơn hàng thực tế trong Cơ sở dữ liệu: ${finalCount} đơn hàng.`);
  console.log("=======================================================");

  process.exit(0);
}

syncAll14kOrders().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});

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

async function syncAll() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/internal_website";
  await mongoose.connect(mongoUri);
  console.log(`[1/5] Đã kết nối MongoDB: ${mongoUri.split("@").pop()}`);

  const orderCol = mongoose.connection.collection("shopee_orders");
  const productCol = mongoose.connection.collection("shopee_products");
  const now = new Date().toISOString();

  // BƯỚC 1: XÓA SẠCH CÁC ĐƠN HÀNG VÀ SẢN PHẨM CŨ TỪ EXTENSION (không thuộc Sapo)
  console.log("[2/5] Đang loại bỏ đơn hàng & sản phẩm từ Chrome Extension...");
  const deleteRes = await orderCol.deleteMany({
    $or: [
      { shop_username: "baobiyensen" },
      { shop_username: { $not: /^sapo_/ } },
      { raw_text: { $regex: /chrome_extension/i } },
    ],
  });
  const deleteProdRes = await productCol.deleteMany({
    $or: [
      { shop_username: "baobiyensen" },
      { shop_username: { $not: /^sapo/ } },
    ],
  });
  console.log(`=> Đã xóa sạch ${deleteRes.deletedCount} đơn hàng và ${deleteProdRes.deletedCount} sản phẩm cũ từ Extension.`);

  // BƯỚC 2: ĐỒNG BỘ TOÀN BỘ SẢN PHẨM TỪ SAPO (432 SKU)
  console.log("[3/5] Đang kéo toàn bộ danh mục sản phẩm từ Sapo...");
  let page = 1;
  let allProducts = [];
  while (true) {
    const data = await sapoGet(`/admin/products.json?page=${page}&limit=250`);
    const prods = data.products || [];
    if (prods.length === 0) break;
    allProducts.push(...prods);
    console.log(`   + Trang ${page}: lấy ${prods.length} sản phẩm`);
    if (prods.length < 250) break;
    page++;
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`=> Tổng số sản phẩm lấy từ Sapo: ${allProducts.length} sản phẩm.`);

  // Lưu sản phẩm vào DB
  let prodInserted = 0;
  let prodUpdated = 0;
  for (const p of allProducts) {
    const itemId = String(p.id);
    const variants = p.variants || [];
    const stock = variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
    const prices = variants.map((v) => v.price || 0).filter((pr) => pr > 0);
    const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
    const priceMax = prices.length > 0 ? Math.max(...prices) : 0;
    const priceDisplay =
      priceMin === priceMax
        ? `₫${priceMin.toLocaleString("vi-VN")}`
        : `₫${priceMin.toLocaleString("vi-VN")} - ₫${priceMax.toLocaleString("vi-VN")}`;

    const variations = variants.map((v) => ({
      model_id: String(v.id),
      name: v.title || v.sku || "Phân loại",
      sku: v.sku || "",
      price: v.price || 0,
      stock: v.inventory_quantity || 0,
      image: p.image?.src || "",
    }));

    const prodDoc = {
      id: itemId,
      item_id: itemId,
      name: p.name,
      parent_sku: variants[0]?.sku || "",
      image: p.image?.src || p.images?.[0]?.src || "",
      product_url: `https://${storeDomain}/admin/products/${p.id}`,
      price_min: priceMin,
      price_max: priceMax,
      price_display: priceDisplay,
      stock: stock,
      sales_30d: 0,
      views_30d: "0",
      status: stock > 0 ? "Đang hoạt động" : "Hết hàng",
      variations: variations,
      shop_username: "sapo_omnichannel",
      synced_at: now,
      createdAt: p.created_on || now,
      updatedAt: now,
    };

    const res = await productCol.updateOne(
      { item_id: itemId },
      { $set: prodDoc },
      { upsert: true }
    );
    if (res.upsertedCount > 0) prodInserted++;
    else if (res.modifiedCount > 0) prodUpdated++;
  }
  console.log(`=> Đã lưu sản phẩm vào DB: Thêm mới ${prodInserted}, Cập nhật ${prodUpdated}.`);

  // BƯỚC 3: ĐỒNG BỘ ĐƠN HÀNG ĐA KÊNH TỪ SAPO (~2.000 ĐƠN HÀNG)
  console.log("[4/5] Đang kéo ~2.000 đơn hàng Sapo (tất cả các kênh)...");
  const [openP1, openP2, openP3, openP4, closedP1, closedP2, closedP3, closedP4] = await Promise.all([
    sapoGet("/admin/orders.json?status=open&limit=250&page=1"),
    sapoGet("/admin/orders.json?status=open&limit=250&page=2"),
    sapoGet("/admin/orders.json?status=open&limit=250&page=3"),
    sapoGet("/admin/orders.json?status=open&limit=250&page=4"),
    sapoGet("/admin/orders.json?status=closed&limit=250&page=1"),
    sapoGet("/admin/orders.json?status=closed&limit=250&page=2"),
    sapoGet("/admin/orders.json?status=closed&limit=250&page=3"),
    sapoGet("/admin/orders.json?status=closed&limit=250&page=4"),
  ]);

  const rawOrders = [
    ...(openP1.orders || []),
    ...(openP2.orders || []),
    ...(openP3.orders || []),
    ...(openP4.orders || []),
    ...(closedP1.orders || []),
    ...(closedP2.orders || []),
    ...(closedP3.orders || []),
    ...(closedP4.orders || []),
  ];
  console.log(`=> Lấy được tổng cộng ${rawOrders.length} đơn hàng Sapo.`);

  let orderInserted = 0;
  let orderUpdated = 0;

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

    const orderDoc = {
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

    const res = await orderCol.updateOne(
      { order_sn: orderSn },
      { $set: orderDoc },
      { upsert: true }
    );
    if (res.upsertedCount > 0) orderInserted++;
    else if (res.modifiedCount > 0) orderUpdated++;
  }

  // BƯỚC 4: THỐNG KÊ KẾT QUẢ CUỐI CÙNG
  const totalOrdersInDb = await orderCol.countDocuments();
  const totalProductsInDb = await productCol.countDocuments();

  console.log("\n==========================================");
  console.log("🎉 ĐỒNG BỘ TOÀN DIỆN SAPO HOÀN TẤT!");
  console.log(`- Đơn hàng Sapo trong DB: ${totalOrdersInDb} đơn.`);
  console.log(`- Sản phẩm Sapo trong DB: ${totalProductsInDb} sản phẩm.`);
  console.log("- Đã loại bỏ 100% đơn hàng từ Chrome Extension cũ.");
  console.log("==========================================\n");

  process.exit(0);
}

syncAll().catch((err) => {
  console.error("Lỗi đồng bộ:", err);
  process.exit(1);
});

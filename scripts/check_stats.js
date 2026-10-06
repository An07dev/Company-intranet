const mongoose = require("mongoose");

async function check() {
  await mongoose.connect("mongodb://127.0.0.1:27017/internal_website");
  const col = mongoose.connection.collection("shopee_orders");
  const count = await col.countDocuments();
  const channels = await col
    .aggregate([
      { $group: { _id: "$shop_username", count: { $sum: 1 }, totalRevenue: { $sum: "$total_amount" } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
  const statuses = await col
    .aggregate([
      { $group: { _id: "$order_status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
  const totalRev = channels.reduce((acc, c) => acc + (c.totalRevenue || 0), 0);

  console.log("=========================================");
  console.log(`TOTAL ORDERS IN DB: ${count}`);
  console.log(`TOTAL REVENUE: ${totalRev.toLocaleString("vi-VN")} ₫`);
  console.log("CHANNELS BREAKDOWN:", channels);
  console.log("STATUS BREAKDOWN:", statuses);
  console.log("=========================================");
  process.exit(0);
}

check();

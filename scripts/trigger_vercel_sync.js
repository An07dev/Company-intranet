async function runVercelSync() {
  const baseUrl = "https://company-intranet-bigman.vercel.app/api/sapo/sync-all";
  console.log("=== BẮT ĐẦU ĐỒNG BỘ 14.380 ĐƠN LÊN CƠ SỞ DỮ LIỆU CLOUD CỦA VERCEL ===");

  async function postStep(body) {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  // 1. Kiểm tra count
  console.log("\n1. Đang kiểm tra Sapo count...");
  const countRes = await postStep({ step: "count" });
  console.log("   Sapo Data:", countRes.data);

  // 2. Dọn dẹp & Sản phẩm
  console.log("\n2. Đang dọn dẹp đơn cũ & đồng bộ sản phẩm...");
  const prodRes = await postStep({ step: "products" });
  console.log("   Kết quả:", prodRes.message);

  let totalSynced = 0;

  // 3. Open (trang 1-4)
  console.log("\n3. Đang đồng bộ đơn Open (trang 1-4)...");
  const openRes = await postStep({ step: "orders", status: "open", pageStart: 1, pageEnd: 4 });
  totalSynced += openRes.syncedOrders || 0;
  console.log(`   Đã nạp ${openRes.syncedOrders} đơn Open (Tích lũy: ${totalSynced})`);

  // 4. Cancelled (trang 1-6 và 7-11)
  console.log("\n4. Đang đồng bộ đơn Cancelled đợt 1 (trang 1-6)...");
  const can1Res = await postStep({ step: "orders", status: "cancelled", pageStart: 1, pageEnd: 6 });
  totalSynced += can1Res.syncedOrders || 0;
  console.log(`   Đã nạp ${can1Res.syncedOrders} đơn Cancelled đợt 1 (Tích lũy: ${totalSynced})`);

  console.log("   Đang đồng bộ đơn Cancelled đợt 2 (trang 7-11)...");
  const can2Res = await postStep({ step: "orders", status: "cancelled", pageStart: 7, pageEnd: 11 });
  totalSynced += can2Res.syncedOrders || 0;
  console.log(`   Đã nạp ${can2Res.syncedOrders} đơn Cancelled đợt 2 (Tích lũy: ${totalSynced})`);

  // 5. Closed (44 trang -> 6 đợt)
  const closedChunks = [
    { start: 1, end: 8 },
    { start: 9, end: 16 },
    { start: 17, end: 24 },
    { start: 25, end: 32 },
    { start: 33, end: 40 },
    { start: 41, end: 44 },
  ];

  for (let i = 0; i < closedChunks.length; i++) {
    const chunk = closedChunks[i];
    console.log(`\n5.${i + 1} Đang đồng bộ đơn Closed đợt ${i + 1}/6 (trang ${chunk.start}-${chunk.end})...`);
    const cRes = await postStep({ step: "orders", status: "closed", pageStart: chunk.start, pageEnd: chunk.end });
    totalSynced += cRes.syncedOrders || 0;
    console.log(`   Đã nạp ${cRes.syncedOrders} đơn Closed (Tích lũy: ${totalSynced})`);
  }

  console.log("\n=======================================================");
  console.log(`🎉 HOÀN TẤT ĐỒNG BỘ LÊN CLOUD VERCEL! Tổng số đơn đã nạp: ${totalSynced}`);
  console.log("=======================================================");
  process.exit(0);
}

runVercelSync().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});

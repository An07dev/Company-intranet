/**
 * Script đồng bộ hoàn chỉnh toàn bộ đơn hàng Sapo lên Vercel Cloud Database
 * Chạy từng trang (pageStart = pageEnd = p) để không bao giờ bị timeout trên Vercel Serverless Function (thời gian ~2-3s / trang).
 */

const BASE_URL = "https://company-intranet-bigman.vercel.app/api/sapo/sync-all";

async function postChunk(status, page, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "orders",
          status,
          pageStart: page,
          pageEnd: page,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.warn(`[Cảnh báo] Lỗi trang ${status} #${page} (lần thử ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

async function syncAllToVercel() {
  console.log("=== BẮT ĐẦU ĐỒNG BỘ TOÀN DIỆN SAPO LÊN VERCEL ===");
  const startTime = Date.now();

  // 1. CLOSED ORDERS (44 trang)
  console.log("\n--- BẮT ĐẦU ĐỒNG BỘ ĐƠN CLOSED (44 trang) ---");
  let totalClosed = 0;
  for (let p = 1; p <= 44; p++) {
    const t0 = Date.now();
    const res = await postChunk("closed", p);
    const count = res.syncedOrders || 0;
    totalClosed += count;
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[Closed ${p}/44] Đã nạp ${count} đơn (${dur}s) - Tích lũy: ${totalClosed}`);
    if (count < 250) {
      console.log(`Đã đạt trang cuối của closed (${p}).`);
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // 2. CANCELLED ORDERS (11 trang)
  console.log("\n--- BẮT ĐẦU ĐỒNG BỘ ĐƠN CANCELLED (11 trang) ---");
  let totalCancelled = 0;
  for (let p = 1; p <= 11; p++) {
    const t0 = Date.now();
    const res = await postChunk("cancelled", p);
    const count = res.syncedOrders || 0;
    totalCancelled += count;
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[Cancelled ${p}/11] Đã nạp ${count} đơn (${dur}s) - Tích lũy: ${totalCancelled}`);
    if (count < 250) {
      console.log(`Đã đạt trang cuối của cancelled (${p}).`);
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN TẤT ĐỒNG BỘ TOÀN DIỆN LÊN VERCEL TRONG ${totalTime}s!`);
  console.log(`- Đơn Closed: ${totalClosed}`);
  console.log(`- Đơn Cancelled: ${totalCancelled}`);
  console.log(`======================================================`);
}

syncAllToVercel()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("LỖI ĐỒNG BỘ VERCEL:", err);
    process.exit(1);
  });

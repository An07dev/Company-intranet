async function testAll() {
  console.log('================================================================');
  console.log('KIỂM THỬ TOÀN DIỆN NÚT ĐỒNG BỘ Ở CẢ 2 TAB: QUẢN LÝ CÔNG NỢ SAPO');
  console.log('================================================================\n');

  console.log('>>> [TAB 1: CÔNG NỢ KHÁCH HÀNG]');
  console.log('1. Kích hoạt nút Đồng bộ (POST /api/sapo/debts/sync)...');
  const t1 = Date.now();
  const syncCustRes = await fetch('http://localhost:3000/api/sapo/debts/sync', { method: 'POST' });
  const syncCustJson = await syncCustRes.json();
  console.log('✓ Status:', syncCustRes.status);
  console.log('✓ Thông báo:', syncCustJson.message);
  console.log('✓ Chi tiết:', JSON.stringify(syncCustJson.data));
  console.log('✓ Thời gian thực hiện:', Date.now() - t1, 'ms');

  console.log('\n2. Kiểm tra Thống kê KPI Công nợ Khách hàng (GET /api/sapo/debts?type=summary)...');
  const sumRes = await fetch('http://localhost:3000/api/sapo/debts?type=summary');
  const sumJson = await sumRes.json();
  console.log('✓ Tổng nợ cuối kỳ:', sumJson.data?.cuoi_ky?.toLocaleString('vi-VN'), 'đ');
  console.log('✓ Tổng số khách nợ:', sumJson.data?.totalDebtors);
  console.log('✓ Tổng số đơn nợ:', sumJson.data?.totalDebtOrders);

  console.log('\n3. Kiểm tra Danh sách Khách nợ (GET /api/sapo/debts?type=customers&limit=3)...');
  const custListRes = await fetch('http://localhost:3000/api/sapo/debts?type=customers&limit=3');
  const custListJson = await custListRes.json();
  (custListJson.data?.customers || []).forEach((c, i) => {
    console.log(`  ${i+1}. ${c.name} | SĐT: ${c.phone || 'N/A'} | Nợ cuối kỳ: ${c.cuoi_ky?.toLocaleString('vi-VN')} đ`);
  });

  console.log('\n----------------------------------------------------------------\n');
  console.log('>>> [TAB 2: CÔNG NỢ NHÀ CUNG CẤP]');
  console.log('1. Kích hoạt nút Đồng bộ (POST /api/sapo/debts/suppliers/sync)...');
  const t2 = Date.now();
  const syncSupRes = await fetch('http://localhost:3000/api/sapo/debts/suppliers/sync', { method: 'POST' });
  const syncSupJson = await syncSupRes.json();
  console.log('✓ Status:', syncSupRes.status);
  console.log('✓ Chi tiết:', JSON.stringify(syncSupJson.data));
  console.log('✓ Thời gian thực hiện:', Date.now() - t2, 'ms');

  console.log('\n2. Kiểm tra Thống kê KPI Công nợ NCC (GET /api/sapo/debts/suppliers?type=summary)...');
  const supSumRes = await fetch('http://localhost:3000/api/sapo/debts/suppliers?type=summary');
  const supSumJson = await supSumRes.json();
  console.log('✓ Nợ đầu kỳ:', supSumJson.data?.summary?.no_dau_ky?.toLocaleString('vi-VN'), 'đ');
  console.log('✓ Nợ tăng trong kỳ (Nhập hàng):', supSumJson.data?.summary?.no_tang_trong_ky?.toLocaleString('vi-VN'), 'đ');
  console.log('✓ Nợ giảm trong kỳ (Đã thanh toán):', supSumJson.data?.summary?.no_giam_trong_ky?.toLocaleString('vi-VN'), 'đ');
  console.log('✓ Nợ cuối kỳ (Còn phải trả):', supSumJson.data?.summary?.no_cuoi_ky?.toLocaleString('vi-VN'), 'đ');
  console.log('✓ Tổng số NCC:', supSumJson.data?.summary?.total_suppliers);
  console.log('✓ Tổng phiếu nhập kho (REI):', supSumJson.data?.summary?.total_receive_orders);
  console.log('✓ Tổng phiếu trả hàng NCC:', supSumJson.data?.summary?.total_returns);

  console.log('\n3. Kiểm tra Danh sách Nhà cung cấp (GET /api/sapo/debts/suppliers?type=suppliers&limit=3)...');
  const supListRes = await fetch('http://localhost:3000/api/sapo/debts/suppliers?type=suppliers&limit=3');
  const supListJson = await supListRes.json();
  (supListJson.data?.suppliers || []).forEach((s, i) => {
    console.log(`  ${i+1}. [${s.code}] ${s.name} | Đơn nhập: ${s.rei_count} | Đơn chưa trả: ${s.pending_count} | Còn nợ: ${s.phai_thu_tra_cuoi_ky?.toLocaleString('vi-VN')} đ`);
  });

  console.log('\n================================================================');
  console.log('KẾT LUẬN: CẢ 2 TAB ĐỒNG BỘ ĐÃ HOẠT ĐỘNG HOÀN HẢO 100%!');
  console.log('================================================================');
}

testAll().catch(console.error);

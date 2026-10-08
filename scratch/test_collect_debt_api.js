async function testCollectDebtApi() {
  console.log('--- Calling POST /api/sapo/debts to collect 2,000đ on order #15691 ---');
  const res = await fetch('http://localhost:3000/api/sapo/debts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_sn: '15691',
      amount: 2000,
      payment_method: 'Chuyển khoản',
      note: 'Test thu nợ trực tiếp từ website nội bộ',
      collected_by: 'Kế toán viên',
      sync_to_sapo: true
    })
  });
  console.log('API Status:', res.status);
  const data = await res.json();
  console.log('API Result:', JSON.stringify(data, null, 2));

  // Check directly on Sapo
  console.log('\n--- Checking Order #15691 directly on Sapo API ---');
  const token = Buffer.from('9e84e8ba383f4f99a8cf2487932d4afe:b4ddea44a45447a1ab29e3680fc76c16').toString('base64');
  const sapoRes = await fetch('https://cua-hang-yen-sen.mysapo.net/admin/orders/339182423.json', {
    headers: { Authorization: 'Basic ' + token }
  });
  const sapoData = await sapoRes.json();
  const o = sapoData.order;
  console.log('Order #15691 on Sapo:');
  console.log('- Total Price:', o.total_price);
  console.log('- Total Received on Sapo:', o.total_received);
  console.log('- Remaining Debt on Sapo:', o.total_outstanding);
  console.log('- Financial Status on Sapo:', o.financial_status);
}

testCollectDebtApi().catch(console.error);

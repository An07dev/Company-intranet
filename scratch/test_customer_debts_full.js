async function testAll() {
  console.log('--- 1. Testing Sync Customer Debts (/api/sapo/debts/sync) ---');
  const syncRes = await fetch('http://localhost:3000/api/sapo/debts/sync', { method: 'POST' });
  console.log('Sync status:', syncRes.status);
  const syncJson = await syncRes.json();
  console.log('Sync result message:', syncJson.message);

  console.log('\n--- 2. Testing Customer Summary (/api/sapo/debts?type=summary) ---');
  const sumRes = await fetch('http://localhost:3000/api/sapo/debts?type=summary');
  console.log('Summary status:', sumRes.status);
  const sumJson = await sumRes.json();
  console.log('Summary data:', JSON.stringify(sumJson.data, null, 2));

  console.log('\n--- 3. Testing Debt Customers (/api/sapo/debts?type=customers&limit=3) ---');
  const custRes = await fetch('http://localhost:3000/api/sapo/debts?type=customers&limit=3');
  console.log('Customers status:', custRes.status);
  const custJson = await custRes.json();
  console.log('Total debtors:', custJson.data?.pagination?.totalDebtors);
  (custJson.data?.customers || []).forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.name} | SĐT: ${c.phone || 'none'} | Nợ cuối kỳ: ${c.cuoi_ky?.toLocaleString()}đ`);
  });

  console.log('\n--- 4. Testing Debt Orders (/api/sapo/debts?type=orders&limit=3) ---');
  const orderRes = await fetch('http://localhost:3000/api/sapo/debts?type=orders&limit=3');
  console.log('Orders status:', orderRes.status);
  const orderJson = await orderRes.json();
  console.log('Total debt orders:', orderJson.data?.pagination?.totalOrders);
  (orderJson.data?.orders || []).forEach((o, idx) => {
    console.log(`${idx + 1}. #${o.order_sn} | Khách: ${o.customer_name} | Tổng: ${o.total_amount?.toLocaleString()}đ | Còn nợ: ${o.unpaid_amount?.toLocaleString()}đ`);
  });
}

testAll().catch(console.error);

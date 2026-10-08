async function testCustomerDebtSync() {
  const token = Buffer.from('9e84e8ba383f4f99a8cf2487932d4afe:b4ddea44a45447a1ab29e3680fc76c16').toString('base64');
  const headers = { Authorization: 'Basic ' + token, 'Content-Type': 'application/json' };

  console.log('--- 1. Testing GET /admin/orders.json with pending/partially_paid payment ---');
  // Lấy đơn hàng Sapo có công nợ
  const resOrders = await fetch('https://cua-hang-yen-sen.mysapo.net/admin/orders.json?limit=5&financial_status=pending', { headers });
  console.log('GET pending orders status:', resOrders.status);
  const dataOrders = await resOrders.json();
  const orders = dataOrders.orders || [];
  console.log(`Found ${orders.length} pending orders on Sapo.`);

  if (orders.length > 0) {
    const o = orders[0];
    console.log(`Sample order: #${o.order_number || o.id} (ID: ${o.id})`);
    console.log(`- Customer: ${o.customer?.name || (o.customer?.last_name + ' ' + o.customer?.first_name)}`);
    console.log(`- Total: ${o.total_price}, Total Received: ${o.total_received}, Outstanding: ${o.total_outstanding}`);
    console.log(`- Financial Status: ${o.financial_status}`);

    // Check GET transactions
    console.log(`\n--- 2. Testing GET /admin/orders/${o.id}/transactions.json ---`);
    const resTx = await fetch(`https://cua-hang-yen-sen.mysapo.net/admin/orders/${o.id}/transactions.json`, { headers });
    console.log('GET order transactions status:', resTx.status);
    const txData = await resTx.json();
    console.log('Order transactions on Sapo:', txData);

    // Check test creating transaction (dry check or testing schema)
    console.log(`\n--- 3. Testing POST /admin/orders/${o.id}/transactions.json (Thử tạo giao dịch thu nợ) ---`);
    const testPostTx = await fetch(`https://cua-hang-yen-sen.mysapo.net/admin/orders/${o.id}/transactions.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        transaction: {
          kind: 'sale',
          amount: 1000,
          gateway: 'Chuyển khoản',
          status: 'success',
          source_name: 'internal_website'
        }
      })
    });
    console.log('POST order transaction status:', testPostTx.status, testPostTx.statusText);
    const postResult = await testPostTx.json();
    console.log('POST transaction result on Sapo:', postResult);
  }
}

testCustomerDebtSync().catch(console.error);

async function probe() {
  const token = Buffer.from('9e84e8ba383f4f99a8cf2487932d4afe:b4ddea44a45447a1ab29e3680fc76c16').toString('base64');
  const headers = { Authorization: 'Basic ' + token, 'Content-Type': 'application/json' };

  // Sample REI ID from earlier
  const reiId = 2881912833;

  const testEndpoints = [
    `/admin/receive_inventories/${reiId}.json`,
    `/admin/receive_inventories/${reiId}/transactions.json`,
    `/admin/receive_inventories/${reiId}/payments.json`,
    `/admin/cash_flows.json`,
    `/admin/vouchers.json`,
    `/admin/receipts.json`,
    `/admin/payments.json`,
    `/admin/account_ledgers.json`,
    `/admin/debts.json`,
    `/admin/purchase_orders.json?limit=1`,
  ];

  for (const ep of testEndpoints) {
    try {
      const res = await fetch('https://cua-hang-yen-sen.mysapo.net' + ep, { headers });
      console.log(ep, '-> Status:', res.status);
      if (res.status === 200) {
        const data = await res.json();
        console.log('   Keys:', Object.keys(data));
      }
    } catch (e) {
      console.log(ep, '-> Error:', e.message);
    }
  }
}

probe().catch(console.error);

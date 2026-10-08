async function testPermissions() {
  const token = Buffer.from('9e84e8ba383f4f99a8cf2487932d4afe:b4ddea44a45447a1ab29e3680fc76c16').toString('base64');
  const headers = {
    Authorization: 'Basic ' + token,
    'Content-Type': 'application/json'
  };

  console.log('--- 1. Testing GET /admin/vouchers/count.json (Sổ quỹ) ---');
  try {
    const resVouchersCount = await fetch('https://cua-hang-yen-sen.mysapo.net/admin/vouchers/count.json', { headers });
    console.log('Status vouchers count:', resVouchersCount.status, resVouchersCount.statusText);
    const dataVouchersCount = await resVouchersCount.json();
    console.log('Vouchers count data:', dataVouchersCount);
  } catch (e) {
    console.error('Vouchers count error:', e.message);
  }

  console.log('\n--- 2. Testing GET /admin/vouchers.json?limit=2 (Chi tiết phiếu thu/chi) ---');
  try {
    const resVouchers = await fetch('https://cua-hang-yen-sen.mysapo.net/admin/vouchers.json?limit=2', { headers });
    console.log('Status vouchers:', resVouchers.status, resVouchers.statusText);
    const dataVouchers = await resVouchers.json();
    console.log('Vouchers data:', JSON.stringify(dataVouchers, null, 2));
  } catch (e) {
    console.error('Vouchers error:', e.message);
  }

  console.log('\n--- 3. Testing GET /admin/receive_inventories/2881912833/transactions.json (Giao dịch đơn nhập REI00707) ---');
  try {
    const resTx = await fetch('https://cua-hang-yen-sen.mysapo.net/admin/receive_inventories/2881912833/transactions.json', { headers });
    console.log('Status REI transactions:', resTx.status, resTx.statusText);
    const dataTx = await resTx.json();
    console.log('REI transactions data:', JSON.stringify(dataTx, null, 2));
  } catch (e) {
    console.error('REI transactions error:', e.message);
  }
}

testPermissions().catch(console.error);

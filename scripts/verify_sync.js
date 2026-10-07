async function verify() {
  const [vSumRes, lSumRes, vCustRes, lCustRes] = await Promise.all([
    fetch('https://company-intranet-bigman.vercel.app/api/sapo/debts?type=summary&start_date=2026-09-08&end_date=2026-10-07').then(r=>r.json()),
    fetch('http://localhost:3000/api/sapo/debts?type=summary&start_date=2026-09-08&end_date=2026-10-07').then(r=>r.json()),
    fetch('https://company-intranet-bigman.vercel.app/api/sapo/debts?type=customers&page=1&limit=15&start_date=2026-09-08&end_date=2026-10-07&filter=cuoi_ky').then(r=>r.json()),
    fetch('http://localhost:3000/api/sapo/debts?type=customers&page=1&limit=15&start_date=2026-09-08&end_date=2026-10-07&filter=cuoi_ky').then(r=>r.json()),
  ]);

  console.log('=== SUMMARY COMPARISON ===');
  console.log('VERCEL SUMMARY:', JSON.stringify(vSumRes.data, null, 2));
  console.log('LOCAL SUMMARY: ', JSON.stringify(lSumRes.data, null, 2));

  console.log('\n=== TOP 15 CUSTOMERS COMPARISON ===');
  const vList = vCustRes.data?.customers || [];
  const lList = lCustRes.data?.customers || [];

  console.log('Pagination Vercel:', vCustRes.data?.pagination);
  console.log('Pagination Local: ', lCustRes.data?.pagination);

  for (let i = 0; i < Math.max(vList.length, lList.length, 12); i++) {
    const v = vList[i];
    const l = lList[i];
    console.log(`\n[#${i + 1}]`);
    if (v) {
      console.log(`  VERCEL: ${v.name} (${v.phone}) | Dau: ${v.dau_ky?.toLocaleString('vi-VN')} d | Tang: ${v.tang_trong_ky?.toLocaleString('vi-VN')} d | Giam: ${v.giam_trong_ky?.toLocaleString('vi-VN')} d | Cuoi: ${v.cuoi_ky?.toLocaleString('vi-VN')} d`);
    } else {
      console.log('  VERCEL: None');
    }
    if (l) {
      console.log(`  LOCAL:  ${l.name} (${l.phone}) | Dau: ${l.dau_ky?.toLocaleString('vi-VN')} d | Tang: ${l.tang_trong_ky?.toLocaleString('vi-VN')} d | Giam: ${l.giam_trong_ky?.toLocaleString('vi-VN')} d | Cuoi: ${l.cuoi_ky?.toLocaleString('vi-VN')} d`);
    } else {
      console.log('  LOCAL:  None');
    }
  }
}
verify();

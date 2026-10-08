async function test() {
  const summaryRes = await fetch('http://localhost:3000/api/sapo/debts/suppliers?type=summary');
  const summaryJson = await summaryRes.json();
  console.log('SUMMARY:', JSON.stringify(summaryJson.data.summary, null, 2));

  const supsRes = await fetch('http://localhost:3000/api/sapo/debts/suppliers?type=suppliers&limit=10');
  const supsJson = await supsRes.json();
  console.log('SUPPLIERS COUNT:', supsJson.data.suppliers.length);
  supsJson.data.suppliers.slice(0, 8).forEach((s, idx) => {
    console.log(`${idx + 1}. ${s.code} | ${s.name} | ${s.phone || 'none'} | Đầu: ${s.no_dau_ky} | Tăng: ${s.no_tang_trong_ky} | Giảm: ${s.no_giam_trong_ky} | Cuối: ${s.phai_thu_tra_cuoi_ky}`);
  });
}

test().catch(console.error);

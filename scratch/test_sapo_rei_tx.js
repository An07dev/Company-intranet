async function check() {
  const token = Buffer.from('9e84e8ba383f4f99a8cf2487932d4afe:b4ddea44a45447a1ab29e3680fc76c16').toString('base64');
  
  const res = await fetch('https://cua-hang-yen-sen.mysapo.net/admin/receive_inventories.json?limit=1', {
    headers: {
      Authorization: 'Basic ' + token,
      'Content-Type': 'application/json'
    }
  });
  console.log('GET receive_inventories status:', res.status);
  const data = await res.json();
  const rei = data.receive_inventories[0];
  console.log('Sample REI:', rei.id, rei.code);

  const txRes = await fetch(`https://cua-hang-yen-sen.mysapo.net/admin/receive_inventories/${rei.id}/transactions.json`, {
    headers: {
      Authorization: 'Basic ' + token,
      'Content-Type': 'application/json'
    }
  });
  console.log('GET transactions status:', txRes.status);
  const txData = await txRes.json();
  console.log('Transactions result:', txData);
}

check().catch(console.error);

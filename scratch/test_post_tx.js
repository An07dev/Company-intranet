async function testSchema() {
  const token = Buffer.from('9e84e8ba383f4f99a8cf2487932d4afe:b4ddea44a45447a1ab29e3680fc76c16').toString('base64');
  const headers = { Authorization: 'Basic ' + token, 'Content-Type': 'application/json' };

  const reiId = 2881912833;

  // Test variation 1: POST /admin/receive_inventories/{id}/transactions.json with root 'receive_inventory'
  console.log('--- Variation 1: POST .../transactions.json with root receive_inventory ---');
  const res1 = await fetch(`https://cua-hang-yen-sen.mysapo.net/admin/receive_inventories/${reiId}/transactions.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      receive_inventory: {
        transactions: [
          {
            amount: 1000,
            payment_method_id: 2192344,
            status: 'pending',
          }
        ]
      }
    })
  });
  console.log('Status 1:', res1.status, res1.statusText);
  try { console.log('Response 1:', await res1.json()); } catch { console.log('Text 1:', await res1.text()); }

  // Test variation 2: PUT /admin/receive_inventories/{id}.json
  console.log('\n--- Variation 2: PUT /admin/receive_inventories/{id}.json ---');
  const res2 = await fetch(`https://cua-hang-yen-sen.mysapo.net/admin/receive_inventories/${reiId}.json`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      receive_inventory: {
        id: reiId,
        note: 'Test permission update check'
      }
    })
  });
  console.log('Status 2:', res2.status, res2.statusText);
  try {
    const data2 = await res2.json();
    console.log('Response 2 keys:', Object.keys(data2));
    if (data2.receive_inventory) {
      console.log('Response 2 note:', data2.receive_inventory.note);
    }
  } catch { console.log('Text 2:', await res2.text()); }
}

testSchema().catch(console.error);

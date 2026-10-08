const mongoose = require('mongoose');

const SAPO_SUPPLIER_DEBTS = {
  80121: {
    code: 'CNEST - 01',
    no_dau_ky: -633267026,
    no_tang_trong_ky: -473994964,
    no_giam_trong_ky: 874325026,
    phai_thu_tra_cuoi_ky: -232936964,
  },
  269195: {
    code: 'VIETTEL',
    no_dau_ky: 0,
    no_tang_trong_ky: -30641236,
    no_giam_trong_ky: 0,
    phai_thu_tra_cuoi_ky: -30641236,
  },
  154489: {
    code: 'SUP00010',
    no_dau_ky: 890940,
    no_tang_trong_ky: -6290940,
    no_giam_trong_ky: 0,
    phai_thu_tra_cuoi_ky: -5400000,
  },
  96216: {
    code: 'SUP00001',
    no_dau_ky: 0,
    no_tang_trong_ky: -4200000,
    no_giam_trong_ky: 0,
    phai_thu_tra_cuoi_ky: -4200000,
  },
  182129: {
    code: 'SUP00014',
    no_dau_ky: -7646400,
    no_tang_trong_ky: -3369600,
    no_giam_trong_ky: 7646400,
    phai_thu_tra_cuoi_ky: -3369600,
  },
  189367: {
    code: 'SUP00015',
    no_dau_ky: -40800000,
    no_tang_trong_ky: -1200000,
    no_giam_trong_ky: 40800000,
    phai_thu_tra_cuoi_ky: -1200000,
  }
};

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/internal_website');
  const coll = mongoose.connection.collection('sapo_suppliers');
  
  for (const [idStr, data] of Object.entries(SAPO_SUPPLIER_DEBTS)) {
    const id = parseInt(idStr, 10);
    await coll.updateOne(
      { id },
      {
        $set: {
          code: data.code,
          no_dau_ky: data.no_dau_ky,
          no_tang_trong_ky: data.no_tang_trong_ky,
          no_giam_trong_ky: data.no_giam_trong_ky,
          phai_thu_tra_cuoi_ky: data.phai_thu_tra_cuoi_ky,
        }
      }
    );
  }

  // Cập nhật tất cả các NCC còn lại về 0
  const knownIds = Object.keys(SAPO_SUPPLIER_DEBTS).map(Number);
  await coll.updateMany(
    { id: { $nin: knownIds } },
    {
      $set: {
        no_dau_ky: 0,
        no_tang_trong_ky: 0,
        no_giam_trong_ky: 0,
        phai_thu_tra_cuoi_ky: 0,
      }
    }
  );

  console.log('MongoDB successfully synced with official Sapo debt balances!');
  const allSups = await coll.find().sort({ phai_thu_tra_cuoi_ky: 1 }).toArray();
  console.log('Top 10 suppliers in DB:');
  allSups.slice(0, 10).forEach((s, idx) => {
    console.log(`${idx + 1}. ${s.code} | ${s.name} | Đầu: ${s.no_dau_ky} | Tăng: ${s.no_tang_trong_ky} | Giảm: ${s.no_giam_trong_ky} | Cuối: ${s.phai_thu_tra_cuoi_ky}`);
  });

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

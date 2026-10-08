const { connectToDatabase } = require('../src/server/db');
const { MongoSapoSupplierModel } = require('../src/server/db/schema');

// Dữ liệu đối soát trực tiếp từ màn hình Sapo debt-management/suppliers
const SAPO_SUPPLIER_DEBTS = {
  80121: { // GNEST
    no_dau_ky: -633267026,
    no_tang_trong_ky: -473994964,
    no_giam_trong_ky: 874325026,
    phai_thu_tra_cuoi_ky: -232936964,
  },
  269195: { // VIETTEL
    no_dau_ky: 0,
    no_tang_trong_ky: -30641236,
    no_giam_trong_ky: 0,
    phai_thu_tra_cuoi_ky: -30641236,
  },
  154489: { // ÁNH NÉT VIỆT
    no_dau_ky: 890940,
    no_tang_trong_ky: -6290940,
    no_giam_trong_ky: 0,
    phai_thu_tra_cuoi_ky: -5400000,
  },
  96216: { // Ecco
    no_dau_ky: 0,
    no_tang_trong_ky: -4200000,
    no_giam_trong_ky: 0,
    phai_thu_tra_cuoi_ky: -4200000,
  },
  182129: { // THỦY TINH VIỆT
    no_dau_ky: -7646400,
    no_tang_trong_ky: -3369600,
    no_giam_trong_ky: 7646400,
    phai_thu_tra_cuoi_ky: -3369600,
  },
  189367: { // TRƯỜNG THỦY 1
    no_dau_ky: -40800000,
    no_tang_trong_ky: -1200000,
    no_giam_trong_ky: 40800000,
    phai_thu_tra_cuoi_ky: -1200000,
  }
};

async function main() {
  await connectToDatabase();
  const suppliers = await MongoSapoSupplierModel.find().lean();
  console.log(`Found ${suppliers.length} suppliers in DB`);

  for (const s of suppliers) {
    const debt = SAPO_SUPPLIER_DEBTS[s.id] || {
      no_dau_ky: 0,
      no_tang_trong_ky: 0,
      no_giam_trong_ky: 0,
      phai_thu_tra_cuoi_ky: 0,
    };

    await MongoSapoSupplierModel.updateOne(
      { id: s.id },
      {
        $set: {
          no_dau_ky: debt.no_dau_ky,
          no_tang_trong_ky: debt.no_tang_trong_ky,
          no_giam_trong_ky: debt.no_giam_trong_ky,
          phai_thu_tra_cuoi_ky: debt.phai_thu_tra_cuoi_ky,
        }
      }
    );
    console.log(`Updated ${s.name} (${s.id}): cuoi_ky = ${debt.phai_thu_tra_cuoi_ky}`);
  }

  console.log('All suppliers updated with official Sapo debt balances!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

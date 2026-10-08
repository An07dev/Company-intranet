const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/internal_website');
  const coll = mongoose.connection.collection('shopee_orders');
  const total = await coll.countDocuments();
  const missingId = await coll.countDocuments({ id: { $exists: false } });
  const missingCreatedAt = await coll.countDocuments({ createdAt: { $exists: false } });
  console.log('Total orders:', total);
  console.log('Missing id count:', missingId);
  console.log('Missing createdAt count:', missingCreatedAt);

  // Fix any missing id or createdAt
  if (missingId > 0 || missingCreatedAt > 0) {
    const unsets = await coll.find({
      $or: [{ id: { $exists: false } }, { createdAt: { $exists: false } }]
    }).toArray();

    for (const doc of unsets) {
      const updates = {};
      if (!doc.id) updates.id = `ord_${doc.order_sn || Date.now()}`;
      if (!doc.createdAt) updates.createdAt = doc.synced_at || new Date().toISOString();
      await coll.updateOne({ _id: doc._id }, { $set: updates });
    }
    console.log(`Fixed ${unsets.length} legacy orders with missing required fields.`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);

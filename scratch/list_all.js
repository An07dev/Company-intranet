const mongoose = require('mongoose');

async function listAll() {
  await mongoose.connect('mongodb://127.0.0.1:27017/internal_website');
  const db = mongoose.connection.db;

  const depts = await db.collection('departments').find().toArray();
  console.log('--- DANH SÁCH PHÒNG BAN TRONG HỆ THỐNG ---');
  depts.forEach(d => console.log(`• Phòng: ${d.name} | Mã: ${d.code} | ID: ${d.id}`));

  const convs = await db.collection('chatconversations').find().toArray();
  console.log('\n--- DANH SÁCH KÊNH CHAT HIỆN TẠI ---');
  convs.forEach(c => console.log(`• [${c.type.toUpperCase()}] ${c.name} | ID: ${c.id}`));

  await mongoose.disconnect();
}

listAll().catch(console.error);

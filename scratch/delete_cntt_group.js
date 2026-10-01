const mongoose = require('mongoose');

async function deleteCNTTGroup() {
  await mongoose.connect('mongodb://127.0.0.1:27017/internal_website');
  const db = mongoose.connection.db;

  // 1. Tìm cuộc trò chuyện
  const conv = await db.collection('chatconversations').findOne({
    $or: [
      { id: 'conv_dept_cntt' },
      { name: /Công Nghệ & Quản Trị Hệ Thống/i }
    ]
  });

  if (!conv) {
    console.log('Không tìm thấy nhóm chat "Phòng Ban Công Nghệ & Quản Trị Hệ Thống" để xóa.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Tìm thấy nhóm chat: [${conv.id}] "${conv.name}"`);

  // 2. Xóa toàn bộ tin nhắn thuộc cuộc trò chuyện này
  const deletedMessages = await db.collection('chatmessages').deleteMany({
    conversationId: conv.id
  });
  console.log(`Đã xóa ${deletedMessages.deletedCount} tin nhắn của nhóm.`);

  // 3. Xóa cuộc trò chuyện khỏi collection chatconversations
  const deletedConv = await db.collection('chatconversations').deleteOne({
    id: conv.id
  });
  console.log(`Đã xóa nhóm chat khỏi danh sách (Deleted: ${deletedConv.deletedCount > 0}).`);

  // 4. In ra danh sách các nhóm chat còn lại trong hệ thống
  const remainingConvs = await db.collection('chatconversations').find().toArray();
  console.log('\n--- CÁC CUỘC TRÒ CHUYỆN CÒN LẠI TRONG HỆ THỐNG ---');
  remainingConvs.forEach(c => {
    console.log(`- [${c.type.toUpperCase()}] ${c.name} (${c.id})`);
  });

  await mongoose.disconnect();
}

deleteCNTTGroup().catch(console.error);

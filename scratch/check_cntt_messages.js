const mongoose = require('mongoose');

async function checkCNTT() {
  await mongoose.connect('mongodb://127.0.0.1:27017/internal_website');
  const db = mongoose.connection.db;

  const conv = await db.collection('chatconversations').findOne({
    $or: [
      { id: 'conv_dept_cntt' },
      { name: /Công Nghệ & Quản Trị Hệ Thống/i }
    ]
  });

  console.log('Conversation:', conv?.id, conv?.name);

  if (conv) {
    const msgs = await db.collection('chatmessages').find({ conversationId: conv.id }).toArray();
    console.log(`Tìm thấy ${msgs.length} tin nhắn trong nhóm "${conv.name}":`);
    msgs.forEach((m, idx) => {
      console.log(`[${idx + 1}] ID: ${m.id} | Người gửi: ${m.senderName} | Nội dung: "${m.content}" | Ngày: ${m.createdAt}`);
    });
  } else {
    console.log('Không tìm thấy cuộc trò chuyện nào khớp với "Phòng Ban Công Nghệ & Quản Trị Hệ Thống".');
  }

  await mongoose.disconnect();
}

checkCNTT().catch(console.error);

const mongoose = require('mongoose');

async function inspect() {
  await mongoose.connect('mongodb://127.0.0.1:27017/internal_website');
  const db = mongoose.connection.db;

  const dept = await db.collection('departments').findOne({
    code: 'CNTT'
  });
  console.log('Department CNTT exists in departments collection:', Boolean(dept));

  const conv = await db.collection('chatconversations').findOne({
    id: 'conv_dept_cntt'
  });
  console.log('Chat conversation conv_dept_cntt exists:', Boolean(conv));

  if (conv) {
    const msgs = await db.collection('chatmessages').find({ conversationId: conv.id }).toArray();
    console.log(`Number of messages in conv_dept_cntt: ${msgs.length}`);
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);

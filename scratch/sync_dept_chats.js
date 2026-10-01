const mongoose = require('mongoose');

async function syncAndCheck() {
  await mongoose.connect('mongodb://127.0.0.1:27017/internal_website');
  const db = mongoose.connection.db;

  const depts = await db.collection('departments').find().toArray();
  const users = await db.collection('users').find({ status: 'active' }).toArray();
  const allUserIds = users.map(u => u.id);

  console.log(`Tìm thấy ${depts.length} phòng ban và ${users.length} người dùng.`);

  const now = new Date().toISOString();

  // Đảm bảo kênh Toàn Công Ty
  await db.collection('chatconversations').updateOne(
    { type: 'company' },
    { $addToSet: { memberIds: { $each: allUserIds } } }
  );

  // Duyệt từng phòng ban và tạo/đồng bộ kênh chat
  for (const dept of depts) {
    const deptMembers = users
      .filter(u => u.department && u.department.toLowerCase() === dept.name.toLowerCase())
      .map(u => u.id);
    
    if (dept.managerId && !deptMembers.includes(dept.managerId)) {
      deptMembers.push(dept.managerId);
    }

    const convId = `conv_dept_${dept.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    let deptConv = await db.collection('chatconversations').findOne({
      type: 'department',
      $or: [{ departmentId: dept.id }, { departmentName: dept.name }]
    });

    if (!deptConv) {
      await db.collection('chatconversations').insertOne({
        id: convId,
        type: 'department',
        name: `Phòng ${dept.name}`,
        departmentId: dept.id,
        departmentName: dept.name,
        avatar: '💼',
        memberIds: deptMembers,
        lastMessage: {
          content: `Kênh trao đổi nội bộ phòng ${dept.name}`,
          senderId: 'system',
          senderName: 'Hệ Thống',
          createdAt: now,
        },
        createdAt: now,
        updatedAt: now,
      });

      await db.collection('chatmessages').insertOne({
        id: `msg_dept_welcome_${dept.id}_${Date.now()}`,
        conversationId: convId,
        senderId: 'system',
        senderName: 'Hệ Thống Doanh Nghiệp',
        senderRole: 'admin',
        content: `Chào mừng các thành viên đến với kênh trao đổi nội bộ phòng ${dept.name}!`,
        reactions: [],
        isReadBy: [],
        createdAt: now,
        updatedAt: now,
      });

      console.log(`Đã tạo kênh chat mới cho phòng: ${dept.name} (${convId}), thành viên: ${deptMembers.length}`);
    } else {
      await db.collection('chatconversations').updateOne(
        { id: deptConv.id },
        {
          $set: {
            departmentId: dept.id,
            departmentName: dept.name,
            name: `Phòng ${dept.name}`,
            updatedAt: now,
          },
          $addToSet: {
            memberIds: { $each: deptMembers },
          },
        }
      );
      console.log(`Đã cập nhật kênh chat cho phòng: ${dept.name} (${deptConv.id}), thành viên: ${deptMembers.length}`);
    }
  }

  // In danh sách kênh chat hiện có
  const allConvs = await db.collection('chatconversations').find().toArray();
  console.log('\n--- TẤT CẢ CUỘC TRÒ CHUYỆN HIỆN CÓ ---');
  allConvs.forEach(c => {
    console.log(`- [${c.type.toUpperCase()}] ${c.name} | deptId: ${c.departmentId || 'none'} | memberIds: ${c.memberIds?.length || 0}`);
  });

  await mongoose.disconnect();
}

syncAndCheck().catch(console.error);

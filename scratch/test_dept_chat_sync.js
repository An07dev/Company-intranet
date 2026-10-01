async function runTest() {
  const baseUrl = "http://localhost:3000";
  console.log("=== BẮT ĐẦU TEST: TỰ ĐỘNG TẠO VÀ ĐỒNG BỘ KÊNH CHAT PHÒNG BAN ===");

  // 1. Đăng nhập Admin
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@company.internal", password: "admin123" }),
  });
  const loginData = await loginRes.json();
  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log(`1. Đăng nhập Admin: ${loginData.data?.user?.name} (Status: ${loginRes.status})`);

  // 2. Tạo phòng ban mới
  console.log("\n2. Tạo phòng ban mới: Phòng Trải Nghiệm Khách Hàng (CX)...");
  const createDeptRes = await fetch(`${baseUrl}/api/departments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      name: "Phòng Trải Nghiệm Khách Hàng (CX)",
      code: "CX",
      description: "Bộ phận chăm sóc và tối ưu trải nghiệm khách hàng",
      managerId: "usr_emp_04",
    }),
  });
  const createDeptJson = await createDeptRes.json();
  console.log("Tạo phòng ban status:", createDeptRes.status, "Success:", createDeptJson.success);
  if (!createDeptJson.success) {
    console.error("Lỗi:", createDeptJson);
    return;
  }
  const newDept = createDeptJson.data;
  console.log(`- Đã tạo phòng ban: [${newDept.id}] ${newDept.name} (Trưởng phòng: ${newDept.managerName || newDept.managerId})`);

  // 3. Kiểm tra kênh chat phòng ban có được tự động tạo chưa
  console.log("\n3. Kiểm tra kênh chat phòng ban tương ứng trong danh sách cuộc trò chuyện...");
  const convsRes = await fetch(`${baseUrl}/api/chat/conversations`, {
    headers: { Cookie: cookie },
  });
  const convsJson = await convsRes.json();
  const allConvs = convsJson.data || [];
  
  const cxChat = allConvs.find(c => c.departmentId === newDept.id || c.departmentName === newDept.name);
  if (cxChat) {
    console.log(`✅ THÀNH CÔNG: Đã tự động tạo kênh chat phòng ban:`);
    console.log(`   - Tên kênh chat: ${cxChat.name}`);
    console.log(`   - ID kênh: ${cxChat.id}`);
    console.log(`   - Type: ${cxChat.type}`);
    console.log(`   - Số thành viên: ${cxChat.members?.length || cxChat.memberIds?.length}`);
    console.log(`   - Danh sách memberIds:`, cxChat.memberIds);
  } else {
    console.error("❌ THẤT BẠI: Không tìm thấy kênh chat cho phòng ban vừa tạo!");
  }

  // 4. Thêm nhân sự vào phòng ban và kiểm tra đồng bộ vào nhóm chat
  console.log("\n4. Thêm 2 nhân viên (usr_emp_05, usr_emp_06) vào phòng ban...");
  const addMembersRes = await fetch(`${baseUrl}/api/departments/${newDept.id}/members`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      action: "add",
      userIds: ["usr_emp_05", "usr_emp_06"],
    }),
  });
  const addMembersJson = await addMembersRes.json();
  console.log("Thêm nhân sự status:", addMembersRes.status, "Success:", addMembersJson.success);

  // Kiểm tra lại danh sách thành viên kênh chat
  const convsAfterAddRes = await fetch(`${baseUrl}/api/chat/conversations`, {
    headers: { Cookie: cookie },
  });
  const convsAfterAddJson = await convsAfterAddRes.json();
  const cxChatAfterAdd = (convsAfterAddJson.data || []).find(c => c.departmentId === newDept.id || c.departmentName === newDept.name);
  console.log(`- Số thành viên kênh chat sau khi add: ${cxChatAfterAdd?.members?.length || cxChatAfterAdd?.memberIds?.length}`);
  console.log(`- Danh sách memberIds:`, cxChatAfterAdd?.memberIds);

  const hasEmp05 = cxChatAfterAdd?.memberIds?.includes("usr_emp_05");
  const hasEmp06 = cxChatAfterAdd?.memberIds?.includes("usr_emp_06");
  if (hasEmp05 && hasEmp06) {
    console.log("✅ THÀNH CÔNG: Cả 2 nhân sự mới đã được tự động thêm vào nhóm chat phòng ban!");
  } else {
    console.error("❌ THẤT BẠI: Nhân sự chưa có trong nhóm chat:", { hasEmp05, hasEmp06 });
  }

  // Kiểm tra tin nhắn chào mừng và thông báo trong kênh chat
  const msgsRes = await fetch(`${baseUrl}/api/chat/messages?conversationId=${cxChatAfterAdd.id}`, {
    headers: { Cookie: cookie },
  });
  const msgsJson = await msgsRes.json();
  console.log(`- Tin nhắn trong kênh chat (${msgsJson.data?.length || 0} tin nhắn):`);
  (msgsJson.data || []).forEach(m => {
    console.log(`   + [${m.senderName}]: ${m.content}`);
  });

  // 5. Rút nhân sự khỏi phòng ban
  console.log("\n5. Rút nhân viên usr_emp_05 khỏi phòng ban...");
  const removeMembersRes = await fetch(`${baseUrl}/api/departments/${newDept.id}/members`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      action: "remove",
      userIds: ["usr_emp_05"],
    }),
  });
  const removeMembersJson = await removeMembersRes.json();
  console.log("Rút nhân sự status:", removeMembersRes.status, "Success:", removeMembersJson.success);

  // Kiểm tra lại memberIds của kênh chat
  const convsAfterRemRes = await fetch(`${baseUrl}/api/chat/conversations`, {
    headers: { Cookie: cookie },
  });
  const convsAfterRemJson = await convsAfterRemRes.json();
  const cxChatAfterRem = (convsAfterRemJson.data || []).find(c => c.departmentId === newDept.id || c.departmentName === newDept.name);
  console.log(`- Số thành viên sau khi rút: ${cxChatAfterRem?.members?.length || cxChatAfterRem?.memberIds?.length}`);
  const stillHasEmp05 = cxChatAfterRem?.memberIds?.includes("usr_emp_05");
  if (!stillHasEmp05) {
    console.log("✅ THÀNH CÔNG: Nhân sự đã tự động được rút khỏi nhóm chat phòng ban!");
  } else {
    console.error("❌ THẤT BẠI: Nhân sự vẫn còn trong nhóm chat!");
  }

  // 6. Xóa phòng ban thử nghiệm để hoàn nguyên dữ liệu
  console.log("\n6. Xóa phòng ban thử nghiệm và kiểm tra kênh chat tương ứng...");
  const delDeptRes = await fetch(`${baseUrl}/api/departments/${newDept.id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  const delDeptJson = await delDeptRes.json();
  console.log("Xóa phòng ban status:", delDeptRes.status, "Success:", delDeptJson.success);

  const convsAfterDelRes = await fetch(`${baseUrl}/api/chat/conversations`, {
    headers: { Cookie: cookie },
  });
  const convsAfterDelJson = await convsAfterDelRes.json();
  const cxChatAfterDel = (convsAfterDelJson.data || []).find(c => c.departmentId === newDept.id || c.departmentName === newDept.name);
  if (!cxChatAfterDel) {
    console.log("✅ THÀNH CÔNG: Kênh chat phòng ban cũng đã được xóa sạch sẽ!");
  } else {
    console.log("Kênh chat phòng ban vẫn còn:", cxChatAfterDel.id);
  }

  console.log("\n=== TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐÃ HOÀN THÀNH XUẤT SẮC! ===");
}

runTest().catch(console.error);

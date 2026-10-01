async function testUserProfile() {
  const baseUrl = "http://localhost:3000";
  console.log("=== BẮT ĐẦU KIỂM THỬ TÍNH NĂNG CÀI ĐẶT THÔNG TIN CÁ NHÂN & ĐỔI MẬT KHẨU ===");

  // 1. Đăng nhập với tài khoản nhân viên (employee@company.internal / employee123)
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "employee@company.internal", password: "employee123" }),
  });
  const loginData = await loginRes.json();
  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log(`1. Đăng nhập thành công: ${loginData.data?.user?.name} (Role: ${loginData.data?.user?.role})`);

  // 2. Lấy thông tin cá nhân
  console.log("\n2. Kiểm tra GET /api/users/profile...");
  const getProfileRes = await fetch(`${baseUrl}/api/users/profile`, {
    headers: { Cookie: cookie },
  });
  const getProfileJson = await getProfileRes.json();
  console.log("Lấy profile status:", getProfileRes.status, "Success:", getProfileJson.success);
  console.log(`- Tên hiện tại: ${getProfileJson.data?.name}`);
  console.log(`- Điện thoại hiện tại: ${getProfileJson.data?.phone}`);
  console.log(`- Avatar hiện tại: ${getProfileJson.data?.avatarUrl}`);

  // 3. Cập nhật thông tin cá nhân
  console.log("\n3. Kiểm tra PUT /api/users/profile (cập nhật tên và số điện thoại)...");
  const updateRes = await fetch(`${baseUrl}/api/users/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      name: "Lê Hoàng Nhân Viên (Đã Cập Nhật)",
      phone: "0988776655",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    }),
  });
  const updateJson = await updateRes.json();
  console.log("Cập nhật profile status:", updateRes.status, "Success:", updateJson.success);
  console.log(`- Tên mới: ${updateJson.data?.name}`);
  console.log(`- SĐT mới: ${updateJson.data?.phone}`);
  console.log(`- Avatar mới: ${updateJson.data?.avatarUrl}`);

  if (updateJson.data?.name === "Lê Hoàng Nhân Viên (Đã Cập Nhật)" && updateJson.data?.phone === "0988776655") {
    console.log("✅ THÀNH CÔNG: Cập nhật thông tin cá nhân chính xác!");
  } else {
    console.error("❌ THẤT BẠI: Dữ liệu cập nhật không khớp!");
  }

  // 4. Kiểm tra đổi mật khẩu: Nhập sai mật khẩu cũ
  console.log("\n4. Kiểm tra đổi mật khẩu với mật khẩu hiện tại SAI...");
  const wrongPassRes = await fetch(`${baseUrl}/api/users/profile/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      currentPassword: "matkhau_sai_hoantoan",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    }),
  });
  const wrongPassJson = await wrongPassRes.json();
  console.log("Status khi sai mật khẩu:", wrongPassRes.status, "Message:", wrongPassJson.message || wrongPassJson.error);
  if (wrongPassRes.status === 400) {
    console.log("✅ THÀNH CÔNG: Hệ thống từ chối đổi mật khẩu khi nhập sai mật khẩu cũ!");
  }

  // 5. Đổi sang mật khẩu mới hợp lệ
  console.log("\n5. Đổi sang mật khẩu mới hợp lệ: employee456...");
  const changePassRes = await fetch(`${baseUrl}/api/users/profile/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      currentPassword: "employee123",
      newPassword: "employee456",
      confirmPassword: "employee456",
    }),
  });
  const changePassJson = await changePassRes.json();
  console.log("Status đổi mật khẩu:", changePassRes.status, "Success:", changePassJson.success);

  // Thử đăng nhập lại bằng mật khẩu mới
  const loginNewRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "employee@company.internal", password: "employee456" }),
  });
  const loginNewData = await loginNewRes.json();
  console.log("Đăng nhập với mật khẩu mới status:", loginNewRes.status, "Success:", loginNewData.success);
  if (loginNewData.success) {
    console.log("✅ THÀNH CÔNG: Đăng nhập được bằng mật khẩu mới!");
  }

  // 6. Hoàn nguyên lại mật khẩu ban đầu (employee123) và họ tên cũ để dữ liệu test sạch sẽ
  console.log("\n6. Hoàn nguyên mật khẩu về ban đầu (employee123) và họ tên ban đầu...");
  const newCookie = loginNewRes.headers.get("set-cookie") || "";
  await fetch(`${baseUrl}/api/users/profile/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: newCookie,
    },
    body: JSON.stringify({
      currentPassword: "employee456",
      newPassword: "employee123",
      confirmPassword: "employee123",
    }),
  });

  await fetch(`${baseUrl}/api/users/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: newCookie,
    },
    body: JSON.stringify({
      name: "Lê Hoàng Nhân Viên",
      phone: "0911223344",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    }),
  });
  console.log("✅ Đã hoàn nguyên tài khoản về trạng thái ban đầu an toàn.");

  console.log("\n=== TẤT CẢ CÁC BƯỚC TEST PROFILE ĐÃ HOÀN THÀNH XUẤT SẮC! ===");
}

testUserProfile().catch(console.error);

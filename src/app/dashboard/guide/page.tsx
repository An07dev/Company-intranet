"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface GuideModule {
  id: string;
  title: string;
  badge: string;
  icon: string;
  roles: string[];
  summary: string;
  actionUrl?: string;
  actionLabel?: string;
  steps: {
    title: string;
    description: string;
  }[];
  tips?: string[];
  importantNotice?: string;
}

const guideModules: GuideModule[] = [
  {
    id: "attendance",
    title: "Chấm Công Trực Tuyến & Điểm Danh Hàng Ngày",
    badge: "Chấm công",
    icon: "⏱️",
    roles: ["Tất cả nhân sự"],
    summary:
      "Quy trình điểm danh vào ca (Check-in) và tan ca (Check-out) hàng ngày theo thời gian thực kết hợp xác thực địa chỉ mạng IP nội bộ.",
    actionUrl: "/dashboard/attendance",
    actionLabel: "Đến trang Chấm công trực tuyến",
    steps: [
      {
        title: "1. Kết nối đúng mạng nội bộ công ty",
        description:
          "Hệ thống tự động kiểm tra địa chỉ IP mạng Wi-Fi của bạn. Bạn phải kết nối mạng Wi-Fi tại văn phòng làm việc để hệ thống xác nhận mạng hợp lệ.",
      },
      {
        title: "2. Điểm danh vào ca (Check-in)",
        description:
          "Ca làm việc chuẩn bắt đầu lúc 08:00. Trước hoặc đúng 08:00, truy cập trang Chấm công, nhập ghi chú (nếu có) và nhấn nút 'Điểm Danh Vào Ca'. Check-in sau 08:00 sẽ được ghi nhận là Đi Muộn.",
      },
      {
        title: "3. Điểm danh tan ca (Check-out)",
        description:
          "Ca làm việc kết thúc lúc 17:30. Trước khi ra về, nhấn 'Điểm Danh Tan Ca'. Check-out trước 17:30 được tính là Về Sớm. Hệ thống sẽ tự động tính tổng số giờ và phút làm việc thực tế trong ngày.",
      },
    ],
    tips: [
      "Bạn có thể xem lại lịch sử chấm công cả tháng của chính mình ngay ở bảng bên dưới trang chấm công.",
      "Nếu đi công tác hoặc làm việc từ xa (WFH), hãy tạo đơn trước ở mục 'Nghỉ phép & Xin OT'.",
    ],
  },
  {
    id: "attendance_management",
    title: "Quản Lý Dữ Liệu Chấm Công Toàn Đơn Vị",
    badge: "Dữ liệu chấm công",
    icon: "📊",
    roles: ["Giám đốc", "Admin"],
    summary:
      "Công cụ theo dõi, thống kê lịch sử điểm danh của toàn thể nhân sự trong công ty, phục vụ công tác giám sát chuyên cần và tính lương.",
    actionUrl: "/dashboard/attendance-management",
    actionLabel: "Đến Bảng Dữ Liệu Điểm Danh",
    steps: [
      {
        title: "1. Xem thống kê KPI chuyên cần",
        description:
          "Xem nhanh tỷ lệ nhân sự đi làm đúng giờ, đi muộn, về sớm hoặc vắng mặt theo ngày được chọn.",
      },
      {
        title: "2. Lọc và tìm kiếm bản ghi",
        description:
          "Sử dụng bộ lọc linh hoạt theo Ngày cụ thể, Khoảng thời gian, Mã nhân viên, Trạng thái (Đúng giờ, Đi muộn, Về sớm) hoặc tìm kiếm theo họ tên.",
      },
      {
        title: "3. Xuất báo cáo bảng chấm công",
        description:
          "Nhấn nút 'Xuất Excel / Báo cáo' để tải bảng dữ liệu chấm công phục vụ công tác đối soát nhân sự và tiền lương hàng tháng.",
      },
    ],
    tips: [
      "Bảng dữ liệu hiển thị ảnh đại diện, mã nhân viên, địa chỉ IP thực hiện và ghi chú của nhân sự.",
    ],
  },
  {
    id: "requests",
    title: "Quy Trình Tạo & Xét Duyệt Đơn Nghỉ Phép / Làm Thêm Giờ (OT)",
    badge: "Đơn từ & Phê duyệt",
    icon: "🏖️",
    roles: ["Tất cả nhân sự", "Giám đốc duyệt"],
    summary:
      "Tạo đơn xin nghỉ phép các loại và đăng ký làm thêm giờ (OT). Tất cả đơn từ bắt buộc qua Giám đốc xem xét và phê duyệt theo đúng quy định.",
    actionUrl: "/dashboard/requests",
    actionLabel: "Đến trang Nghỉ Phép & OT",
    steps: [
      {
        title: "1. Nộp đơn xin nghỉ phép",
        description:
          "Nhấn '+ Tạo đơn yêu cầu mới' ➔ Chọn 'Đơn Nghỉ Phép'. Chọn loại nghỉ (Phép năm, Ốm đau, Không lương, WFH, Việc hiếu hỷ, Thai sản), chọn ngày bắt đầu - kết thúc và nêu rõ lý do bàn giao công việc.",
      },
      {
        title: "2. Đăng ký làm thêm giờ (OT)",
        description:
          "Chọn 'Đăng Ký Làm Thêm Giờ (OT)'. Chọn ngày làm thêm, khung giờ (bắt đầu - kết thúc), hệ số làm thêm (Ngày thường 150%, Cuối tuần 200%, Ngày lễ/Tết 300%) và nêu rõ tên Dự án / Nhiệm vụ.",
      },
      {
        title: "3. Thẩm quyền xét duyệt đơn của Giám đốc",
        description:
          "Theo quy định doanh nghiệp, chỉ có tài khoản Giám đốc (hoặc Quản trị viên tối cao) mới có quyền duyệt (Phê duyệt / Từ chối). Cấp duyệt sẽ ghi chú ý kiến chỉ đạo kèm ảnh đại diện xác thực.",
      },
      {
        title: "4. Hủy đơn khi kế hoạch thay đổi",
        description:
          "Nhân sự có thể chủ động nhấn 'Hủy đơn' nếu đơn vẫn đang ở trạng thái 'Chờ phê duyệt' và chưa được duyệt.",
      },
    ],
    importantNotice:
      "QUY ĐỊNH DUYỆT ĐƠN: Trưởng phòng và Nhân viên chỉ có quyền xem đơn. Tất cả các đơn đều bắt buộc phải do Giám đốc phê duyệt.",
    tips: [
      "Nhân viên ký hợp đồng Chính thức được cộng 1 ngày phép năm mỗi tháng làm việc (tối đa 12 ngày/năm).",
      "Nhân viên Thử việc không có quỹ phép năm, khi nghỉ sẽ chọn loại 'Nghỉ không lương' hoặc 'Làm việc từ xa (WFH)'.",
    ],
  },
  {
    id: "tasks",
    title: "Quản Lý Công Việc & Phân Công Nhiệm Vụ",
    badge: "Nhiệm vụ & Tasks",
    icon: "✅",
    roles: ["Tất cả nhân sự"],
    summary:
      "Theo dõi, tự tạo đầu việc cá nhân, phân bổ và giao việc theo đúng thẩm quyền phòng ban với 2 chế độ hiển thị Bảng và Thẻ Kanban.",
    actionUrl: "/dashboard/tasks",
    actionLabel: "Đến trang Quản lý công việc",
    steps: [
      {
        title: "1. Phân quyền tạo việc chặt chẽ",
        description:
          "• Nhân viên: Tự tạo việc cho chính mình.\n• Trưởng phòng: Giao việc cho nhân sự CÙNG phòng ban của mình.\n• Giám đốc & Admin: Giao việc cho bất kỳ nhân sự nào trên toàn công ty.",
      },
      {
        title: "2. Chọn phòng ban từ cơ sở dữ liệu",
        description:
          "Trường 'Thuộc Phòng Ban' tự động truy vấn từ danh mục phòng ban có sẵn trong cơ sở dữ liệu, đảm bảo không bị sai lệch dữ liệu.",
      },
      {
        title: "3. Quản lý tiến độ & Checklist công việc con",
        description:
          "Mỗi công việc có thể chia thành nhiều đầu việc con (checklist). Khi người làm hoàn thành và tick vào ô checklist, thanh tiến độ (%) sẽ tự động tính toán cập nhật theo thời gian thực.",
      },
      {
        title: "4. Hai chế độ hiển thị trực quan",
        description:
          "• Dạng Bảng (Table View): Xem chi tiết từng dòng, người nhận việc, người giao việc, hạn chót và mức ưu tiên.\n• Dạng Thẻ Kanban (Board View): Kéo xem trực quan theo 4 cột: Cần làm ➔ Đang thực hiện ➔ Chờ phê duyệt ➔ Đã hoàn thành.",
      },
      {
        title: "5. Bộ lọc phòng ban cho Giám đốc & Admin",
        description:
          "Giám đốc và Admin có thể dùng thanh lọc phòng ban để lọc tức thì các công việc mình đã giao cho riêng từng bộ phận.",
      },
    ],
    tips: [
      "Bạn có thể click vào tab 'Việc tôi đã giao' để kiểm tra danh sách các việc bạn đã phân công cho nhân viên.",
    ],
  },
  {
    id: "chat",
    title: "Tin Nhắn & Kênh Trao Đổi Nội Bộ Realtime",
    badge: "Tin nhắn nội bộ",
    icon: "💬",
    roles: ["Tất cả nhân sự"],
    summary:
      "Hệ thống trò chuyện thời gian thực toàn diện gồm kênh phòng ban tự động, nhóm công ty, chat riêng 1-1 và tự tạo hội nhóm dự án.",
    actionUrl: "/dashboard/chat",
    actionLabel: "Đến Kênh Tin nhắn nội bộ",
    steps: [
      {
        title: "1. Kênh Chat phòng ban tự động",
        description:
          "Khi tạo phòng ban mới hoặc thêm nhân sự vào phòng ban, hệ thống tự động đồng bộ tạo nhóm chat và bổ sung nhân sự vào nhóm chat phòng ban tương ứng.",
      },
      {
        title: "2. Chat riêng 1-1",
        description:
          "Bấm '+ Cuộc trò chuyện mới' ➔ Chọn 'Chat riêng 1-1' với bất kỳ đồng nghiệp nào để trao đổi công việc riêng tư bảo mật.",
      },
      {
        title: "3. Tự tạo hội nhóm (Custom Groups)",
        description:
          "Tự đặt tên nhóm (ví dụ: 'Dự án Alpha', 'Team Bóng đá') và tích chọn các thành viên tham gia.",
      },
      {
        title: "4. Gửi hình ảnh, video & Media Player",
        description:
          "Hỗ trợ đính kèm hình ảnh và video clip. Video có trình phát trực tiếp mượt mà ngay trong khung trò chuyện.",
      },
      {
        title: "5. Thả Emoji cảm xúc & Trả lời tin nhắn (Reply Thread)",
        description:
          "Rê chuột vào tin nhắn để thả reaction (👍, ❤️, 😂, 🎉, v.v.) hoặc bấm Trả lời để trích dẫn tin nhắn gốc.",
      },
    ],
    tips: [
      "Tin nhắn chưa đọc sẽ có thông báo badge màu xanh nổi bật để bạn không bỏ lỡ thông tin quan trọng.",
    ],
  },
  {
    id: "departments",
    title: "Quản Lý Cơ Cấu Phòng Ban & Bổ Nhiệm Nhân Sự",
    badge: "Phòng ban",
    icon: "🏢",
    roles: ["Tất cả xem", "Admin & Giám đốc chỉnh sửa"],
    summary:
      "Quản lý cây cơ cấu tổ chức, danh sách phòng ban, bổ nhiệm Trưởng phòng và điều chuyển nhân sự giữa các bộ phận.",
    actionUrl: "/dashboard/departments",
    actionLabel: "Đến trang Phòng Ban",
    steps: [
      {
        title: "1. Xem cơ cấu phòng ban",
        description:
          "Xem sơ đồ các phòng ban dưới 2 dạng Thẻ Grid và Bảng Table, hiển thị avatar Trưởng phòng và danh sách nhân sự.",
      },
      {
        title: "2. Bổ nhiệm Trưởng phòng ban (Admin / Giám đốc)",
        description:
          "Bấm 'Điều chỉnh nhân sự' ➔ Tìm nhân viên muốn bổ nhiệm ➔ Nhấn nút '👑 Bổ nhiệm'. Hệ thống sẽ tự động nâng vai trò của nhân sự đó từ 'Nhân viên' lên 'Trưởng phòng' (Quản lý).",
      },
      {
        title: "3. Thêm / Chuyển nhân sự vào phòng",
        description:
          "• Chọn nhân sự có sẵn từ danh sách công ty để phân bổ vào phòng.\n• Hoặc bấm '+ Tạo nhân sự mới' để tạo tài khoản và gán trực tiếp vào phòng ban.",
      },
    ],
    tips: [
      "Khi một nhân sự được miễn nhiệm Trưởng phòng và không làm trưởng phòng nào khác, hệ thống sẽ tự động hạ vai trò về lại 'Nhân viên'.",
    ],
  },
  {
    id: "users",
    title: "Quản Lý Tài Khoản Người Dùng & Phân Quyền Hệ Thống",
    badge: "Người dùng",
    icon: "👥",
    roles: ["Giám đốc", "Admin"],
    summary:
      "Khởi tạo tài khoản nhân viên mới, thiết lập vai trò (Role), loại hợp đồng lao động và quản trị trạng thái tài khoản.",
    actionUrl: "/dashboard/users",
    actionLabel: "Đến Quản Lý Người Dùng",
    steps: [
      {
        title: "1. Thêm nhân viên mới",
        description:
          "Nhập họ tên, email công ty, số điện thoại, chọn phòng ban, vai trò (Admin, Giám đốc, Quản lý, Nhân viên) và loại hợp đồng.",
      },
      {
        title: "2. Loại hợp đồng (Chính thức / Thử việc)",
        description:
          "Nhân sự Chính thức có ngày bắt đầu chính thức và được tự động tính phép năm. Nhân sự Thử việc không tính phép năm.",
      },
      {
        title: "3. Khóa & Mở khóa tài khoản",
        description:
          "Nhân sự nghỉ việc hoặc tạm ngưng công tác có thể được chuyển sang trạng thái Tạm khóa (Suspended) hoặc Không hoạt động (Inactive).",
      },
    ],
  },
  {
    id: "settings",
    title: "Cài Đặt Hệ Thống & Cấu Hình IP Chấm Công",
    badge: "Cài đặt mạng IP",
    icon: "⚙️",
    roles: ["Giám đốc", "Admin"],
    summary:
      "Thiết lập danh sách địa chỉ IP mạng Wi-Fi hợp lệ của công ty và cấu hình các mốc thời gian chấm công.",
    actionUrl: "/dashboard/settings",
    actionLabel: "Đến Cài Đặt Hệ Thống",
    steps: [
      {
        title: "1. Cấu hình địa chỉ IP văn phòng",
        description:
          "Thêm các dải IP Wi-Fi công ty vào danh sách cho phép (Whitelist). Nhân viên kết nối đúng các mạng IP này mới được phép check-in.",
      },
      {
        title: "2. Cấu hình giờ ca làm việc",
        description:
          "Cài đặt giờ vào ca chuẩn (08:00) và giờ tan ca (17:30) cùng số phút ân hạn cho phép.",
      },
    ],
  },
  {
    id: "profile",
    title: "Cài Đặt Tài Khoản Cá Nhân, Ảnh Đại Diện & Đổi Mật Khẩu",
    badge: "Hồ sơ cá nhân",
    icon: "👤",
    roles: ["Tất cả nhân sự"],
    summary:
      "Tùy chỉnh thông tin cá nhân, tải ảnh đại diện thật hoặc chọn Preset Avatar 3D và thay đổi mật khẩu bảo mật.",
    actionUrl: "/dashboard/profile",
    actionLabel: "Đến Cài Đặt Tài Khoản",
    steps: [
      {
        title: "1. Đặt ảnh đại diện (Avatar)",
        description:
          "• Tải ảnh thật từ máy tính (hỗ trợ JPG, PNG, WebP) ➔ Ảnh sẽ được lưu trữ và hiển thị trên toàn bộ các bảng chấm công, duyệt đơn, phòng ban và chat.\n• Hoặc chọn nhanh một mẫu Avatar 3D nghệ thuật có sẵn.",
      },
      {
        title: "2. Cập nhật thông tin liên hệ",
        description:
          "Thay đổi Họ và tên hiển thị và Số điện thoại di động của bạn.",
      },
      {
        title: "3. Đổi mật khẩu định kỳ",
        description:
          "Nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 6 ký tự). Mật khẩu được mã hóa an toàn bằng thuật toán PBKDF2 HMAC-SHA256.",
      },
    ],
    tips: [
      "Nên đổi mật khẩu ngay sau lần đầu đăng nhập tài khoản do công ty cấp để đảm bảo tính riêng tư.",
    ],
  },
];

const roleMatrix = [
  {
    role: "Giám Đốc (Director)",
    icon: "👑",
    color: "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300",
    permissions: [
      "Thẩm quyền tối cao: Phê duyệt / Từ chối tất cả đơn Nghỉ phép và đơn làm thêm giờ OT",
      "Xem toàn bộ dữ liệu chấm công và xuất báo cáo của toàn công ty",
      "Toàn quyền tạo việc và phân công nhiệm vụ cho bất kỳ ai trên toàn công ty",
      "Quản lý cây cơ cấu phòng ban, bổ nhiệm và bãi nhiệm Trưởng phòng",
      "Xem toàn bộ tin nhắn thông báo công ty và các nhóm được tham gia",
    ],
  },
  {
    role: "Quản Trị Viên (Admin)",
    icon: "🛡️",
    color: "border-purple-400 bg-purple-50/40 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300",
    permissions: [
      "Quản trị tài khoản người dùng: Tạo mới, cấp lại mật khẩu, khóa/mở khóa",
      "Cấu hình hệ thống: Thiết lập IP mạng chấm công, giờ làm việc công ty",
      "Quản lý cơ cấu phòng ban và điều phối nhân sự",
      "Xem dữ liệu chấm công và theo dõi công việc toàn công ty",
    ],
  },
  {
    role: "Trưởng Phòng / Quản Lý (Manager)",
    icon: "⭐",
    color: "border-blue-400 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300",
    permissions: [
      "Quản lý nội bộ phòng ban của mình và đại diện kênh chat phòng ban",
      "Phân công, giao việc và giám sát tiến độ công việc của các nhân sự CÙNG phòng ban",
      "Xem toàn bộ các đầu công việc của các nhân viên trong phòng ban",
      "Chấm công trực tuyến, nộp đơn Nghỉ phép & OT cá nhân lên Giám đốc",
    ],
  },
  {
    role: "Nhân Viên (Employee)",
    icon: "👤",
    color: "border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100",
    badgeClass: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
    permissions: [
      "Chấm công trực tuyến hàng ngày bằng Wi-Fi nội bộ văn phòng (08:00 - 17:30, Thứ 2 - Thứ 7)",
      "Nộp đơn Nghỉ phép các loại và Đăng ký làm thêm giờ (OT) gửi Giám đốc",
      "Tự tạo công việc cá nhân cần hoàn thành và nhận việc được cấp trên phân công",
      "Tham gia trao đổi trong nhóm chat phòng ban, nhóm công ty và chat 1-1 với đồng nghiệp",
      "Tùy chỉnh thông tin cá nhân, cập nhật ảnh đại diện avatar và đổi mật khẩu",
    ],
  },
];

const faqList = [
  {
    q: "Tại sao tôi không bấm được nút Check-in / Điểm danh?",
    a: "Hệ thống áp dụng chính sách bảo mật chấm công bằng IP mạng nội bộ. Bạn cần kết nối đúng mạng Wi-Fi tại văn phòng công ty. Nếu đang dùng 4G hoặc mạng ngoài, hệ thống sẽ báo địa chỉ IP không hợp lệ và khóa nút chấm công.",
  },
  {
    q: "Trưởng phòng có quyền phê duyệt đơn xin nghỉ phép của nhân viên không?",
    a: "Theo quy định hiện hành của doanh nghiệp, tất cả các đơn Nghỉ phép và Đăng ký OT đều bắt buộc phải chuyển lên Giám đốc trực tiếp xem xét và phê duyệt. Trưởng phòng chỉ có thẩm quyền theo dõi đơn.",
  },
  {
    q: "Tôi muốn đổi ảnh đại diện cá nhân thì thực hiện ở đâu?",
    a: "Bạn vào mục 'Cài đặt tài khoản' (/dashboard/profile) từ thanh menu. Tại đây bạn có thể bấm 'Chọn ảnh từ máy tính' để tải ảnh thật lên (hệ thống tự động hiển thị avatar này ở các bảng điểm danh, duyệt đơn, phòng ban và chat).",
  },
  {
    q: "Trưởng phòng có thể giao việc cho nhân sự phòng ban khác không?",
    a: "Không. Để đảm bảo tính độc lập và phân cấp quản lý, Trưởng phòng chỉ có quyền giao việc cho nhân sự thuộc cùng phòng ban với mình. Chỉ có Giám đốc và Quản trị viên mới có thẩm quyền giao việc liên phòng ban trên toàn công ty.",
  },
  {
    q: "Làm thế nào để tạo nhóm chat thảo luận dự án riêng?",
    a: "Bạn vào mục 'Tin nhắn nội bộ' (/dashboard/chat) ➔ Nhấn nút '+ Cuộc trò chuyện mới' ➔ Chọn 'Tạo hội nhóm chat' ➔ Đặt tên nhóm và tích chọn các đồng nghiệp muốn thêm vào nhóm.",
  },
];

export default function GuidePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModuleId, setActiveModuleId] = useState<string>("attendance");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Lọc module theo từ khóa tìm kiếm
  const filteredModules = guideModules.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.badge.toLowerCase().includes(q) ||
      m.steps.some((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    );
  });

  const currentModule = guideModules.find((m) => m.id === activeModuleId) || guideModules[0];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* ========================================================
          1. HERO HEADER & THANH TÌM KIẾM HƯỚNG DẪN
         ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6 sm:p-10 shadow-xl border border-zinc-800">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-zinc-200 backdrop-blur-md border border-white/10">
              <span>📚</span>
              <span>Tài Liệu Cẩm Nang Doanh Nghiệp</span>
            </div>
            <Link
              href="/dashboard/regulations"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition border border-emerald-400/20 backdrop-blur-md"
            >
              <span>⚖️</span>
              <span>Xem Quy Định Doanh Nghiệp →</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Trung Tâm Hướng Dẫn Sử Dụng
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Khám phá chi tiết quy trình hoạt động, các chức năng nghiệp vụ và quy định phân quyền của toàn bộ hệ thống website nội bộ công ty.
          </p>

          {/* Ô tìm kiếm thông minh */}
          <div className="pt-2">
            <div className="relative max-w-xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tính năng: chấm công, duyệt đơn, tạo việc, chat..."
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/10 dark:bg-black/30 border border-white/20 text-white placeholder-zinc-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-md"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none text-base">
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white cursor-pointer text-sm"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-[11px] text-zinc-300 mt-2">
                Tìm thấy <strong>{filteredModules.length}</strong> chuyên mục hướng dẫn phù hợp.
              </p>
            )}
          </div>
        </div>

        {/* Trang trí nền */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center text-9xl">
          📖
        </div>
      </div>

      {/* ========================================================
          2. MA TRẬN PHÂN QUYỀN VAI TRÒ TRONG HỆ THỐNG
         ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>🛡️</span>
              <span>Cơ Cấu Phân Quyền 4 Cấp Bậc (Role Matrix)</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Hệ thống được vận hành theo cơ chế phân quyền bảo mật chặt chẽ giữa 4 vai trò chính.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roleMatrix.map((item) => {
            const isMyRole = user?.role === item.role.toLowerCase().split(" ")[0];

            return (
              <div
                key={item.role}
                className={`p-4 sm:p-5 rounded-2xl border ${item.color} shadow-xs space-y-3 flex flex-col justify-between relative`}
              >
                {isMyRole && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                    Vai trò của bạn
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    <h3 className="font-bold text-xs sm:text-sm">{item.role}</h3>
                  </div>

                  <ul className="space-y-1.5 text-[11px] leading-relaxed">
                    {item.permissions.map((p, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold shrink-0">✓</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          3. KHUNG CHI TIẾT 9 CHUYÊN MỤC HƯỚNG DẪN TÍNH NĂNG
         ======================================================== */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>💡</span>
            <span>Hướng Dẫn Chi Tiết Từng Tính Năng</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Chọn một chuyên mục bên dưới để xem các bước thao tác, quy định và mẹo sử dụng hiệu quả.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Menu chọn chuyên mục bên trái */}
          <div className="lg:col-span-4 space-y-2">
            <div className="p-2 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
              {filteredModules.map((m) => {
                const isActive = m.id === activeModuleId;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveModuleId(m.id)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 cursor-pointer ${
                      isActive
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80 font-bold"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 font-medium"
                    }`}
                  >
                    <span className="text-xl shrink-0">{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate">{m.title}</div>
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5">{m.badge}</div>
                    </div>
                    {isActive && <span className="text-blue-600 text-xs shrink-0 font-bold">➔</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nội dung chi tiết của chuyên mục bên phải */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
            {/* Header chuyên mục */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl">{currentModule.icon}</span>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {currentModule.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                  <span className="text-[11px] text-zinc-400">Áp dụng:</span>
                  {currentModule.roles.map((r, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-semibold border border-blue-200 dark:border-blue-900/50"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {currentModule.actionUrl && (
                <Link
                  href={currentModule.actionUrl}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition shrink-0"
                >
                  <span>{currentModule.actionLabel || "Truy cập tính năng"}</span>
                  <span>➔</span>
                </Link>
              )}
            </div>

            {/* Mô tả tóm tắt */}
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              {currentModule.summary}
            </p>

            {/* Lưu ý quan trọng nếu có */}
            {currentModule.importantNotice && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <span className="text-base shrink-0">⚠️</span>
                <div className="leading-relaxed">
                  <strong className="block font-bold mb-0.5">QUY ĐỊNH BẮT BUỘC:</strong>
                  {currentModule.importantNotice}
                </div>
              </div>
            )}

            {/* Các bước thực hiện chi tiết */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Quy trình &amp; Các bước thao tác:
              </h4>
              <div className="space-y-3">
                {currentModule.steps.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-2xs space-y-1.5"
                  >
                    <h5 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span>{s.title}</span>
                    </h5>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-7 leading-relaxed whitespace-pre-line">
                      {s.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mẹo sử dụng (Tips) */}
            {currentModule.tips && currentModule.tips.length > 0 && (
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 space-y-1.5 text-xs">
                <span className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <span>💡</span>
                  <span>Mẹo hữu ích:</span>
                </span>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed pl-1">
                  {currentModule.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          4. CÂU HỎI THƯỜNG GẶP (FAQ)
         ======================================================== */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>❓</span>
            <span>Câu Hỏi Thường Gặp (FAQ)</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Giải đáp các thắc mắc phổ biến trong quá trình thao tác sử dụng hệ thống.
          </p>
        </div>

        <div className="space-y-2.5">
          {faqList.map((faq, idx) => {
            const isOpen = expandedFaq === idx;

            return (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs transition"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition"
                >
                  <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                    {faq.q}
                  </span>
                  <span className="text-zinc-400 text-sm shrink-0 font-bold">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

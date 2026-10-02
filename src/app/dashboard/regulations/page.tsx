"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface RegulationArticle {
  id: string;
  articleNumber: string;
  title: string;
  badge?: "Bắt buộc" | "Khuyến khích" | "Nghiêm cấm" | "Quan trọng";
  summary: string;
  content: string[];
  keyRules?: string[];
  penaltyOrNote?: string;
}

interface RegulationChapter {
  id: string;
  chapterNumber: string;
  title: string;
  icon: string;
  description: string;
  articles: RegulationArticle[];
}

const REGULATION_DATA: RegulationChapter[] = [
  {
    id: "chapter-1",
    chapterNumber: "Chương I",
    title: "Thời Gian Làm Việc & Kỷ Luật Lao Động",
    icon: "⏱️",
    description: "Quy định về thời gian biểu chuẩn, tác phong giờ giấc và quy chế chấm công hàng ngày.",
    articles: [
      {
        id: "art-1",
        articleNumber: "Điều 1",
        title: "Thời gian làm việc tiêu chuẩn",
        badge: "Bắt buộc",
        summary: "Khung thời gian làm việc hành chính áp dụng cho toàn thể nhân sự văn phòng.",
        content: [
          "Tuần làm việc tiêu chuẩn: Từ Thứ Hai đến hết Thứ Bảy hàng tuần (nghỉ Chủ Nhật, trừ các trường hợp phân ca trực hoặc dự án đặc thù theo phê duyệt của Ban Giám Đốc).",
          "Buổi sáng: Bắt đầu từ 08:00 đến 12:00.",
          "Nghỉ trưa & sinh hoạt: Từ 12:00 đến 13:30 (1 tiếng 30 phút).",
          "Buổi chiều: Bắt đầu từ 13:30 đến 17:30.",
          "Tổng thời gian làm việc chuẩn: 8 giờ/ngày (48 giờ/tuần, Thứ Hai đến Thứ Bảy).",
        ],
        keyRules: [
          "Nhân viên có mặt tại bàn làm việc sẵn sàng trước 08:00.",
          "Không giải quyết việc cá nhân trong giờ làm việc chính thức.",
        ],
      },
      {
        id: "art-2",
        articleNumber: "Điều 2",
        title: "Quy định Chấm công qua Mạng nội bộ",
        badge: "Bắt buộc",
        summary: "Quy chuẩn điểm danh vào ca và tan ca trên hệ thống nội bộ.",
        content: [
          "Mọi nhân viên có nghĩa vụ thực hiện Check-in (Vào ca) và Check-out (Tan ca) bằng tài khoản cá nhân trên cổng thông tin nội bộ.",
          "Hệ thống chỉ chấp nhận lượt chấm công hợp lệ khi thiết bị kết nối vào mạng Wi-Fi nội bộ tại văn phòng (đã được cấu hình IP trong Whitelist hệ thống).",
          "Nghiêm cấm hành vi chấm công hộ, mượn tài khoản hoặc sử dụng công cụ can thiệp vị trí/mạng trái phép.",
        ],
        penaltyOrNote: "Hành vi nhờ người khác chấm công hộ sẽ bị khiển trách bằng văn bản và trừ 100% phụ cấp chuyên cần của tháng vi phạm đối với cả hai người.",
      },
      {
        id: "art-3",
        articleNumber: "Điều 3",
        title: "Xử lý Đi muộn, Về sớm & Quên chấm công",
        badge: "Quan trọng",
        summary: "Quy định giám sát giờ giấc và cơ chế bổ sung giải trình khi có sự cố phát sinh.",
        content: [
          "Đi muộn: Check-in sau 08:00 được tính là đi muộn.",
          "Về sớm: Check-out trước 17:30 mà chưa được Trưởng phòng duyệt đơn cho về sớm được tính là về sớm.",
          "Quên chấm công: Nhân viên phải tạo phiếu giải trình bổ sung trên hệ thống trong vòng 24 giờ kể từ ngày phát sinh, có xác nhận minh chứng của Trưởng phòng/Đồng nghiệp.",
          "Mỗi nhân viên được linh hoạt tối đa 02 lần/tháng (mỗi lần không quá 10 phút vì lý do giao thông/thời tiết) nếu có thông báo trước trong nhóm chat phòng ban.",
        ],
        penaltyOrNote: "Đi muộn hoặc về sớm quá 03 lần/tháng không có lý do chính đáng sẽ tính vào đánh giá KPI chuyên cần và xếp loại thi đua tháng.",
      },
    ],
  },
  {
    id: "chapter-2",
    chapterNumber: "Chương II",
    title: "Chế Độ Nghỉ Phép, Làm Thêm Giờ (OT) & Công Tác",
    icon: "📋",
    description: "Thủ tục đăng ký nghỉ phép năm, nghỉ việc riêng, làm thêm ngoài giờ và công tác ngoại tỉnh.",
    articles: [
      {
        id: "art-4",
        articleNumber: "Điều 4",
        title: "Chế độ Nghỉ phép năm (Annual Leave)",
        badge: "Bắt buộc",
        summary: "Quyền lợi và quy trình sử dụng 12 ngày phép năm theo Luật Lao động.",
        content: [
          "Nhân viên ký Hợp đồng lao động chính thức có 12 ngày phép năm hưởng nguyên lương/năm (tương ứng tích lũy 01 ngày/tháng làm việc đủ thời gian).",
          "Nhân viên làm việc đủ 05 năm tại công ty được cộng thêm 01 ngày phép/năm theo chế độ thâm niên.",
          "Phép năm còn thừa của năm hiện tại được bảo lưu chuyển sang quý I của năm kế tiếp (hạn chót sử dụng là 31/03 hàng năm).",
        ],
        keyRules: [
          "Nghỉ từ 1 - 2 ngày: Nộp đơn trên hệ thống trước ít nhất 01 ngày làm việc.",
          "Nghỉ từ 3 ngày trở lên: Nộp đơn trên hệ thống trước ít nhất 05 ngày làm việc để bàn giao công việc chu đáo.",
        ],
      },
      {
        id: "art-5",
        articleNumber: "Điều 5",
        title: "Thẩm quyền Phê duyệt Đơn Từ",
        badge: "Quan trọng",
        summary: "Quy tắc duyệt đơn thống nhất theo phân quyền của tổ chức.",
        content: [
          "Tất cả đơn xin Nghỉ phép (Phép năm, Nghỉ không lương, Nghỉ ốm...) và Đăng ký Làm thêm giờ (OT) bắt buộc phải do Ban Giám Đốc trực tiếp xem xét và phê duyệt cuối cùng trên hệ thống.",
          "Trưởng bộ phận/Quản lý phòng ban có trách nhiệm xác nhận tính khả thi, tình trạng phân công người thay thế trước khi chuyển đơn lên Giám Đốc.",
          "Nhân viên chỉ được chính thức nghỉ sau khi trạng thái đơn hiển thị 'Đã Phê Duyệt' trên hệ thống. Tự ý nghỉ khi đơn chưa được duyệt sẽ bị xem là nghỉ không phép.",
        ],
      },
      {
        id: "art-6",
        articleNumber: "Điều 6",
        title: "Quy định Làm thêm giờ (OT - Overtime)",
        badge: "Quan trọng",
        summary: "Điều kiện và chế độ đãi ngộ khi phát sinh yêu cầu tăng ca phục vụ dự án.",
        content: [
          "Làm thêm giờ chỉ được áp dụng khi có phát sinh khối lượng công việc cấp thiết theo yêu cầu của dự án hoặc chỉ đạo từ cấp Quản lý.",
          "Mọi lượt làm thêm giờ bắt buộc phải có Đơn đăng ký OT được Giám Đốc phê duyệt trước khi tiến hành.",
          "Lương làm thêm giờ tính theo quy định Bộ Luật Lao động: 150% lương giờ ngày thường; 200% lương giờ ngày nghỉ cuối tuần; 300% lương giờ ngày Lễ, Tết.",
        ],
        penaltyOrNote: "Công ty không giải quyết tính tiền OT cho các trường hợp tự ý ở lại văn phòng làm việc mà không có đơn duyệt trước.",
      },
    ],
  },
  {
    id: "chapter-3",
    chapterNumber: "Chương III",
    title: "Tác Phong, Trang Phục & Văn Hóa Văn Phòng",
    icon: "👔",
    description: "Chuẩn mực diện mạo, quy tắc ứng xử lịch thiệp và giữ gìn hình ảnh chuyên nghiệp của doanh nghiệp.",
    articles: [
      {
        id: "art-7",
        articleNumber: "Điều 7",
        title: "Quy định Trang phục & Diện mạo công sở",
        badge: "Bắt buộc",
        summary: "Trang phục chỉnh tề, thanh lịch phù hợp với môi trường làm việc văn phòng hiện đại.",
        content: [
          "Từ Thứ Hai đến Thứ Sáu: Trang phục công sở lịch sự (Nam: Áo sơ mi/áo polo có cổ, quần âu hoặc quần kaki, giày tây/sneaker tối màu sạch sẽ; Nữ: Áo sơ mi, váy công sở dài ngang/dưới gối, quần tây lịch sự).",
          "Thứ Bảy (Casual Saturday): Nhân viên được phép mặc trang phục tự do lịch sự (quần jeans không rách gối, áo phông có tay chỉn chu).",
          "Nghiêm cấm: Mặc quần đùi, quần lửng ngủ, áo ba lỗ, dép lê xỏ ngón, trang phục quá mỏng hoặc có in hình ảnh/chữ ngữ thiếu văn hóa.",
        ],
      },
      {
        id: "art-8",
        articleNumber: "Điều 8",
        title: "Đeo Thẻ Nhân Viên & Kiểm Soát Ra Vào",
        badge: "Bắt buộc",
        summary: "Đảm bảo an ninh nội bộ và văn hóa nhận diện trong tòa nhà làm việc.",
        content: [
          "Nhân viên có nghĩa vụ đeo thẻ nhân viên trong suốt thời gian làm việc tại văn phòng và khi đón tiếp khách hàng/đối tác.",
          "Trường hợp làm mất hoặc hỏng thẻ, phải báo ngay cho bộ phận Hành chính Nhân sự trong vòng 24 giờ để cấp lại.",
          "Không cho người lạ, người không có phận sự vào khu vực làm việc của công ty mà không đăng ký trước tại quầy lễ tân.",
        ],
      },
      {
        id: "art-9",
        articleNumber: "Điều 9",
        title: "Văn hóa Ứng xử & Tiêu chuẩn 5S tại Bàn làm việc",
        badge: "Khuyến khích",
        summary: "Quy chuẩn giao tiếp văn minh, tôn trọng đồng nghiệp và duy trì không gian sạch sẽ.",
        content: [
          "Giao tiếp lịch thiệp, tôn trọng, cầu thị; xưng hô đúng mực; không nói tục, chửi thề hoặc to tiếng gây ảnh hưởng tới mọi người xung quanh.",
          "Thực hiện nguyên tắc 5S (Sàng lọc - Sắp xếp - Sạch sẽ - Săn sóc - Sẵn sàng) tại vị trí làm việc cá nhân.",
          "Khi rời bàn làm việc quá 15 phút hoặc kết thúc ca làm việc: Thu dọn tài liệu, xếp gọn ghế ngồi, tắt đèn bàn và bấm tổ hợp phím (Win + L) để khóa màn hình máy tính.",
        ],
      },
    ],
  },
  {
    id: "chapter-4",
    chapterNumber: "Chương IV",
    title: "Bảo Mật Thông Tin & Quản Lý Tài Sản Công Ty",
    icon: "🛡️",
    description: "Nguyên tắc bảo vệ dữ liệu doanh nghiệp, an toàn thông tin số và sử dụng trang thiết bị làm việc.",
    articles: [
      {
        id: "art-10",
        articleNumber: "Điều 10",
        title: "Bảo mật Dữ liệu & Bí mật Kinh doanh",
        badge: "Nghiêm cấm",
        summary: "Cam kết bảo mật tuyệt đối các thông tin sở hữu trí tuệ của tổ chức.",
        content: [
          "Toàn bộ tài liệu kỹ thuật, mã nguồn dự án, dữ liệu khách hàng, bảng báo giá, chiến lược kinh doanh và mức lương cá nhân đều là tài sản bảo mật cao của công ty.",
          "Tuyệt đối nghiêm cấm việc sao chép, tải dữ liệu nội bộ lên các dịch vụ đám mây công cộng cá nhân (Google Drive cá nhân, Dropbox cá nhân...) hoặc chia sẻ cho bên thứ ba khi chưa có văn bản phê duyệt của Ban Giám Đốc.",
          "Nhân viên thôi việc có trách nhiệm bàn giao 100% dữ liệu, tài khoản và ký cam kết không vi phạm thỏa thuận bảo mật NDA trong vòng tối thiểu 02 năm sau khi chấm dứt hợp đồng.",
        ],
        penaltyOrNote: "Mọi hành vi làm rò rỉ dữ liệu hoặc mã nguồn vì mục đích trục lợi cá nhân sẽ bị sa thải ngay lập tức và chuyển hồ sơ sang cơ quan pháp luật xử lý theo quy định hiện hành.",
      },
      {
        id: "art-11",
        articleNumber: "Điều 11",
        title: "Sử dụng Trang thiết bị & Hạ tầng Mạng",
        badge: "Bắt buộc",
        summary: "Sử dụng máy tính công ty, hạ tầng mạng nội bộ đúng mục đích phục vụ công việc.",
        content: [
          "Máy tính để bàn, máy tính xách tay và các thiết bị được công ty cấp phát chỉ dùng để phục vụ các hoạt động liên quan đến công việc chuyên môn.",
          "Không tự ý cài đặt các phần mềm bẻ khóa (crack), phần mềm có nguy cơ chứa mã độc, virus hoặc công cụ đào tiền ảo (crypto mining) trên thiết bị của công ty.",
          "Không sử dụng mạng Wi-Fi công ty để tải phim/nhạc bằng torrent, xem phim giải trí trong giờ làm việc hoặc truy cập các trang web có nội dung đồi trụy, cá cược bất hợp pháp.",
        ],
      },
      {
        id: "art-12",
        articleNumber: "Điều 12",
        title: "Bảo vệ Tài khoản Cá nhân & Mật khẩu",
        badge: "Quan trọng",
        summary: "Nâng cao ý thức an toàn thông tin cá nhân trong môi trường doanh nghiệp số.",
        content: [
          "Mỗi nhân viên chịu trách nhiệm hoàn toàn đối với mọi thao tác được thực hiện dưới tài khoản nội bộ của mình.",
          "Tuyệt đối không chia sẻ mật khẩu, mã OTP hoặc mượn tài khoản của nhau để thao tác giao việc, duyệt đơn hoặc gửi tin nhắn.",
          "Khuyến cáo đổi mật khẩu định kỳ tối thiểu 90 ngày/lần. Mật khẩu phải có độ dài từ 6 ký tự trở lên bao gồm cả chữ và số.",
        ],
      },
    ],
  },
  {
    id: "chapter-5",
    chapterNumber: "Chương V",
    title: "Văn Hóa Hội Họp, Báo Cáo & Tin Nhắn Nội Bộ",
    icon: "💬",
    description: "Tiêu chuẩn trao đổi công việc nhanh chóng, hội họp hiệu quả và quản lý tiến độ nhiệm vụ minh bạch.",
    articles: [
      {
        id: "art-13",
        articleNumber: "Điều 13",
        title: "Quy chuẩn Trao đổi trên Ứng dụng Chat Nội bộ",
        badge: "Bắt buộc",
        summary: "Giữ môi trường trao đổi trực tuyến lịch sự, tập trung và bảo mật.",
        content: [
          "Kênh Chung Toàn Công Ty: Chỉ đăng tải các thông báo chính sách, sự kiện tập thể, chúc mừng sinh nhật hoặc tin tức khẩn cấp chung. Không spam tin nhắn cá nhân.",
          "Kênh Phòng Ban: Thảo luận các đầu việc nội bộ, tiến độ dự án và thông báo chuyên môn của phòng. Tôn trọng chỉ đạo của Trưởng bộ phận.",
          "Kênh Nhóm Dự Án: Trao đổi ngắn gọn, tập trung vào kết quả công việc, đính kèm biên bản/tài liệu rõ ràng.",
          "Nghiêm cấm chia sẻ tin giả, các nội dung kích động tiêu cực, bôi nhọ đồng nghiệp hoặc các hình ảnh phản cảm trong nhóm chat công ty.",
        ],
      },
      {
        id: "art-14",
        articleNumber: "Điều 14",
        title: "Quy định Quản lý Công việc & Tiến độ Dự án",
        badge: "Bắt buộc",
        summary: "Minh bạch hóa nhiệm vụ được giao trên hệ thống quản lý công việc (Tasks).",
        content: [
          "Mọi nhiệm vụ do Ban Giám Đốc, Admin hoặc Trưởng phòng phân công phải được cập nhật trạng thái định kỳ (Đang làm, Hoàn thành, Chờ duyệt...).",
          "Khi gặp khó khăn hoặc có nguy cơ chậm tiến độ (Deadline Delay), nhân sự phải chủ động báo cáo cho Quản lý trước ít nhất nửa ngày làm việc để tìm phương án hỗ trợ.",
          "Khuyến khích nhân viên chủ động tạo các đầu việc cá nhân trên hệ thống để theo dõi công việc hiệu quả và làm cơ sở đánh giá năng lực.",
        ],
      },
      {
        id: "art-15",
        articleNumber: "Điều 15",
        title: "Kỷ luật Hội họp & Tham gia Sự kiện chung",
        badge: "Quan trọng",
        summary: "Đúng giờ và nghiêm túc trong mọi cuộc họp nội bộ và họp với khách hàng.",
        content: [
          "Có mặt tại phòng họp (hoặc đăng nhập phòng họp online) trước giờ bắt đầu tối thiểu 03 - 05 phút.",
          "Chuyển điện thoại sang chế độ rung hoặc im lặng trong suốt buổi họp.",
          "Chuẩn bị kỹ tài liệu và nội dung thảo luận trước khi bước vào cuộc họp.",
        ],
      },
    ],
  },
  {
    id: "chapter-6",
    chapterNumber: "Chương VI",
    title: "An Toàn Lao Động, Phòng Cháy Chữa Cháy & Vệ Sinh Chung",
    icon: "🧯",
    description: "Đảm bảo môi trường làm việc an toàn, phòng ngừa sự cố cháy nổ và giữ gìn khu vực sinh hoạt chung.",
    articles: [
      {
        id: "art-16",
        articleNumber: "Điều 16",
        title: "An toàn Phòng Cháy Chữa Cháy (PCCC)",
        badge: "Nghiêm cấm",
        summary: "Tuân thủ nghiêm ngặt quy định an toàn cháy nổ của tòa nhà.",
        content: [
          "Tuyệt đối KHÔNG HÚT THUỐC LÁ (kể cả thuốc lá điện tử/vape) bên trong văn phòng, cầu thang thoát hiểm và nhà vệ sinh. Chỉ hút thuốc tại khu vực ngoài trời được chỉ định.",
          "Không tự ý câu móc dây điện, sử dụng ấm đun siêu tốc hoặc các thiết bị sinh nhiệt trái phép tại bàn làm việc.",
          "Nắm rõ vị trí bình chữa cháy mini và các cửa thoát hiểm khẩn cấp của tầng văn phòng.",
        ],
        penaltyOrNote: "Hành vi hút thuốc trong văn phòng gây kích hoạt hệ thống báo cháy sẽ bị xử phạt tiền theo quy chế tòa nhà và xử lý kỷ luật mức Khiển trách bằng văn bản.",
      },
      {
        id: "art-17",
        articleNumber: "Điều 17",
        title: "Vệ sinh Khu vực Sinh hoạt chung (Pantry & Ăn uống)",
        badge: "Khuyến khích",
        summary: "Ý thức giữ gìn vệ sinh văn minh nơi sinh hoạt chung.",
        content: [
          "Nhân viên ăn sáng hoặc dùng bữa trưa tại khu vực Pantry riêng, hạn chế ăn các món có mùi nồng nặc tại bàn làm việc.",
          "Tự giác rửa sạch chén, bát, cốc chén cá nhân ngay sau khi sử dụng; không để qua đêm trong bồn rửa.",
          "Tủ lạnh văn phòng được dọn sạch vào chiều Thứ Bảy hàng tuần trước ngày nghỉ Chủ Nhật. Thực phẩm quá hạn sẽ được bộ phận tạp vụ loại bỏ để đảm bảo vệ sinh an toàn.",
        ],
      },
    ],
  },
  {
    id: "chapter-7",
    chapterNumber: "Chương VII",
    title: "Khen Thưởng, Thi Đua & Xử Lý Vi Phạm Kỷ Luật",
    icon: "⚖️",
    description: "Chính sách biểu dương nhân tài cống hiến và các hình thức chế tài xử lý sai phạm theo quy chuẩn pháp luật.",
    articles: [
      {
        id: "art-18",
        articleNumber: "Điều 18",
        title: "Chính sách Khen thưởng & Vinh danh",
        badge: "Khuyến khích",
        summary: "Động viên, khích lệ sự nỗ lực và sáng tạo của cán bộ nhân viên.",
        content: [
          "Khen thưởng Nhân viên Xuất Sắc Tháng / Quý / Năm kèm phần thưởng tài chính và bằng khen ghi nhận.",
          "Thưởng nóng cho các cá nhân hoặc tập thể dự án hoàn thành vượt tiến độ, mang lại hiệu quả doanh thu cao hoặc có sáng kiến cải tiến quy trình công nghệ nổi bật.",
          "Ưu tiên cơ hội đào tạo nâng cao chuyên môn và lộ trình thăng tiến rõ ràng cho nhân sự gắn bó có đóng góp tích cực.",
        ],
      },
      {
        id: "art-19",
        articleNumber: "Điều 19",
        title: "Các Hình Thức Xử Lý Vi Phạm Kỷ Luật",
        badge: "Quan trọng",
        summary: "Bốn cấp độ chế tài áp dụng theo Bộ Luật Lao động nước CHXHCN Việt Nam.",
        content: [
          "Cấp độ 1 - Khiển trách bằng miệng: Áp dụng đối với vi phạm lần đầu các lỗi nhẹ (như đi muộn không quá 3 lần, quên đeo thẻ, chưa giữ vệ sinh bàn làm việc).",
          "Cấp độ 2 - Khiển trách bằng văn bản: Áp dụng khi tái phạm sau khi đã được nhắc nhở, hoặc vi phạm giờ giấc nghiêm trọng, tự ý bỏ việc không xin phép dưới 02 ngày làm việc.",
          "Cấp độ 3 - Kéo dài thời hạn nâng lương không quá 06 tháng hoặc Miễn nhiệm chức vụ: Áp dụng với trường hợp vi phạm gây thiệt hại kinh tế đáng kể hoặc người quản lý lạm quyền, thiếu trách nhiệm gây hậu quả.",
          "Cấp độ 4 - Sa thải (Chấm dứt HĐLĐ): Áp dụng đối với các hành vi trộm cắp, tham ô, tiết lộ bí mật công nghệ/kinh doanh, sử dụng chất cấm tại công ty, đánh nhau, hoặc tự ý nghỉ việc 05 ngày cộng dồn trong 30 ngày mà không có lý do chính đáng.",
        ],
      },
    ],
  },
  {
    id: "chapter-8",
    chapterNumber: "Chương VIII",
    title: "Hiệu Lực Thi Hành & Trách Nhiệm Thực Hiện",
    icon: "📜",
    description: "Quy định về thời điểm áp dụng, sửa đổi bổ sung và cam kết tuân thủ của toàn thể người lao động.",
    articles: [
      {
        id: "art-20",
        articleNumber: "Điều 20",
        title: "Hiệu lực văn bản & Cam kết tuân thủ",
        badge: "Bắt buộc",
        summary: "Tính pháp lý và trách nhiệm thực thi đồng bộ trong toàn doanh nghiệp.",
        content: [
          "Quy chế này có hiệu lực kể từ ngày Ban Giám Đốc ban hành và áp dụng thống nhất cho toàn bộ Cán bộ, Nhân viên đang công tác tại Công ty (bao gồm cả nhân viên thử việc, chính thức và thời vụ).",
          "Mỗi nhân viên khi tiếp nhận công việc có nghĩa vụ đọc kỹ, nắm rõ và ký cam kết tuân thủ đầy đủ các điều khoản trong Quy chế này.",
          "Ban Giám Đốc và phòng Hành chính Nhân sự có quyền rà soát, cập nhật nội dung cho phù hợp với sự phát triển của công ty và quy định pháp luật trong từng thời kỳ.",
        ],
      },
    ],
  },
];

export default function RegulationsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("all");
  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({
    "art-1": true,
    "art-2": true,
    "art-4": true,
    "art-10": true,
  });

  const toggleArticle = (artId: string) => {
    setExpandedArticles((prev) => ({
      ...prev,
      [artId]: !prev[artId],
    }));
  };

  const expandAll = () => {
    const allIds: Record<string, boolean> = {};
    REGULATION_DATA.forEach((ch) => {
      ch.articles.forEach((art) => {
        allIds[art.id] = true;
      });
    });
    setExpandedArticles(allIds);
  };

  const collapseAll = () => {
    setExpandedArticles({});
  };

  const filteredChapters = useMemo(() => {
    return REGULATION_DATA.map((ch) => {
      // Filter by chapter selection
      if (selectedChapterId !== "all" && ch.id !== selectedChapterId) {
        return null;
      }

      // Filter by search query
      if (!searchQuery.trim()) {
        return ch;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchedArticles = ch.articles.filter((art) => {
        const titleMatch = art.title.toLowerCase().includes(q);
        const artNumMatch = art.articleNumber.toLowerCase().includes(q);
        const summaryMatch = art.summary.toLowerCase().includes(q);
        const contentMatch = art.content.some((c) => c.toLowerCase().includes(q));
        const keyRulesMatch = art.keyRules?.some((k) => k.toLowerCase().includes(q));
        return titleMatch || artNumMatch || summaryMatch || contentMatch || keyRulesMatch;
      });

      if (matchedArticles.length > 0) {
        return {
          ...ch,
          articles: matchedArticles,
        };
      }

      return null;
    }).filter(Boolean) as RegulationChapter[];
  }, [searchQuery, selectedChapterId]);

  const totalArticlesCount = useMemo(() => {
    return REGULATION_DATA.reduce((acc, curr) => acc + curr.articles.length, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 print:p-0 print:space-y-4">
      {/* 1. Header Banner / Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-900 to-zinc-900 text-white p-4 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] sm:text-xs font-semibold backdrop-blur-sm border border-indigo-400/20">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Văn Bản Pháp Quy Nội Bộ • Số 01/2026/QĐ-NB</span>
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Quy Định & Nội Quy Doanh Nghiệp
            </h1>
            <p className="text-xs sm:text-base text-zinc-300 max-w-3xl leading-relaxed">
              Văn bản chuẩn mực tác phong, giờ giấc làm việc, kỷ luật lao động, bảo mật dữ liệu và chế độ đãi ngộ áp dụng bắt buộc cho toàn thể nhân sự.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 print:hidden">
            {/* Desktop Print button (hidden on mobile) */}
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm backdrop-blur-sm border border-white/15 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              In Bản Quy Định
            </button>
            <Link
              href="/dashboard/guide"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Hướng Dẫn Thao Tác
            </Link>
          </div>
        </div>

        {/* Thống kê nhanh:
            - Desktop: giữ nguyên grid 4 cột ban đầu
            - Mobile: hiển thị 2 dòng chip gọn đẹp không chiếm chiều cao
        */}
        <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-indigo-700/40">
          <div className="bg-black/20 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-xs text-zinc-400 block">Quy mô điều lệ</span>
            <span className="text-lg font-bold text-white">8 Chương • {totalArticlesCount} Điều</span>
          </div>
          <div className="bg-black/20 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-xs text-zinc-400 block">Thời gian làm việc</span>
            <span className="text-lg font-bold text-emerald-400">08:00 - 17:30 (Thứ 2 - 7)</span>
          </div>
          <div className="bg-black/20 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-xs text-zinc-400 block">Phê duyệt đơn</span>
            <span className="text-lg font-bold text-amber-400">Giám Đốc phê duyệt</span>
          </div>
          <div className="bg-black/20 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-xs text-zinc-400 block">Đối tượng áp dụng</span>
            <span className="text-lg font-bold text-indigo-300">100% Cán bộ nhân viên</span>
          </div>
        </div>

        {/* Mobile Fast-Facts Strip */}
        <div className="sm:hidden flex items-center justify-between gap-2 mt-3.5 pt-3 border-t border-indigo-700/30 text-[11px]">
          <span className="text-zinc-300 flex items-center gap-1">
            <span>📜</span>
            <strong className="text-white">8 Chương</strong> ({totalArticlesCount} điều)
          </span>
          <span className="text-emerald-300 flex items-center gap-1">
            <span>⏱️</span>
            <strong>08:00 - 17:30</strong> (T2-T7)
          </span>
        </div>
      </div>

      {/* 2. Tóm tắt 6 Nguyên Tắc Cốt Lõi (Core Corporate Ethics Card) */}
      <div className="space-y-2.5 sm:space-y-4 print:hidden">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>🎯</span>
            <span>6 Nguyên Tắc Cốt Lõi Tại Nơi Làm Việc</span>
          </h3>
          <span className="text-[11px] text-zinc-400">Tuân thủ 100%</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-start gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs text-xs sm:text-sm mt-0.5">
              1
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs sm:text-sm text-emerald-950 dark:text-emerald-300">Đúng Giờ & Tự Giác</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed break-words">
                Check-in trước 08:00 và Check-out sau 17:30 qua Wi-Fi công ty. Tôn trọng thời gian làm việc chung (Thứ 2 - Thứ 7).
              </p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-blue-200 dark:border-blue-950 bg-blue-50/60 dark:bg-blue-950/20 flex items-start gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs text-xs sm:text-sm mt-0.5">
              2
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs sm:text-sm text-blue-950 dark:text-blue-300">Bảo Mật Tuyệt Đối</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed break-words">
                Tuyệt đối không rò rỉ mã nguồn, dữ liệu khách hàng hoặc chia sẻ mật khẩu tài khoản cá nhân.
              </p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-purple-200 dark:border-purple-950 bg-purple-50/60 dark:bg-purple-950/20 flex items-start gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs text-xs sm:text-sm mt-0.5">
              3
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs sm:text-sm text-purple-950 dark:text-purple-300">Thủ Tục Minh Bạch</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed break-words">
                Tạo đơn xin nghỉ phép / OT trước hạn trên hệ thống và chờ Ban Giám Đốc xét duyệt trước khi thực hiện.
              </p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-amber-200 dark:border-amber-950 bg-amber-50/60 dark:bg-amber-950/20 flex items-start gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs text-xs sm:text-sm mt-0.5">
              4
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs sm:text-sm text-amber-950 dark:text-amber-300">Trang Phục Lịch Thiệp</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed break-words">
                Mặc đồ công sở chỉnh tề từ T2 - T5; được mặc smart-casual vào T6; luôn đeo thẻ nhân viên trong văn phòng.
              </p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-50/60 dark:bg-rose-950/20 flex items-start gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs text-xs sm:text-sm mt-0.5">
              5
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs sm:text-sm text-rose-950 dark:text-rose-300">Không Thuốc Lá & Cháy Nổ</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed break-words">
                Nghiêm cấm hút thuốc (kể cả vape) trong văn phòng, cầu thang và toilet. Tuân thủ 100% nội quy PCCC.
              </p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-indigo-200 dark:border-indigo-950 bg-indigo-50/60 dark:bg-indigo-950/20 flex items-start gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs text-xs sm:text-sm mt-0.5">
              6
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs sm:text-sm text-indigo-950 dark:text-indigo-300">Văn Hóa Giao Tiếp 5S</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed break-words">
                Giao tiếp văn minh, tôn trọng đồng nghiệp; giữ bàn làm việc ngăn nắp; khóa màn hình (Win + L) khi ra ngoài.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Thanh tìm kiếm và bộ lọc chương */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2.5 sm:p-5 shadow-xs space-y-2.5 sm:space-y-4 print:hidden">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo điều, từ khóa (giờ làm, phép, OT...)..."
              className="w-full pl-8 sm:pl-10 pr-7 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 absolute left-2.5 sm:left-3 top-2.5 sm:top-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 sm:top-3 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Desktop Only: 2 nút Mở rộng / Thu gọn bên phải ô tìm kiếm */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            >
              Mở rộng tất cả
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            >
              Thu gọn
            </button>
          </div>

          {/* Mobile Only: 2 nút nhỏ chung hàng ngang với ô tìm kiếm (tiết kiệm 1 dòng trống) */}
          <div className="flex sm:hidden items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-2 py-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition cursor-pointer active:scale-95"
            >
              Mở hết
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2 py-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition cursor-pointer active:scale-95"
            >
              Thu gọn
            </button>
          </div>
        </div>

        {/* Quick Chapter Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs -mx-2.5 px-2.5 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setSelectedChapterId("all")}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg whitespace-nowrap font-medium transition cursor-pointer shrink-0 ${
              selectedChapterId === "all"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Tất cả ({REGULATION_DATA.length})
          </button>
          {REGULATION_DATA.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setSelectedChapterId(ch.id)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg whitespace-nowrap font-medium transition flex items-center gap-1 cursor-pointer shrink-0 ${
                selectedChapterId === ch.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <span>{ch.icon}</span>
              <span>{ch.chapterNumber}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Danh sách các Chương & Điều khoản */}
      <div className="space-y-4 sm:space-y-8">
        {filteredChapters.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">🔍</span>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Không tìm thấy quy định phù hợp
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Thử tìm kiếm với từ khóa khác như: &quot;chấm công&quot;, &quot;phép năm&quot;, &quot;OT&quot;, &quot;bảo mật&quot;, &quot;kỷ luật&quot;...
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedChapterId("all");
              }}
              className="mt-4 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer"
            >
              Xem toàn bộ quy định
            </button>
          </div>
        ) : (
          filteredChapters.map((chapter) => (
            <div
              key={chapter.id}
              id={chapter.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden transition-all"
            >
              {/* Chapter Header */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-5 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-800/60 dark:to-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base sm:text-xl shrink-0 shadow-xs mt-0.5 sm:mt-0">
                    {chapter.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {chapter.chapterNumber}
                    </div>
                    <h2 className="text-sm sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                      {chapter.title}
                    </h2>
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shrink-0 mt-0.5 sm:mt-0">
                  {chapter.articles.length} Điều
                </span>
              </div>

              {chapter.description && (
                <div className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-50/40 dark:bg-blue-950/20 text-xs text-zinc-600 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/60">
                  💡 {chapter.description}
                </div>
              )}

              {/* Articles Accordion List */}
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {chapter.articles.map((article) => {
                  const isExpanded = expandedArticles[article.id] ?? false;

                  const badgeStyles = {
                    "Bắt buộc": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                    "Nghiêm cấm": "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
                    "Quan trọng": "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                    "Khuyến khích": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                  };

                  return (
                    <div key={article.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <button
                        type="button"
                        onClick={() => toggleArticle(article.id)}
                        className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-start sm:items-center justify-between text-left gap-2 sm:gap-4 cursor-pointer"
                      >
                        <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 shrink-0 w-12 sm:w-14 pt-0.5 sm:pt-0">
                            {article.articleNumber}
                          </span>
                          <span className="font-semibold text-xs sm:text-base text-zinc-900 dark:text-zinc-100 leading-snug break-words flex-1">
                            {article.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 pt-0.5 sm:pt-0">
                          {article.badge && (
                            <span
                              className={`text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full border ${
                                badgeStyles[article.badge] || ""
                              }`}
                            >
                              {article.badge}
                            </span>
                          )}
                          <svg
                            className={`w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 transition-transform duration-200 shrink-0 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Article Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-1 space-y-3 sm:space-y-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50/30 dark:bg-zinc-900/50">
                          <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 italic">
                            &quot;{article.summary}&quot;
                          </p>

                          <div className="space-y-2">
                            {article.content.map((p, idx) => (
                              <div key={idx} className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm leading-relaxed">
                                <span className="text-blue-500 font-bold mt-0.5 shrink-0">•</span>
                                <span>{p}</span>
                              </div>
                            ))}
                          </div>

                          {article.keyRules && article.keyRules.length > 0 && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1.5">
                              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wide block">
                                📌 Lưu ý chấp hành:
                              </span>
                              {article.keyRules.map((r, rIdx) => (
                                <div key={rIdx} className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                  <span>{r}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {article.penaltyOrNote && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 sm:gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                              <span className="text-sm sm:text-base shrink-0">⚠️</span>
                              <div className="leading-relaxed">
                                <strong className="font-semibold">Chế tài & Cảnh báo: </strong>
                                {article.penaltyOrNote}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Chữ ký Pháp nhân / Cam kết Thực hiện (Print-ready Footer) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-8 space-y-4 sm:space-y-6">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 sm:pb-4">
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            Cam Kết Thực Hiện Nội Quy Lao Động
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Quy chế được phổ biến công khai trên cổng thông tin nội bộ. Cán bộ nhân viên vi phạm sẽ bị xử lý kỷ luật theo các khung chế tài đã ban hành.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 text-center pt-1 sm:pt-2">
          <div className="space-y-1.5 sm:space-y-2 p-3 sm:p-0 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 sm:bg-transparent">
            <span className="text-xs uppercase font-semibold text-zinc-500 block">Đại Diện Người Lao Động</span>
            <p className="text-[11px] sm:text-xs italic text-zinc-400">(Xác nhận điện tử khi tiếp nhận việc)</p>
            <div className="h-12 sm:h-20 flex items-center justify-center text-xs text-zinc-600 dark:text-zinc-300 font-mono">
              {user ? `[Đã xác nhận bởi: ${user.name}]` : "[Chữ ký nhân viên]"}
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2 p-3 sm:p-0 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 sm:bg-transparent">
            <span className="text-xs uppercase font-semibold text-zinc-500 block">TM. BAN GIÁM ĐỐC CÔNG TY</span>
            <p className="text-[11px] sm:text-xs italic text-zinc-400">(Ký tên và đóng dấu ban hành)</p>
            <div className="h-12 sm:h-20 flex flex-col items-center justify-center">
              <span className="text-[11px] sm:text-xs font-bold text-red-600 dark:text-red-400 border-2 border-red-500/80 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md rotate-[-2deg] uppercase tracking-wider">
                ĐÃ PHÊ DUYỆT & BAN HÀNH
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

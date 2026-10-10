import React from "react";

interface CarrierLogoProps {
  carrierId: string;
  className?: string;
  size?: number;
}

export function CarrierLogo({ carrierId, className = "w-6 h-6", size = 28 }: CarrierLogoProps) {
  const id = carrierId.toLowerCase();

  // 1. SPX Express (Shopee Xpress) - Shopee Orange #EE4D2D
  if (id.includes("spx") || id.includes("shopee")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-lg shadow-2xs ${className}`}
      >
        <rect width="40" height="40" rx="9" fill="#EE4D2D" />
        {/* Túi Shopee & Chữ SPX */}
        <path
          d="M20 9C17.79 9 16 10.79 16 13V14.5H24V13C24 10.79 22.21 9 20 9ZM14 14.5V13C14 9.69 16.69 7 20 7C23.31 7 26 9.69 26 13V14.5H28.5C29.33 14.5 30 15.17 30 16L28.8 28.5C28.7 29.35 28 30 27.15 30H12.85C12 30 11.3 29.35 11.2 28.5L10 16C10 15.17 10.67 14.5 11.5 14.5H14Z"
          fill="white"
          fillOpacity="0.25"
        />
        {/* SPX Bold typography */}
        <text
          x="20"
          y="25"
          textAnchor="middle"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="13"
          letterSpacing="0.5"
          fontStyle="italic"
        >
          SPX
        </text>
        <text
          x="20"
          y="32"
          textAnchor="middle"
          fill="#FFF4E6"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="5.5"
          letterSpacing="1"
        >
          EXPRESS
        </text>
      </svg>
    );
  }

  // 2. GHN (Giao Hàng Nhanh) - Xanh dương #00467F & Cam #EA5328
  if (id.includes("ghn")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-lg shadow-2xs ${className}`}
      >
        <rect width="40" height="40" rx="9" fill="#00467F" />
        {/* Biểu tượng Hộp hàng 3D GHN với mũi tên cam tốc độ */}
        <path d="M20 7L31 13.5V26.5L20 33L9 26.5V13.5L20 7Z" fill="#005B9E" fillOpacity="0.4" />
        <path d="M20 7L31 13.5L20 20L9 13.5L20 7Z" fill="#0A72B9" />
        <path d="M9 13.5L20 20V33L9 26.5V13.5Z" fill="#004170" />
        <path d="M31 13.5L31 26.5L20 33V20L31 13.5Z" fill="#EA5328" />
        {/* Chữ GHN */}
        <text
          x="20"
          y="23"
          textAnchor="middle"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="11"
          letterSpacing="0.8"
        >
          GHN
        </text>
      </svg>
    );
  }

  // 3. GHTK (Giao Hàng Tiết Kiệm) - Xanh lá #009E54 & Vàng #FFBA00
  if (id.includes("ghtk")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-lg shadow-2xs ${className}`}
      >
        <rect width="40" height="40" rx="9" fill="#009E54" />
        {/* Biểu tượng Shipper chạy nhanh cầm kiện hàng vàng */}
        <circle cx="20" cy="11.5" r="3.2" fill="white" />
        {/* Kiện hàng vàng */}
        <rect x="23" y="16" width="6.5" height="6.5" rx="1.5" fill="#FFBA00" />
        <path
          d="M14 17L18.5 15L23 18.5V24L19 22L14 24V17Z"
          fill="white"
          fillOpacity="0.9"
        />
        {/* Chân chạy */}
        <path
          d="M17 23L13 29M20 23L23 29"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Chữ GHTK chân trang */}
        <text
          x="20"
          y="35"
          textAnchor="middle"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="7"
          letterSpacing="0.8"
        >
          GHTK
        </text>
      </svg>
    );
  }

  // 4. Viettel Post - Đỏ Viettel #EE0033
  if (id.includes("viettel") || id.includes("vtp")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-lg shadow-2xs ${className}`}
      >
        <rect width="40" height="40" rx="9" fill="#EE0033" />
        {/* Dấu ngoặc kép đặc trưng của Viettel */}
        <path
          d="M13 14C13 11.5 14.8 9.5 17 9.5V12C15.8 12 15 12.8 15 14H17.5V18H13V14ZM21.5 14C21.5 11.5 23.3 9.5 25.5 9.5V12C24.3 12 23.5 12.8 23.5 14H26V18H21.5V14Z"
          fill="white"
        />
        <text
          x="20"
          y="26"
          textAnchor="middle"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="8.5"
          letterSpacing="0.3"
        >
          VIETTEL
        </text>
        <text
          x="20"
          y="33"
          textAnchor="middle"
          fill="#FFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="6"
          letterSpacing="1"
        >
          POST
        </text>
      </svg>
    );
  }

  // 5. J&T Express - Đỏ J&T #E3001B
  if (id.includes("j&t") || id.includes("jt")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-lg shadow-2xs ${className}`}
      >
        <rect width="40" height="40" rx="9" fill="#E3001B" />
        {/* Logo J&T Express chữ nghiêng */}
        <text
          x="20"
          y="23"
          textAnchor="middle"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="13"
          fontStyle="italic"
          letterSpacing="0.5"
        >
          J&amp;T
        </text>
        {/* Mũi tên tốc độ gạch dưới */}
        <rect x="10" y="26.5" width="20" height="2" rx="1" fill="white" />
        <text
          x="20"
          y="34"
          textAnchor="middle"
          fill="#FFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="5"
          letterSpacing="1"
        >
          EXPRESS
        </text>
      </svg>
    );
  }

  // 6. Vietnam Post (VNPost) - Vàng #F9A01B & Xanh dương #004890
  if (id.includes("vnpost") || id.includes("vietnam post") || id.includes("bưu điện")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-lg shadow-2xs ${className}`}
      >
        <rect width="40" height="40" rx="9" fill="#004890" />
        {/* Chim bồ câu thư gấp giấy màu vàng của Bưu điện */}
        <path
          d="M12 20L20 10L28 20L20 16L12 20Z"
          fill="#F9A01B"
        />
        <path
          d="M20 16L28 20L24 23L20 16Z"
          fill="#E68A00"
        />
        <circle cx="20" cy="19" r="2" fill="white" />
        <text
          x="20"
          y="31"
          textAnchor="middle"
          fill="#F9A01B"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="7"
          letterSpacing="0.5"
        >
          VNPOST
        </text>
      </svg>
    );
  }

  // 7. GrabExpress - Grab Green #00B14F
  if (id.includes("grab")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-lg shadow-2xs ${className}`}
      >
        <rect width="40" height="40" rx="9" fill="#00B14F" />
        {/* Vòng đôi vô cực đặc trưng Grab & Chữ Grab */}
        <path
          d="M15 15C13.3 15 12 16.3 12 18C12 19.7 13.3 21 15 21C16.7 21 18 19.7 18 18V13"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M25 15C26.7 15 28 16.3 28 18C28 19.7 26.7 21 25 21C23.3 21 22 19.7 22 18V13"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="7.5"
          letterSpacing="0.3"
        >
          Grab
        </text>
        <text
          x="20"
          y="34"
          textAnchor="middle"
          fill="#D4FFDF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="5"
          letterSpacing="0.8"
        >
          EXPRESS
        </text>
      </svg>
    );
  }

  // 8. Ahamove - Cam #F47B20
  if (id.includes("ahamove")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-lg shadow-2xs ${className}`}
      >
        <rect width="40" height="40" rx="9" fill="#F47B20" />
        {/* Cánh chim / Vệt tốc độ Ahamove */}
        <path
          d="M12 15C15 12 25 13 28 16C24 18 18 17 12 15Z"
          fill="white"
        />
        <path
          d="M14 18C18 16 26 17 28 20C23 21 18 20 14 18Z"
          fill="#FFE8D6"
        />
        <circle cx="21" cy="22" r="2.5" fill="white" />
        <text
          x="20"
          y="32"
          textAnchor="middle"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="6.5"
          letterSpacing="0.4"
        >
          AHAMOVE
        </text>
      </svg>
    );
  }

  // 9. Tự giao hàng / Shipper nội bộ
  if (id.includes("internal") || id.includes("tự giao")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-lg shadow-2xs ${className}`}
      >
        <rect width="40" height="40" rx="9" fill="#10B981" />
        <path
          d="M20 10L28 15V25L20 30L12 25V15L20 10Z"
          fill="white"
          fillOpacity="0.2"
        />
        <path
          d="M20 10L28 15L20 20L12 15L20 10Z"
          fill="white"
          fillOpacity="0.9"
        />
        <path
          d="M12 15L20 20V30L12 25V15Z"
          fill="white"
          fillOpacity="0.7"
        />
        <path
          d="M28 15L20 20V30L28 25V15Z"
          fill="white"
          fillOpacity="0.8"
        />
      </svg>
    );
  }

  // 10. Chành xe / Bến xe
  if (id.includes("bus") || id.includes("chành xe")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 rounded-lg shadow-2xs ${className}`}
      >
        <rect width="40" height="40" rx="9" fill="#F59E0B" />
        {/* Xe tải / Xe khách */}
        <path
          d="M11 13C11 11.9 11.9 11 13 11H27C28.1 11 29 11.9 29 13V24H11V13Z"
          fill="white"
        />
        <path d="M13 13H27V18H13V13Z" fill="#F59E0B" fillOpacity="0.8" />
        <circle cx="15" cy="27" r="2.5" fill="white" />
        <circle cx="25" cy="27" r="2.5" fill="white" />
        <rect x="18" y="21" width="4" height="2" rx="0.5" fill="#F59E0B" />
      </svg>
    );
  }

  // Mặc định: Đối tác khác / Xe máy giao hàng
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 rounded-lg shadow-2xs ${className}`}
    >
      <rect width="40" height="40" rx="9" fill="#6366F1" />
      <path
        d="M13 25C14.6569 25 16 23.6569 16 22C16 20.3431 14.6569 19 13 19C11.3431 19 10 20.3431 10 22C10 23.6569 11.3431 25 13 25Z"
        fill="white"
      />
      <path
        d="M27 25C28.6569 25 30 23.6569 30 22C30 20.3431 28.6569 19 27 19C25.3431 19 24 20.3431 24 22C24 23.6569 25.3431 25 27 25Z"
        fill="white"
      />
      <path
        d="M13 22H18L21 16H25L27 22M20 16L18 12H15"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

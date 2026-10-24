export interface CustomerGroupConfig {
  key: string;
  label: string;
  prefix: string;
  category: string;
  badgeClass: string;
  bgLight: string;
  icon: string;
  colorName: string;
}

export const CUSTOMER_GROUP_CATEGORIES = [
  "Phân phối & Bán buôn",
  "Doanh nghiệp & B2B",
  "Khách VIP & Bán lẻ",
  "Kênh bán & Nguồn",
  "Quản trị & Cảnh báo",
] as const;

export const CUSTOMER_GROUPS: CustomerGroupConfig[] = [
  // 1. Phân phối & Bán buôn
  {
    key: "distributor",
    label: "Nhà phân phối (NPP)",
    prefix: "NPP",
    category: "Phân phối & Bán buôn",
    icon: "🚛",
    colorName: "amber",
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700",
    bgLight: "bg-amber-500",
  },
  {
    key: "wholesale_large",
    label: "Khách sỉ lớn / Tổng kho",
    prefix: "TONG",
    category: "Phân phối & Bán buôn",
    icon: "📦",
    colorName: "amber",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    bgLight: "bg-amber-500",
  },
  {
    key: "wholesale",
    label: "Khách sỉ",
    prefix: "SI",
    category: "Phân phối & Bán buôn",
    icon: "📦",
    colorName: "amber",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    bgLight: "bg-amber-500",
  },
  {
    key: "agent_1",
    label: "Đại lý cấp 1",
    prefix: "DL1",
    category: "Phân phối & Bán buôn",
    icon: "🏬",
    colorName: "purple",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    bgLight: "bg-purple-500",
  },
  {
    key: "agent_2",
    label: "Đại lý cấp 2",
    prefix: "DL2",
    category: "Phân phối & Bán buôn",
    icon: "🏪",
    colorName: "purple",
    badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    bgLight: "bg-purple-400",
  },
  {
    key: "ctv",
    label: "Cộng tác viên / Dropship",
    prefix: "CTV",
    category: "Phân phối & Bán buôn",
    icon: "🤝",
    colorName: "emerald",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    bgLight: "bg-emerald-500",
  },

  // 2. Doanh nghiệp & B2B
  {
    key: "b2b",
    label: "Doanh nghiệp (B2B)",
    prefix: "B2B",
    category: "Doanh nghiệp & B2B",
    icon: "🏢",
    colorName: "blue",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    bgLight: "bg-blue-500",
  },
  {
    key: "project",
    label: "Khách dự án / Thầu",
    prefix: "DA",
    category: "Doanh nghiệp & B2B",
    icon: "📑",
    colorName: "blue",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-700",
    bgLight: "bg-sky-500",
  },
  {
    key: "partner",
    label: "Đối tác chiến lược",
    prefix: "DT",
    category: "Doanh nghiệp & B2B",
    icon: "💎",
    colorName: "indigo",
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700",
    bgLight: "bg-indigo-500",
  },
  {
    key: "cross_partner",
    label: "Đối tác chéo / NCC",
    prefix: "NCC",
    category: "Doanh nghiệp & B2B",
    icon: "🏭",
    colorName: "teal",
    badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-700",
    bgLight: "bg-teal-500",
  },

  // 3. Khách VIP & Bán lẻ
  {
    key: "vip_diamond",
    label: "VIP Kim Cương",
    prefix: "KC",
    category: "Khách VIP & Bán lẻ",
    icon: "💎",
    colorName: "purple",
    badgeClass: "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 dark:from-purple-950/80 dark:to-pink-950/80 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-bold",
    bgLight: "bg-purple-600",
  },
  {
    key: "vip_gold",
    label: "VIP Vàng",
    prefix: "VANG",
    category: "Khách VIP & Bán lẻ",
    icon: "🥇",
    colorName: "amber",
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold",
    bgLight: "bg-amber-500",
  },
  {
    key: "vip_silver",
    label: "VIP Bạc",
    prefix: "BAC",
    category: "Khách VIP & Bán lẻ",
    icon: "🥈",
    colorName: "slate",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 font-bold",
    bgLight: "bg-slate-500",
  },
  {
    key: "loyal",
    label: "Khách thân thiết / Khách quen",
    prefix: "TT",
    category: "Khách VIP & Bán lẻ",
    icon: "⭐",
    colorName: "rose",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700",
    bgLight: "bg-rose-500",
  },
  {
    key: "potential",
    label: "Khách tiềm năng",
    prefix: "TN",
    category: "Khách VIP & Bán lẻ",
    icon: "🎯",
    colorName: "cyan",
    badgeClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700",
    bgLight: "bg-cyan-500",
  },
  {
    key: "new_customer",
    label: "Khách mới mua lần đầu",
    prefix: "NEW",
    category: "Khách VIP & Bán lẻ",
    icon: "🆕",
    colorName: "green",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300 border-green-300 dark:border-green-700",
    bgLight: "bg-green-500",
  },

  // 4. Kênh bán & Nguồn
  {
    key: "ecommerce",
    label: "Khách Sàn TMĐT (Shopee/TikTok)",
    prefix: "TMDT",
    category: "Kênh bán & Nguồn",
    icon: "🛒",
    colorName: "orange",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300 dark:border-orange-700",
    bgLight: "bg-orange-500",
  },
  {
    key: "online",
    label: "Khách Online (Web/FB/Zalo)",
    prefix: "ONL",
    category: "Kênh bán & Nguồn",
    icon: "🌐",
    colorName: "blue",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    bgLight: "bg-blue-500",
  },
  {
    key: "store",
    label: "Khách mua tại Showroom",
    prefix: "CH",
    category: "Kênh bán & Nguồn",
    icon: "🛍️",
    colorName: "violet",
    badgeClass: "bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300 border-violet-300 dark:border-violet-700",
    bgLight: "bg-violet-500",
  },
  {
    key: "kol",
    label: "KOL / KOC / Influencer",
    prefix: "KOL",
    category: "Kênh bán & Nguồn",
    icon: "🎬",
    colorName: "pink",
    badgeClass: "bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300 border-pink-300 dark:border-pink-700",
    bgLight: "bg-pink-500",
  },

  // 5. Quản trị & Cảnh báo
  {
    key: "internal",
    label: "Khách nội bộ / Nhân viên",
    prefix: "NB",
    category: "Quản trị & Cảnh báo",
    icon: "👥",
    colorName: "indigo",
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700",
    bgLight: "bg-indigo-500",
  },
  {
    key: "debt_watch",
    label: "Công nợ cần theo dõi",
    prefix: "NO",
    category: "Quản trị & Cảnh báo",
    icon: "⚠️",
    colorName: "red",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-bold",
    bgLight: "bg-rose-500",
  },
  {
    key: "care_special",
    label: "Cần chăm sóc đặc biệt",
    prefix: "CS",
    category: "Quản trị & Cảnh báo",
    icon: "💬",
    colorName: "yellow",
    badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
    bgLight: "bg-yellow-500",
  },
  {
    key: "inactive",
    label: "Tạm ngưng / Chưa quay lại",
    prefix: "OFF",
    category: "Quản trị & Cảnh báo",
    icon: "💤",
    colorName: "zinc",
    badgeClass: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700",
    bgLight: "bg-zinc-400",
  },
  {
    key: "other",
    label: "Nhóm khác",
    prefix: "KH",
    category: "Quản trị & Cảnh báo",
    icon: "🏷️",
    colorName: "zinc",
    badgeClass: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700",
    bgLight: "bg-zinc-500",
  },
];

export function getCustomerGroupConfig(groupKey?: string | null): CustomerGroupConfig | null {
  if (!groupKey) return null;
  const found = CUSTOMER_GROUPS.find(
    (g) =>
      g.key.toLowerCase() === groupKey.toLowerCase() ||
      g.label.toLowerCase() === groupKey.toLowerCase()
  );
  if (found) return found;

  // Custom user-defined group fallback
  return {
    key: groupKey,
    label: groupKey,
    prefix: "KH",
    category: "Tùy chỉnh",
    icon: "🏷️",
    colorName: "zinc",
    badgeClass: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
    bgLight: "bg-zinc-500",
  };
}

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel, MongoShopeeProductModel } from "@/server/db/schema";
import { ApiResponse } from "@/types";

export interface ChannelItem {
  channelKey: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
  revenue: number;
  revenuePercentage: number;
  color: string;
  badgeClass: string;
}

export interface ShopeeDashboardStats {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    deliveredOrders: number;
    deliveredRevenue: number;
    deliveredRate: number;
    processingOrders: number;
    cancelledOrders: number;
    totalProducts: number;
    inStockProducts: number;
    outOfStockProducts: number;
    totalStock: number;
    totalSales30d: number;
  };
  channelBreakdown: ChannelItem[];
  orderStatusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
    totalRevenue: number;
    color: string;
  }>;
  shippingBreakdown: Array<{
    carrier: string;
    count: number;
    percentage: number;
  }>;
  paymentBreakdown: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
  productPriceBreakdown: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  topSellingProducts: Array<{
    id: string;
    name: string;
    sales_30d: number;
    stock: number;
    price_min: number;
    price_display: string;
    image: string;
  }>;
}

function getChannelMeta(shopUsername?: string) {
  const s = (shopUsername || "").toLowerCase();
  if (s.includes("shopee")) {
    return {
      channelKey: "shopee",
      label: "Shopee (Sapo)",
      icon: "🟠",
      color: "#f97316",
      badgeClass: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    };
  }
  if (s.includes("tiktok")) {
    return {
      channelKey: "tiktok",
      label: "TikTok Shop",
      icon: "🎵",
      color: "#ec4899",
      badgeClass: "bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800",
    };
  }
  if (s.includes("lazada")) {
    return {
      channelKey: "lazada",
      label: "Lazada",
      icon: "🔵",
      color: "#0ea5e9",
      badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    };
  }
  if (s.includes("pos") || s.includes("admin")) {
    return {
      channelKey: "pos",
      label: "Tại quầy (POS)",
      icon: "🟢",
      color: "#10b981",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    };
  }
  if (s.includes("zalo")) {
    return {
      channelKey: "zalo",
      label: "Zalo Chat",
      icon: "💬",
      color: "#3b82f6",
      badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    };
  }
  if (s.includes("facebook") || s.includes("fb")) {
    return {
      channelKey: "facebook",
      label: "Facebook",
      icon: "📘",
      color: "#6366f1",
      badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    };
  }
  if (s.includes("ctv")) {
    return {
      channelKey: "ctv",
      label: "Cộng Tác Viên",
      icon: "🤝",
      color: "#a855f7",
      badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    };
  }
  if (s.includes("web")) {
    return {
      channelKey: "web",
      label: "Website Sapo",
      icon: "🌐",
      color: "#8b5cf6",
      badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    };
  }
  return {
    channelKey: "other",
    label: "Kênh Khác",
    icon: "🏪",
    color: "#71717a",
    badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  };
}

// In-memory cache for Shopee/Omnichannel stats (TTL 45 seconds)
let cachedShopeeStats: {
  data: ShopeeDashboardStats;
  timestamp: number;
} | null = null;
const CACHE_TTL_MS = 45 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedShopeeStats && now - cachedShopeeStats.timestamp < CACHE_TTL_MS) {
      return NextResponse.json<ApiResponse<ShopeeDashboardStats>>(
        {
          success: true,
          data: cachedShopeeStats.data,
          message: "Tải thống kê Đa kênh & Shopee dashboard thành công (cache)",
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
          },
        }
      );
    }

    await connectToDatabase();

    // 1. Lấy dữ liệu thống kê Đơn Hàng Đa Kênh
    const [
      totalOrders,
      orderStatusesAgg,
      channelsAgg,
      shippingAgg,
      paymentAgg,
    ] = await Promise.all([
      MongoShopeeOrderModel.countDocuments(),
      MongoShopeeOrderModel.aggregate([
        {
          $group: {
            _id: "$order_status",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$total_amount" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      MongoShopeeOrderModel.aggregate([
        {
          $group: {
            _id: "$shop_username",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$total_amount" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      MongoShopeeOrderModel.aggregate([
        {
          $group: {
            _id: "$shipping_carrier",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      MongoShopeeOrderModel.aggregate([
        {
          $group: {
            _id: "$payment_method",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    // Tổng doanh thu từ tất cả các đơn hàng
    let totalRevenue = 0;
    let deliveredOrders = 0;
    let deliveredRevenue = 0;
    let processingOrders = 0;
    let cancelledOrders = 0;

    // Chuẩn hóa trạng thái đơn hàng (Khớp với trang Đơn Hàng Đa Kênh)
    const normalizedStatusMap: Record<string, { count: number; revenue: number; color: string }> = {
      "Đã giao": { count: 0, revenue: 0, color: "#10b981" },
      "Chờ xử lý": { count: 0, revenue: 0, color: "#f97316" },
      "Đang giao": { count: 0, revenue: 0, color: "#3b82f6" },
      "Đã hủy": { count: 0, revenue: 0, color: "#ef4444" },
      "Trả hàng/Hoàn tiền": { count: 0, revenue: 0, color: "#ec4899" },
    };

    for (const item of orderStatusesAgg) {
      const rawStatus = (item._id || "Chờ xử lý").trim();
      const count = Number(item.count) || 0;
      const rev = Number(item.totalRevenue) || 0;
      totalRevenue += rev;

      const lower = rawStatus.toLowerCase();
      if (lower.includes("đã giao") || lower.includes("thanh toán") || lower.includes("hoàn tất") || lower.includes("closed")) {
        normalizedStatusMap["Đã giao"].count += count;
        normalizedStatusMap["Đã giao"].revenue += rev;
        deliveredOrders += count;
        deliveredRevenue += rev;
      } else if (lower.includes("hủy") || lower.includes("cancelled")) {
        normalizedStatusMap["Đã hủy"].count += count;
        normalizedStatusMap["Đã hủy"].revenue += rev;
        cancelledOrders += count;
      } else if (lower.includes("đang giao") || lower.includes("đvvc") || lower.includes("vận chuyển")) {
        normalizedStatusMap["Đang giao"].count += count;
        normalizedStatusMap["Đang giao"].revenue += rev;
      } else if (lower.includes("trả") || lower.includes("hoàn")) {
        normalizedStatusMap["Trả hàng/Hoàn tiền"].count += count;
        normalizedStatusMap["Trả hàng/Hoàn tiền"].revenue += rev;
      } else {
        normalizedStatusMap["Chờ xử lý"].count += count;
        normalizedStatusMap["Chờ xử lý"].revenue += rev;
        processingOrders += count;
      }
    }

    const orderStatusBreakdown = Object.entries(normalizedStatusMap)
      .filter(([_, val]) => val.count > 0)
      .map(([status, val]) => ({
        status,
        count: val.count,
        percentage: totalOrders > 0 ? Math.round((val.count / totalOrders) * 100) : 0,
        totalRevenue: val.revenue,
        color: val.color,
      }))
      .sort((a, b) => b.count - a.count);

    // Chuẩn hóa phân bổ Kênh Bán Hàng Đa Kênh (Omnichannel)
    const channelAggMap: Record<string, { count: number; revenue: number; meta: ReturnType<typeof getChannelMeta> }> = {};

    for (const c of channelsAgg) {
      const rawShop = c._id || "sapo_other";
      const meta = getChannelMeta(rawShop);
      const count = Number(c.count) || 0;
      const rev = Number(c.totalRevenue) || 0;

      if (!channelAggMap[meta.channelKey]) {
        channelAggMap[meta.channelKey] = { count: 0, revenue: 0, meta };
      }
      channelAggMap[meta.channelKey].count += count;
      channelAggMap[meta.channelKey].revenue += rev;
    }

    const channelBreakdown: ChannelItem[] = Object.values(channelAggMap)
      .map((item) => ({
        channelKey: item.meta.channelKey,
        label: item.meta.label,
        icon: item.meta.icon,
        count: item.count,
        percentage: totalOrders > 0 ? Math.round((item.count / totalOrders) * 100) : 0,
        revenue: item.revenue,
        revenuePercentage: totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0,
        color: item.meta.color,
        badgeClass: item.meta.badgeClass,
      }))
      .sort((a, b) => b.count - a.count);

    // Đơn vị vận chuyển
    const shippingBreakdown = shippingAgg.map((item) => {
      const rawCarrier = item._id || "Chưa xác định";
      const carrier = rawCarrier
        .replace(/^Nhanh\s*-\s*/i, "")
        .replace(/^Hỏa Tốc\s*-\s*/i, "")
        .replace(/^Hàng Cồng Kềnh\s*-\s*/i, "")
        .replace(/^Trong Ngày\s*-\s*/i, "");

      const count = Number(item.count) || 0;
      return {
        carrier: carrier.trim() || rawCarrier,
        count,
        percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
      };
    });

    // Hình thức thanh toán
    const paymentBreakdown = paymentAgg.map((item) => {
      const rawMethod = item._id || "Chưa rõ";
      let method = rawMethod;
      if (rawMethod.toLowerCase().includes("tiền mặt") || rawMethod.toLowerCase().includes("thu hộ") || rawMethod.toLowerCase().includes("cod")) {
        method = "COD (Tiền mặt)";
      } else if (rawMethod.toLowerCase().includes("chuyển khoản") || rawMethod.toLowerCase().includes("ngân hàng")) {
        method = "Chuyển khoản";
      } else if (rawMethod.toLowerCase().includes("spaylater")) {
        method = "SPayLater";
      } else if (rawMethod.toLowerCase().includes("shopeepay")) {
        method = "Ví ShopeePay";
      } else if (rawMethod.toLowerCase().includes("thẻ") || rawMethod.toLowerCase().includes("tín dụng")) {
        method = "Thẻ Tín Dụng";
      }

      const count = Number(item.count) || 0;
      return {
        method,
        count,
        percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
      };
    });

    // 2. Lấy dữ liệu thống kê Sản Phẩm & Lượng bán thực tế từ Đơn Hàng
    const nowDate = new Date();
    const d30 = new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalProducts,
      inStockProducts,
      outOfStockProducts,
      allProductsData,
      topOrdersAgg30d,
      totalSales30dAgg,
    ] = await Promise.all([
      MongoShopeeProductModel.countDocuments(),
      MongoShopeeProductModel.countDocuments({ stock: { $gt: 0 } }),
      MongoShopeeProductModel.countDocuments({ stock: { $lte: 0 } }),
      MongoShopeeProductModel.find({}).select("stock price_min").lean(),
      MongoShopeeOrderModel.aggregate([
        {
          $match: {
            order_status: { $nin: ["Đã hủy", "cancelled", "Hủy", "cancelled_order", "Cancelled"] },
            createdAt: { $gte: d30 },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product_name",
            totalQty: { $sum: "$items.quantity" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalQty: -1 } },
        { $limit: 6 },
      ]),
      MongoShopeeOrderModel.aggregate([
        {
          $match: {
            order_status: { $nin: ["Đã hủy", "cancelled", "Hủy", "cancelled_order", "Cancelled"] },
            createdAt: { $gte: d30 },
          },
        },
        { $unwind: "$items" },
        { $group: { _id: null, totalQty: { $sum: "$items.quantity" } } },
      ]),
    ]);

    let totalSales30d = totalSales30dAgg[0]?.totalQty || 0;
    let effectiveTopItems = topOrdersAgg30d;

    // Dự phòng: Nếu 30 ngày qua chưa có đơn, lấy top bán chạy toàn thời gian
    if (effectiveTopItems.length === 0) {
      effectiveTopItems = await MongoShopeeOrderModel.aggregate([
        {
          $match: {
            order_status: { $nin: ["Đã hủy", "cancelled", "Hủy", "cancelled_order", "Cancelled"] },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product_name",
            totalQty: { $sum: "$items.quantity" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalQty: -1 } },
        { $limit: 6 },
      ]);
      const allQtyAgg = await MongoShopeeOrderModel.aggregate([
        {
          $match: {
            order_status: { $nin: ["Đã hủy", "cancelled", "Hủy", "cancelled_order", "Cancelled"] },
          },
        },
        { $unwind: "$items" },
        { $group: { _id: null, totalQty: { $sum: "$items.quantity" } } },
      ]);
      totalSales30d = allQtyAgg[0]?.totalQty || 0;
    }

    // Tra cứu thông tin hình ảnh, tồn kho, giá của các sản phẩm bán chạy từ bảng sản phẩm
    const topItemNames = effectiveTopItems.map((item) => item._id);
    const matchedProducts = await MongoShopeeProductModel.find({
      name: { $in: topItemNames },
    }).lean();

    const productMap = new Map<string, any>();
    matchedProducts.forEach((p: any) => {
      productMap.set(p.name, p);
    });

    const topSellingProducts = await Promise.all(
      effectiveTopItems.slice(0, 5).map(async (item) => {
        let pDoc = productMap.get(item._id);
        if (!pDoc) {
          try {
            const prefix = item._id.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            pDoc = await MongoShopeeProductModel.findOne({
              name: new RegExp(prefix, "i"),
            }).lean();
          } catch {
            pDoc = null;
          }
        }

        const priceMin = pDoc?.price_min ?? 0;
        const priceDisplay =
          pDoc?.price_display || (priceMin > 0 ? `₫${Number(priceMin).toLocaleString("vi-VN")}` : "--");

        return {
          id: pDoc?.item_id || String(pDoc?._id || item._id),
          name: item._id,
          sales_30d: item.totalQty,
          stock: pDoc?.stock ?? 0,
          price_min: priceMin,
          price_display: priceDisplay,
          image: pDoc?.image || "",
        };
      })
    );

    let totalStock = 0;
    let tierUnder50k = 0;
    let tier50kTo150k = 0;
    let tier150kTo300k = 0;
    let tierAbove300k = 0;

    for (const p of allProductsData) {
      totalStock += p.stock || 0;

      const price = p.price_min || 0;
      if (price < 50000) {
        tierUnder50k++;
      } else if (price < 150000) {
        tier50kTo150k++;
      } else if (price < 300000) {
        tier150kTo300k++;
      } else {
        tierAbove300k++;
      }
    }

    const productPriceBreakdown = [
      {
        range: "< 50.000₫",
        count: tierUnder50k,
        percentage: totalProducts > 0 ? Math.round((tierUnder50k / totalProducts) * 100) : 0,
      },
      {
        range: "50k - 150.000₫",
        count: tier50kTo150k,
        percentage: totalProducts > 0 ? Math.round((tier50kTo150k / totalProducts) * 100) : 0,
      },
      {
        range: "150k - 300.000₫",
        count: tier150kTo300k,
        percentage: totalProducts > 0 ? Math.round((tier150kTo300k / totalProducts) * 100) : 0,
      },
      {
        range: "> 300.000₫",
        count: tierAbove300k,
        percentage: totalProducts > 0 ? Math.round((tierAbove300k / totalProducts) * 100) : 0,
      },
    ];

    const deliveredRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const responseData: ShopeeDashboardStats = {
      summary: {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        deliveredOrders,
        deliveredRevenue,
        deliveredRate,
        processingOrders,
        cancelledOrders,
        totalProducts,
        inStockProducts,
        outOfStockProducts,
        totalStock,
        totalSales30d,
      },
      channelBreakdown,
      orderStatusBreakdown,
      shippingBreakdown,
      paymentBreakdown,
      productPriceBreakdown,
      topSellingProducts,
    };

    // Lưu vào in-memory cache
    cachedShopeeStats = {
      data: responseData,
      timestamp: Date.now(),
    };

    return NextResponse.json<ApiResponse<ShopeeDashboardStats>>(
      {
        success: true,
        data: responseData,
        message: "Tải thống kê Đa kênh & Shopee dashboard thành công",
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
        },
      }
    );
  } catch (error: any) {
    console.error("[Shopee Dashboard Stats API] Lỗi:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: "Không thể tổng hợp dữ liệu thống kê",
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

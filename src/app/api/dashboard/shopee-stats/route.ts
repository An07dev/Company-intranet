import { NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel, MongoShopeeProductModel } from "@/server/db/schema";
import { ApiResponse } from "@/types";

export interface ShopeeDashboardStats {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    inStockProducts: number;
    outOfStockProducts: number;
    totalStock: number;
    totalSales30d: number;
  };
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

const STATUS_COLOR_MAP: Record<string, string> = {
  "Đã giao": "#10b981", // Emerald
  "Đã nhận được hàng": "#06b6d4", // Cyan
  "Đang giao": "#3b82f6", // Blue
  "Đã giao cho ĐVVC": "#6366f1", // Indigo
  "Chờ lấy hàng": "#f59e0b", // Amber
  "Chờ xác nhận": "#eab308", // Yellow
  "Chờ xử lý": "#f97316", // Orange
  "Đã hủy": "#ef4444", // Red/Rose
  "Trả hàng/Hoàn tiền": "#ec4899", // Pink
};

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Lấy dữ liệu thống kê Đơn Hàng
    const [
      totalOrders,
      orderStatusesAgg,
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
    const orderStatusBreakdown = orderStatusesAgg.map((item, idx) => {
      const statusName = item._id || "Chờ xử lý";
      const count = Number(item.count) || 0;
      const revenue = Number(item.totalRevenue) || 0;
      totalRevenue += revenue;

      const fallbackColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
      const color = STATUS_COLOR_MAP[statusName] || fallbackColors[idx % fallbackColors.length];

      return {
        status: statusName,
        count,
        percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
        totalRevenue: revenue,
        color,
      };
    });

    const shippingBreakdown = shippingAgg.map((item) => {
      const rawCarrier = item._id || "Chưa xác định";
      // Làm ngắn tên đơn vị vận chuyển để hiển thị gọn đẹp
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

    const paymentBreakdown = paymentAgg.map((item) => {
      const rawMethod = item._id || "Chưa rõ";
      let method = rawMethod;
      if (rawMethod.toLowerCase().includes("thanh toán khi nhận hàng")) method = "COD";
      else if (rawMethod.toLowerCase().includes("ngân hàng")) method = "TK Ngân hàng";
      else if (rawMethod.toLowerCase().includes("tín dụng")) method = "Thẻ Tín Dụng";

      const count = Number(item.count) || 0;
      return {
        method,
        count,
        percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
      };
    });

    // 2. Lấy dữ liệu thống kê Sản Phẩm
    const [
      totalProducts,
      inStockProducts,
      outOfStockProducts,
      allProductsData,
      topSellingDocs,
    ] = await Promise.all([
      MongoShopeeProductModel.countDocuments(),
      MongoShopeeProductModel.countDocuments({ stock: { $gt: 0 } }),
      MongoShopeeProductModel.countDocuments({ stock: { $lte: 0 } }),
      MongoShopeeProductModel.find({}).select("stock sales_30d price_min").lean(),
      MongoShopeeProductModel.find({})
        .sort({ sales_30d: -1, stock: -1 })
        .limit(5)
        .select("item_id name sales_30d stock price_min price_display image")
        .lean(),
    ]);

    let totalStock = 0;
    let totalSales30d = 0;

    let tierUnder50k = 0;
    let tier50kTo150k = 0;
    let tier150kTo300k = 0;
    let tierAbove300k = 0;

    for (const p of allProductsData) {
      totalStock += p.stock || 0;
      totalSales30d += p.sales_30d || 0;

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

    const topSellingProducts = topSellingDocs.map((doc: any) => ({
      id: doc.item_id || String(doc._id),
      name: doc.name || "Sản phẩm Shopee",
      sales_30d: doc.sales_30d || 0,
      stock: doc.stock || 0,
      price_min: doc.price_min || 0,
      price_display: doc.price_display || (doc.price_min ? `₫${Number(doc.price_min).toLocaleString("vi-VN")}` : "--"),
      image: doc.image || "",
    }));

    const responseData: ShopeeDashboardStats = {
      summary: {
        totalOrders,
        totalRevenue,
        totalProducts,
        inStockProducts,
        outOfStockProducts,
        totalStock,
        totalSales30d,
      },
      orderStatusBreakdown,
      shippingBreakdown,
      paymentBreakdown,
      productPriceBreakdown,
      topSellingProducts,
    };

    return NextResponse.json<ApiResponse<ShopeeDashboardStats>>({
      success: true,
      data: responseData,
      message: "Tải thống kê Shopee dashboard thành công",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Shopee Dashboard Stats API] Lỗi:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: "Không thể tổng hợp dữ liệu thống kê Shopee",
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

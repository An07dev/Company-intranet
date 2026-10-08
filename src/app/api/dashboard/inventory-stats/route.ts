import { NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeProductModel } from "@/server/db/schema";
import { ApiResponse } from "@/types";

export interface InventoryDashboardStats {
  summary: {
    totalProducts: number;
    totalStock: number;
    estimatedTotalValue: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    inStockRate: number;
    totalVariations: number;
  };
  stockHealthBreakdown: Array<{
    status: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
    description: string;
  }>;
  priceBreakdown: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  topStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    price: number;
    priceDisplay: string;
    image: string;
    sku?: string;
  }>;
  topValueProducts: Array<{
    id: string;
    name: string;
    stock: number;
    price: number;
    totalValue: number;
    totalValueDisplay: string;
    image: string;
  }>;
  branch: {
    name: string;
    code: string;
    address: string;
    totalProducts: number;
    stockShare: number;
  };
}

// In-memory cache for Inventory stats (TTL 45 seconds)
let cachedInventoryStats: {
  data: InventoryDashboardStats;
  timestamp: number;
} | null = null;
const CACHE_TTL_MS = 45 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedInventoryStats && now - cachedInventoryStats.timestamp < CACHE_TTL_MS) {
      return NextResponse.json<ApiResponse<InventoryDashboardStats>>(
        {
          success: true,
          data: cachedInventoryStats.data,
          message: "Tải thống kê kho hàng thành công (cache)",
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

    const [
      totalProducts,
      inStockCount,
      outOfStockCount,
      lowStockCount,
      allProducts,
      topStockDocs,
    ] = await Promise.all([
      MongoShopeeProductModel.countDocuments(),
      MongoShopeeProductModel.countDocuments({ stock: { $gt: 0 } }),
      MongoShopeeProductModel.countDocuments({ stock: { $lte: 0 } }),
      MongoShopeeProductModel.countDocuments({ stock: { $gt: 0, $lte: 10 } }),
      MongoShopeeProductModel.find({}).select("item_id name stock price_min price_max price_display variations image").lean(),
      MongoShopeeProductModel.find({ stock: { $gt: 0 } })
        .sort({ stock: -1 })
        .limit(6)
        .select("item_id name stock price_min price_display image variations")
        .lean(),
    ]);

    let totalStock = 0;
    let estimatedTotalValue = 0;
    let totalVariations = 0;

    let tierUnder50k = 0;
    let tier50kTo150k = 0;
    let tier150kTo300k = 0;
    let tierAbove300k = 0;

    // Tính toán theo từng sản phẩm
    const productsWithValue: Array<{
      id: string;
      name: string;
      stock: number;
      price: number;
      totalValue: number;
      image: string;
    }> = [];

    for (const p of allProducts) {
      const stock = Number(p.stock) || 0;
      const price = Number(p.price_min) || 0;
      const val = stock * price;

      totalStock += stock;
      estimatedTotalValue += val;
      totalVariations += (p.variations || []).length || 1;

      if (price < 50000) tierUnder50k++;
      else if (price < 150000) tier50kTo150k++;
      else if (price < 300000) tier150kTo300k++;
      else tierAbove300k++;

      if (stock > 0 && price > 0) {
        productsWithValue.push({
          id: p.item_id || String(p._id),
          name: p.name || "Sản phẩm",
          stock,
          price,
          totalValue: val,
          image: p.image || "",
        });
      }
    }

    // Top sản phẩm có tổng giá trị hàng tồn cao nhất
    productsWithValue.sort((a, b) => b.totalValue - a.totalValue);
    const topValueProducts = productsWithValue.slice(0, 6).map((item) => ({
      id: item.id,
      name: item.name,
      stock: item.stock,
      price: item.price,
      totalValue: item.totalValue,
      totalValueDisplay: `₫${item.totalValue.toLocaleString("vi-VN")}`,
      image: item.image,
    }));

    const safeStockCount = Math.max(0, inStockCount - lowStockCount);
    const inStockRate = totalProducts > 0 ? Math.round((inStockCount / totalProducts) * 100) : 0;

    const stockHealthBreakdown = [
      {
        status: "safe",
        label: "An toàn (>10 sp)",
        count: safeStockCount,
        percentage: totalProducts > 0 ? Math.round((safeStockCount / totalProducts) * 100) : 0,
        color: "#10b981", // Emerald
        description: "Lượng hàng dồi dào, sẵn sàng phục vụ đơn tức thì",
      },
      {
        status: "low",
        label: "Sắp hết (1-10 sp)",
        count: lowStockCount,
        percentage: totalProducts > 0 ? Math.round((lowStockCount / totalProducts) * 100) : 0,
        color: "#f59e0b", // Amber
        description: "Tồn kho dưới ngưỡng an toàn, cần lên kế hoạch nhập",
      },
      {
        status: "out",
        label: "Hết hàng (0 sp)",
        count: outOfStockCount,
        percentage: totalProducts > 0 ? Math.round((outOfStockCount / totalProducts) * 100) : 0,
        color: "#ef4444", // Rose
        description: "Đã cạn kho, cần nhập hàng gấp để tránh hụt doanh số",
      },
    ];

    const priceBreakdown = [
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

    const topStockProducts = topStockDocs.map((doc: any) => ({
      id: doc.item_id || String(doc._id),
      name: doc.name || "Sản phẩm kho",
      stock: doc.stock || 0,
      price: doc.price_min || 0,
      priceDisplay: doc.price_display || `₫${Number(doc.price_min || 0).toLocaleString("vi-VN")}`,
      image: doc.image || "",
      sku: doc.variations?.[0]?.sku || "",
    }));

    const responseData: InventoryDashboardStats = {
      summary: {
        totalProducts,
        totalStock,
        estimatedTotalValue,
        inStockCount,
        lowStockCount,
        outOfStockCount,
        inStockRate,
        totalVariations,
      },
      stockHealthBreakdown,
      priceBreakdown,
      topStockProducts,
      topValueProducts,
      branch: {
        name: "Kho Tổng Yến Sen",
        code: "KHO-TONG-01",
        address: "Lô J, Chung cư Bình Khánh, An Phú, TP. Thủ Đức, TP.HCM",
        totalProducts,
        stockShare: 100,
      },
    };

    // Lưu vào in-memory cache
    cachedInventoryStats = {
      data: responseData,
      timestamp: Date.now(),
    };

    return NextResponse.json<ApiResponse<InventoryDashboardStats>>(
      {
        success: true,
        data: responseData,
        message: "Tải thống kê kho hàng thành công",
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
        },
      }
    );
  } catch (error: any) {
    console.error("[Inventory Dashboard Stats API] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: "Không thể tổng hợp dữ liệu thống kê kho hàng",
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

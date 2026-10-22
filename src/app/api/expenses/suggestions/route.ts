import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import {
  MongoShopeeProductModel,
  MongoSapoReceiveInventoryModel,
} from "@/server/db/schema";
import { RestockSuggestion, RestockProposalsSummary } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const urgencyFilter = searchParams.get("urgency") || "all";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const supplierFilter = (searchParams.get("supplier") || "").trim().toLowerCase();

    // 1. Lấy dữ liệu sản phẩm kho và các đơn nhập kho gần nhất
    const [products, receiveOrders] = await Promise.all([
      MongoShopeeProductModel.find({}).lean(),
      MongoSapoReceiveInventoryModel.find({ status: { $ne: "cancelled" } })
        .sort({ received_on: -1, created_on: -1 })
        .lean(),
    ]);

    // 2. Lập bảng tra cứu lịch sử giá nhập và Nhà cung cấp theo SKU và Tên sản phẩm
    const priceHistoryMap = new Map<
      string,
      {
        price: number;
        supplier: string;
        supplier_id?: number;
        date: string;
        sku?: string;
        name: string;
      }
    >();

    for (const ro of receiveOrders) {
      if (!ro.line_items || !Array.isArray(ro.line_items)) continue;

      for (const item of ro.line_items) {
        const itemSku = (item.sku || "").trim().toLowerCase();
        const itemName = (item.name || "").trim().toLowerCase();
        const price = Number(item.price || 0);

        if (price <= 0) continue;

        const info = {
          price,
          supplier: ro.supplier_name || "Nhà cung cấp quen thuộc",
          supplier_id: ro.supplier_id,
          date: ro.received_on || ro.created_on,
          sku: item.sku,
          name: item.name,
        };

        if (itemSku && !priceHistoryMap.has(`sku:${itemSku}`)) {
          priceHistoryMap.set(`sku:${itemSku}`, info);
        }
        if (itemName && !priceHistoryMap.has(`name:${itemName}`)) {
          priceHistoryMap.set(`name:${itemName}`, info);
        }
      }
    }

    // 3. Phân tích & Tạo danh sách đề xuất nhập hàng (Restock Proposals)
    const suggestions: RestockSuggestion[] = [];
    let criticalCount = 0;
    let warningCount = 0;
    let reorderCount = 0;
    let totalEstimatedBudget = 0;

    for (const p of products) {
      const pSku = (p.parent_sku || "").trim().toLowerCase();
      const pName = (p.name || "").trim().toLowerCase();

      // Tra cứu giá nhập quá khứ
      const hist =
        priceHistoryMap.get(`sku:${pSku}`) ||
        priceHistoryMap.get(`name:${pName}`);

      const currentStock = Number(p.stock ?? 0);
      const sales30d = Number(p.sales_30d ?? 0);
      const dailyVelocity = sales30d > 0 ? Number((sales30d / 30).toFixed(2)) : 0;
      const daysRemaining =
        dailyVelocity > 0
          ? Number((Math.max(0, currentStock) / dailyVelocity).toFixed(1))
          : currentStock <= 0
          ? 0
          : 999;

      // Xác định mức độ khẩn cấp (Urgency)
      let urgency: "critical" | "warning" | "reorder" | null = null;
      let reason = "";

      if (currentStock <= 0 || (daysRemaining <= 5 && sales30d > 0)) {
        urgency = "critical";
        reason =
          currentStock <= 0
            ? "Đã hết hàng hoàn toàn trong kho, cần nhập gấp để duy trì bán hàng!"
            : `Hàng sắp hết! Tồn chỉ còn đủ bán trong khoảng ${Math.round(daysRemaining)} ngày tới.`;
      } else if (
        (currentStock <= 15 && currentStock > 0) ||
        (daysRemaining <= 15 && daysRemaining > 5 && sales30d > 0)
      ) {
        urgency = "warning";
        reason = `Tồn kho dưới ngưỡng an toàn (còn ${currentStock} cái), ước tính đủ bán trong ${Math.round(daysRemaining)} ngày.`;
      } else if (daysRemaining <= 30 && sales30d >= 10) {
        urgency = "reorder";
        reason = `Sản phẩm bán đều (${sales30d} cái/30 ngày). Đề xuất đặt gộp lô 30 ngày để tối ưu chi phí vận chuyển.`;
      }

      // Nếu đủ điều kiện đề xuất nhập
      if (urgency) {
        if (urgency === "critical") criticalCount++;
        else if (urgency === "warning") warningCount++;
        else if (urgency === "reorder") reorderCount++;

        // Số lượng đề xuất (nhập đủ bù tồn kho cho chu kỳ 30 ngày bán)
        let suggestedQty = 20;
        if (dailyVelocity > 0) {
          suggestedQty = Math.max(
            20,
            Math.ceil(dailyVelocity * 30 - Math.max(0, currentStock))
          );
        } else {
          suggestedQty = currentStock <= 0 ? 50 : 30;
        }

        // Làm tròn số lượng theo bội số 5 hoặc 10 cho dễ đóng kiện/thùng
        if (suggestedQty > 20) {
          suggestedQty = Math.ceil(suggestedQty / 5) * 5;
        }

        // Giá vốn ước tính
        const estimatedCost = hist
          ? hist.price
          : p.price_min
          ? Math.round(p.price_min * 0.6)
          : 25000;

        const estimatedTotal = suggestedQty * estimatedCost;
        totalEstimatedBudget += estimatedTotal;

        const supplierName = hist?.supplier || "GNEST";

        // Kiểm tra bộ lọc
        let matches = true;

        if (urgencyFilter !== "all" && urgency !== urgencyFilter) {
          matches = false;
        }

        if (search) {
          const inName = p.name.toLowerCase().includes(search);
          const inSku = (p.parent_sku || "").toLowerCase().includes(search);
          const inSup = supplierName.toLowerCase().includes(search);
          if (!inName && !inSku && !inSup) matches = false;
        }

        if (supplierFilter && !supplierName.toLowerCase().includes(supplierFilter)) {
          matches = false;
        }

        if (matches) {
          suggestions.push({
            id: p.id || p.item_id || `sug_${suggestions.length}`,
            productId: p.item_id || p.id || "",
            sku: p.parent_sku || "N/A",
            name: p.name,
            image: p.image || "",
            currentStock,
            sales30d,
            dailyVelocity,
            daysRemaining: Math.round(daysRemaining),
            suggestedQuantity: suggestedQty,
            estimatedCost,
            estimatedTotal,
            preferredSupplier: supplierName,
            supplierId: hist?.supplier_id,
            lastPurchasedDate: hist?.date,
            urgency,
            reason,
          });
        }
      }
    }

    // Sắp xếp: critical lên trước, sau đó warning, rồi reorder; trong cùng nhóm sắp xếp theo estimatedTotal giảm dần
    const urgencyWeight = { critical: 3, warning: 2, reorder: 1 };
    suggestions.sort((a, b) => {
      const wDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      if (wDiff !== 0) return wDiff;
      return b.estimatedTotal - a.estimatedTotal;
    });

    const summary: RestockProposalsSummary = {
      totalSuggestions: criticalCount + warningCount + reorderCount,
      totalEstimatedBudget,
      criticalCount,
      warningCount,
      reorderCount,
    };

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        summary,
      },
    });
  } catch (error: any) {
    console.error("[Restock Suggestions API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi tạo đề xuất nhập hàng" },
      { status: 500 }
    );
  }
}

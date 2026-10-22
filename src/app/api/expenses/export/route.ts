import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import {
  MongoPurchaseOrderModel,
  MongoShopeeProductModel,
  MongoSapoReceiveInventoryModel,
} from "@/server/db/schema";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function calculatePaidAmount(inv: any): number {
  if (inv.paid_amount !== undefined && inv.paid_amount > 0) return Number(inv.paid_amount);
  if (inv.transaction_status === "paid") return Number(inv.total_price || 0);
  if (inv.transactions && Array.isArray(inv.transactions) && inv.transactions.length > 0) {
    let paid = 0;
    for (const tx of inv.transactions) {
      if (tx.status === "success" || !tx.status) {
        paid += Number(tx.amount || 0);
      }
    }
    return Math.min(paid, Number(inv.total_price || 0));
  }
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "all"; // "orders", "suggestions", "all"

    const wb = XLSX.utils.book_new();

    // 1. Sheet: Đơn Nhập Hàng
    if (mode === "orders" || mode === "all") {
      const orders = await MongoPurchaseOrderModel.find({ status: { $ne: "cancelled" } })
        .sort({ received_on: -1, created_on: -1 })
        .lean();

      const ordersData = orders.map((ord: any, idx: number) => {
        const total = Number(ord.total_price || 0);
        const paid = calculatePaidAmount(ord);
        const unpaid = Math.max(0, total - paid);
        const dateStr = ord.received_on ? new Date(ord.received_on).toLocaleDateString("vi-VN") : "";

        let statusText = "Chưa thanh toán";
        if (ord.transaction_status === "paid" || unpaid === 0) statusText = "Đã thanh toán";
        else if (paid > 0) statusText = "Thanh toán 1 phần";

        return {
          "STT": idx + 1,
          "Mã Đơn Nhập": ord.code,
          "Ngày Nhập": dateStr,
          "Nhà Cung Cấp": ord.supplier_name || "Chưa rõ",
          "Tổng Tiền (VNĐ)": total,
          "Đã Thanh Toán (VNĐ)": paid,
          "Còn Nợ (VNĐ)": unpaid,
          "Trạng Thái": statusText,
          "Số Mặt Hàng": (ord.line_items || []).length,
        };
      });

      const wsOrders = XLSX.utils.json_to_sheet(ordersData);
      wsOrders["!cols"] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 14 },
        { wch: 30 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, wsOrders, "Don_Nhap_Hang");
    }

    // 2. Sheet: Đề Xuất Nhập Hàng
    if (mode === "suggestions" || mode === "all") {
      const [products, receiveOrders] = await Promise.all([
        MongoShopeeProductModel.find({}).lean(),
        MongoSapoReceiveInventoryModel.find({ status: { $ne: "cancelled" } })
          .sort({ received_on: -1 })
          .lean(),
      ]);

      const priceMap = new Map<string, { price: number; supplier: string }>();
      for (const ro of receiveOrders) {
        if (!ro.line_items) continue;
        for (const it of ro.line_items) {
          const sku = (it.sku || "").trim().toLowerCase();
          const name = (it.name || "").trim().toLowerCase();
          if (sku && !priceMap.has(`sku:${sku}`)) {
            priceMap.set(`sku:${sku}`, { price: Number(it.price || 0), supplier: ro.supplier_name });
          }
          if (name && !priceMap.has(`name:${name}`)) {
            priceMap.set(`name:${name}`, { price: Number(it.price || 0), supplier: ro.supplier_name });
          }
        }
      }

      const suggestionsData: any[] = [];
      let stt = 1;

      for (const p of products) {
        const pSku = (p.parent_sku || "").trim().toLowerCase();
        const pName = (p.name || "").trim().toLowerCase();
        const hist = priceMap.get(`sku:${pSku}`) || priceMap.get(`name:${pName}`);

        const stock = Number(p.stock ?? 0);
        const sales = Number(p.sales_30d ?? 0);
        const dailyVelocity = sales > 0 ? Number((sales / 30).toFixed(2)) : 0;
        const daysRemaining =
          dailyVelocity > 0
            ? Number((Math.max(0, stock) / dailyVelocity).toFixed(1))
            : stock <= 0
            ? 0
            : 999;

        let urgency = "";
        if (stock <= 0 || (daysRemaining <= 5 && sales > 0)) {
          urgency = "🔴 KHẨN CẤP (Hết hàng)";
        } else if ((stock <= 15 && stock > 0) || (daysRemaining <= 15 && sales > 0)) {
          urgency = "🟡 CẢNH BÁO (Tồn thấp)";
        } else if (daysRemaining <= 30 && sales >= 10) {
          urgency = "🟢 ĐỀ XUẤT ĐỊNH KỲ";
        }

        if (urgency) {
          let suggestedQty = 20;
          if (dailyVelocity > 0) {
            suggestedQty = Math.max(20, Math.ceil(dailyVelocity * 30 - Math.max(0, stock)));
          } else {
            suggestedQty = stock <= 0 ? 50 : 30;
          }
          if (suggestedQty > 20) suggestedQty = Math.ceil(suggestedQty / 5) * 5;

          const unitPrice = hist ? hist.price : (p.price_min ? Math.round(p.price_min * 0.6) : 25000);
          const totalBudget = suggestedQty * unitPrice;

          suggestionsData.push({
            "STT": stt++,
            "Mức Độ": urgency,
            "Tên Sản Phẩm": p.name,
            "Mã SKU": p.parent_sku || "N/A",
            "Tồn Hiện Tại": stock,
            "Đã Bán 30 Ngày": sales,
            "Tốc Độ Bán (Cái/Ngày)": dailyVelocity,
            "Số Ngày Tồn Còn": Math.round(daysRemaining),
            "Số Lượng Đề Xuất Nhập": suggestedQty,
            "Đơn Giá Dự Kiến (VNĐ)": unitPrice,
            "Dự Toán Chi Phí (VNĐ)": totalBudget,
            "Nhà Cung Cấp Đề Xuất": hist?.supplier || "GNEST",
          });
        }
      }

      const wsSuggestions = XLSX.utils.json_to_sheet(suggestionsData);
      wsSuggestions["!cols"] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 40 },
        { wch: 24 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
        { wch: 20 },
        { wch: 20 },
        { wch: 22 },
        { wch: 25 },
      ];
      XLSX.utils.book_append_sheet(wb, wsSuggestions, "De_Xuat_Nhap_Hang");
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `Bao_Cao_Chi_Tieu_Nhap_Hang_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[Export Expenses Excel Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xuất báo cáo Excel" },
      { status: 500 }
    );
  }
}

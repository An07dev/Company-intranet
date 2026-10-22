import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoPurchaseOrderModel } from "@/server/db/schema";

export const dynamic = "force-dynamic";

function getOrderFilter(idParam: string) {
  return { $or: [{ id: idParam }, { code: idParam }] };
}

/**
 * GET /api/expenses/purchase-orders/[id]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const order = await MongoPurchaseOrderModel.findOne(getOrderFilter(id)).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn nhập hàng" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { order },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi truy vấn đơn nhập hàng" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/expenses/purchase-orders/[id]
 * Cập nhật đơn nhập hàng
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const body = await request.json();

    const {
      supplier_name,
      supplier_code,
      supplier_id,
      received_on,
      transaction_status,
      paid_amount,
      note,
      line_items,
    } = body;

    const existingOrder = await MongoPurchaseOrderModel.findOne(getOrderFilter(id));

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn nhập hàng để chỉnh sửa" },
        { status: 404 }
      );
    }

    // Tính toán lại tổng tiền từ danh sách mặt hàng nếu có truyền
    let totalPrice = existingOrder.total_price || 0;
    let formattedLineItems = existingOrder.line_items || [];

    if (Array.isArray(line_items) && line_items.length > 0) {
      totalPrice = 0;
      formattedLineItems = line_items.map((li: any) => {
        const qty = Math.max(1, Number(li.quantity || 1));
        const price = Math.max(0, Number(li.price || 0));
        const lineAmount = qty * price;
        totalPrice += lineAmount;

        return {
          product_id: li.product_id || 0,
          variant_id: li.variant_id || 0,
          name: (li.name || "Sản phẩm").trim(),
          sku: (li.sku || "").trim(),
          quantity: qty,
          price: price,
          line_amount: lineAmount,
          current_stock: li.current_stock,
          sapo_synced: li.sapo_synced,
        };
      });
    }

    // Chuẩn hóa giao dịch thanh toán và số tiền đã trả
    let transactions = existingOrder.transactions || [];
    let targetPaid = 0;

    if (transaction_status === "paid") {
      targetPaid = totalPrice;
      transactions = [
        {
          id: `tx_${Date.now()}`,
          amount: totalPrice,
          payment_method_name: "Chuyển khoản",
          status: "success",
          processed_on: received_on || existingOrder.received_on,
          created_on: new Date().toISOString(),
        },
      ];
    } else if (transaction_status === "partially") {
      targetPaid = Math.min(totalPrice, Math.max(0, Number(paid_amount || 0)));
      transactions = [
        {
          id: `tx_${Date.now()}`,
          amount: targetPaid,
          payment_method_name: "Chuyển khoản",
          status: "success",
          processed_on: received_on || existingOrder.received_on,
          created_on: new Date().toISOString(),
        },
      ];
    } else {
      targetPaid = 0;
      transactions = [];
    }

    const unpaidAmount = Math.max(0, totalPrice - targetPaid);

    // Cập nhật thông tin vào document
    if (supplier_name) existingOrder.supplier_name = supplier_name.trim();
    if (supplier_code !== undefined) existingOrder.supplier_code = supplier_code;
    if (supplier_id) existingOrder.supplier_id = Number(supplier_id);
    if (received_on) existingOrder.received_on = received_on;
    if (transaction_status) existingOrder.transaction_status = transaction_status;
    existingOrder.total_price = totalPrice;
    existingOrder.subtotal_price = totalPrice;
    existingOrder.paid_amount = targetPaid;
    existingOrder.unpaid_amount = unpaidAmount;
    existingOrder.line_items = formattedLineItems;
    existingOrder.transactions = transactions;
    if (note !== undefined) existingOrder.note = note;
    existingOrder.updated_on = new Date().toISOString();

    await existingOrder.save();

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật đơn nhập hàng ${existingOrder.code} thành công!`,
      data: { order: existingOrder },
    });
  } catch (error: any) {
    console.error("[Update Purchase Order API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi cập nhật đơn nhập hàng" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expenses/purchase-orders/[id]
 * Xóa đơn nhập hàng khỏi collection purchase_orders
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const filter = getOrderFilter(id);
    const existing = await MongoPurchaseOrderModel.findOne(filter);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn nhập hàng để xóa" },
        { status: 404 }
      );
    }

    const orderCode = existing.code;
    await MongoPurchaseOrderModel.deleteOne(filter);

    return NextResponse.json({
      success: true,
      message: `Đã xóa đơn nhập hàng ${orderCode} thành công!`,
    });
  } catch (error: any) {
    console.error("[Delete Purchase Order API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xóa đơn nhập hàng" },
      { status: 500 }
    );
  }
}

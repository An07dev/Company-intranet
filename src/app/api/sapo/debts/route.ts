import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

export const dynamic = "force-dynamic";

/**
 * Helper: Bóc tách lỗi từ Sapo API
 */
function parseSapoErrorDetail(error: any, fallback: string): string {
  const raw = error?.message || String(error);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.errors) {
        if (Array.isArray(parsed.errors)) {
          return parsed.errors.map((e: any) => e.message || JSON.stringify(e)).join(" • ");
        }
        if (typeof parsed.errors === "object") {
          return Object.entries(parsed.errors)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" • ");
        }
      }
      if (parsed.error_description) return parsed.error_description;
      if (parsed.error) return String(parsed.error);
    }
  } catch {}
  return raw || fallback;
}

/**
 * Trích xuất thông tin công nợ từ đơn hàng
 */
function extractDebtInfo(doc: any) {
  let raw: any = {};
  if (doc.raw_text) {
    try {
      raw = JSON.parse(doc.raw_text);
    } catch {}
  }

  const isCancelled =
    doc.order_status === "Đã hủy" ||
    Boolean(raw.cancelled_on) ||
    raw.status === "cancelled" ||
    raw.financial_status === "voided";

  const financialStatus = raw.financial_status || (doc.status_description?.includes("pending") ? "pending" : "paid");
  const totalPrice = Number(raw.total_price || doc.total_amount) || 0;
  const totalReceived = Number(raw.total_received) || 0;
  const unpaidAmount = Number(
    raw.total_outstanding ?? raw.unpaid_amount ?? (totalPrice > totalReceived ? totalPrice - totalReceived : 0)
  );

  const customerName =
    raw.shipping_address?.name ||
    [raw.customer?.last_name, raw.customer?.first_name].filter(Boolean).join(" ").trim() ||
    raw.customer?.name ||
    doc.buyer_username ||
    "Khách lẻ";

  const customerPhone =
    raw.customer?.phone ||
    raw.shipping_address?.phone ||
    raw.billing_address?.phone ||
    "";

  const customerEmail = raw.customer?.email || raw.email || "";

  const customerAddress =
    raw.shipping_address?.address1 ||
    [raw.shipping_address?.address1, raw.shipping_address?.ward, raw.shipping_address?.district, raw.shipping_address?.city]
      .filter(Boolean)
      .join(", ") ||
    "";

  const createdAt = raw.created_on || raw.created_at || doc.createdAt || "";
  const daysOverdue = createdAt ? Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 0;

  return {
    order_sn: doc.order_sn,
    sapo_id: raw.id || (/^\d+$/.test(doc.id) ? doc.id : null),
    shop_username: doc.shop_username || "sapo_other",
    order_status: doc.order_status,
    financial_status: financialStatus,
    is_cancelled: isCancelled,
    total_amount: totalPrice,
    total_received: totalReceived,
    unpaid_amount: unpaidAmount,
    has_debt: (financialStatus === "pending" || financialStatus === "partially_paid" || unpaidAmount > 0),
    payment_method: doc.payment_method || raw.gateway || raw.payment_gateway_names?.[0] || "Chưa rõ",
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    customer_address: customerAddress,
    customer_id: raw.customer?.id || null,
    items: doc.items || [],
    created_at: createdAt,
    days_overdue: daysOverdue,
  };
}

/**
 * GET /api/sapo/debts
 * Query parameters:
 *  - type: 'summary' | 'customers' | 'orders' | 'customer_detail'
 *  - search: string
 *  - status: 'all' | 'pending' | 'partially_paid'
 *  - include_cancelled: 'true' | 'false' (mặc định false)
 *  - channel: string
 *  - page, limit
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const status = searchParams.get("status") || "all";
    const channel = searchParams.get("channel") || "all";
    const includeCancelled = searchParams.get("include_cancelled") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "15", 10)));
    const customerPhone = searchParams.get("customer_phone") || "";
    const customerName = searchParams.get("customer_name") || "";

    // 1. TYPE = SUMMARY (Thống kê tổng quan công nợ)
    if (type === "summary") {
      const cursor = MongoShopeeOrderModel.find({
        $or: [
          { status_description: { $regex: /pending|partially_paid/i } },
          { raw_text: { $regex: /"financial_status":"(pending|partially_paid)"/ } },
        ],
      }).lean();

      let totalDebtAmount = 0;
      let totalDebtOrders = 0;
      let overdue30DaysCount = 0;
      let overdue60DaysCount = 0;
      let partialCount = 0;
      let pendingCount = 0;
      let cancelledDebtAmount = 0;
      let cancelledDebtOrders = 0;
      const debtorsSet = new Set<string>();

      const channelDebts: Record<string, { count: number; debt: number }> = {};

      for await (const doc of cursor) {
        const debt = extractDebtInfo(doc);
        if (!debt.has_debt) continue;

        if (debt.is_cancelled) {
          cancelledDebtAmount += debt.unpaid_amount;
          cancelledDebtOrders++;
          if (!includeCancelled) continue;
        }

        totalDebtAmount += debt.unpaid_amount;
        totalDebtOrders++;

        if (debt.days_overdue >= 60) overdue60DaysCount++;
        else if (debt.days_overdue >= 30) overdue30DaysCount++;

        if (debt.financial_status === "partially_paid") partialCount++;
        else pendingCount++;

        const debtorKey = (debt.customer_phone || debt.customer_name).toLowerCase();
        debtorsSet.add(debtorKey);

        const ch = debt.shop_username || "sapo_other";
        if (!channelDebts[ch]) channelDebts[ch] = { count: 0, debt: 0 };
        channelDebts[ch].count++;
        channelDebts[ch].debt += debt.unpaid_amount;
      }

      return NextResponse.json({
        success: true,
        data: {
          totalDebtAmount,
          totalDebtOrders,
          totalDebtors: debtorsSet.size,
          overdue30DaysCount,
          overdue60DaysCount,
          partialCount,
          pendingCount,
          cancelledDebtAmount,
          cancelledDebtOrders,
          includeCancelled,
          channelDebts,
        },
      });
    }

    // 2. TYPE = CUSTOMERS (Sổ nợ gom nhóm theo Khách hàng)
    if (type === "customers") {
      const cursor = MongoShopeeOrderModel.find({
        $or: [
          { status_description: { $regex: /pending|partially_paid/i } },
          { raw_text: { $regex: /"financial_status":"(pending|partially_paid)"/ } },
        ],
      }).lean();

      const customerMap = new Map<string, any>();

      for await (const doc of cursor) {
        const debt = extractDebtInfo(doc);
        if (!debt.has_debt) continue;
        if (debt.is_cancelled && !includeCancelled) continue;

        // Key định danh khách hàng
        const key = (debt.customer_phone ? `phone_${debt.customer_phone}` : `name_${debt.customer_name}`).toLowerCase();

        const existing = customerMap.get(key) || {
          customer_id: debt.customer_id,
          name: debt.customer_name,
          phone: debt.customer_phone,
          email: debt.customer_email,
          address: debt.customer_address,
          total_debt: 0,
          total_spent: 0,
          total_orders: 0,
          debt_orders_count: 0,
          orders: [],
          latest_order_date: debt.created_at,
          max_days_overdue: 0,
        };

        existing.total_debt += debt.unpaid_amount;
        existing.total_spent += debt.total_amount;
        existing.debt_orders_count++;
        existing.orders.push({
          order_sn: debt.order_sn,
          total_amount: debt.total_amount,
          unpaid_amount: debt.unpaid_amount,
          financial_status: debt.financial_status,
          order_status: debt.order_status,
          created_at: debt.created_at,
          days_overdue: debt.days_overdue,
          shop_username: debt.shop_username,
        });

        if (debt.days_overdue > existing.max_days_overdue) {
          existing.max_days_overdue = debt.days_overdue;
        }

        if (debt.created_at && (!existing.latest_order_date || debt.created_at > existing.latest_order_date)) {
          existing.latest_order_date = debt.created_at;
        }

        customerMap.set(key, existing);
      }

      let allCustomers = Array.from(customerMap.values());

      // Filter theo tìm kiếm
      if (search) {
        allCustomers = allCustomers.filter((c) =>
          c.name.toLowerCase().includes(search) ||
          c.phone.toLowerCase().includes(search) ||
          (c.address && c.address.toLowerCase().includes(search))
        );
      }

      // Sắp xếp theo số tiền nợ giảm dần
      allCustomers.sort((a, b) => b.total_debt - a.total_debt);

      const total = allCustomers.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = allCustomers.slice((page - 1) * limit, page * limit);

      return NextResponse.json({
        success: true,
        data: {
          customers: paginated,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      });
    }

    // 3. TYPE = ORDERS (Danh sách từng đơn hàng còn nợ)
    if (type === "orders") {
      const cursor = MongoShopeeOrderModel.find({
        $or: [
          { status_description: { $regex: /pending|partially_paid/i } },
          { raw_text: { $regex: /"financial_status":"(pending|partially_paid)"/ } },
        ],
      }).sort({ createdAt: -1 }).lean();

      let debtOrders: any[] = [];

      for await (const doc of cursor) {
        const debt = extractDebtInfo(doc);
        if (!debt.has_debt) continue;
        if (debt.is_cancelled && !includeCancelled) continue;

        if (status !== "all" && debt.financial_status !== status) continue;
        if (channel !== "all" && debt.shop_username !== channel) continue;

        if (search) {
          const matchSn = debt.order_sn.toLowerCase().includes(search);
          const matchName = debt.customer_name.toLowerCase().includes(search);
          const matchPhone = debt.customer_phone.toLowerCase().includes(search);
          if (!matchSn && !matchName && !matchPhone) continue;
        }

        if (customerPhone && debt.customer_phone !== customerPhone) continue;
        if (customerName && debt.customer_name.toLowerCase() !== customerName.toLowerCase()) continue;

        debtOrders.push(debt);
      }

      debtOrders.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      const total = debtOrders.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = debtOrders.slice((page - 1) * limit, page * limit);

      return NextResponse.json({
        success: true,
        data: {
          orders: paginated,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      });
    }

    // 4. TYPE = CUSTOMER_DETAIL (Xem chi tiết tất cả đơn nợ của 1 khách hàng)
    if (type === "customer_detail") {
      const qPhone = searchParams.get("phone") || "";
      const qName = searchParams.get("name") || "";

      if (!qPhone && !qName) {
        return NextResponse.json({ success: false, message: "Thiếu thông tin số điện thoại hoặc tên khách" }, { status: 400 });
      }

      const cursor = MongoShopeeOrderModel.find({
        $or: [
          { status_description: { $regex: /pending|partially_paid/i } },
          { raw_text: { $regex: /"financial_status":"(pending|partially_paid)"/ } },
        ],
      }).lean();

      const customerOrders: any[] = [];
      let totalDebt = 0;

      for await (const doc of cursor) {
        const debt = extractDebtInfo(doc);
        if (!debt.has_debt) continue;
        if (debt.is_cancelled && !includeCancelled) continue;

        const matchPhone = qPhone && debt.customer_phone === qPhone;
        const matchName = qName && debt.customer_name.toLowerCase() === qName.toLowerCase();

        if (matchPhone || matchName) {
          customerOrders.push(debt);
          totalDebt += debt.unpaid_amount;
        }
      }

      customerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return NextResponse.json({
        success: true,
        data: {
          customer: {
            name: qName || customerOrders[0]?.customer_name || "Khách hàng",
            phone: qPhone || customerOrders[0]?.customer_phone || "",
            address: customerOrders[0]?.customer_address || "",
            total_debt: totalDebt,
            order_count: customerOrders.length,
          },
          orders: customerOrders,
        },
      });
    }

    return NextResponse.json({ success: false, message: "Loại yêu cầu không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("[Sapo Debts API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi khi truy xuất dữ liệu công nợ",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sapo/debts
 * Ghi nhận thu nợ / thanh toán công nợ đơn hàng
 * Có tùy chọn bắn giao dịch thanh toán lên Sapo Omnichannel
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const {
      order_sn,
      amount,
      payment_method = "Tiền mặt",
      note = "",
      sync_to_sapo = true,
      collected_by = "Kế toán / Thu ngân",
    } = body;

    if (!order_sn) {
      return NextResponse.json({ success: false, message: "Vui lòng cung cấp mã đơn hàng order_sn" }, { status: 400 });
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return NextResponse.json({ success: false, message: "Số tiền thanh toán phải lớn hơn 0" }, { status: 400 });
    }

    const orderDoc = await MongoShopeeOrderModel.findOne({ order_sn });
    if (!orderDoc) {
      return NextResponse.json({ success: false, message: `Không tìm thấy đơn hàng #${order_sn}` }, { status: 404 });
    }

    let raw: any = {};
    if (orderDoc.raw_text) {
      try {
        raw = JSON.parse(orderDoc.raw_text);
      } catch {}
    }

    const totalPrice = Number(raw.total_price || orderDoc.total_amount) || 0;
    const currentReceived = Number(raw.total_received) || 0;
    const currentUnpaid = Number(
      raw.total_outstanding ?? raw.unpaid_amount ?? (totalPrice > currentReceived ? totalPrice - currentReceived : 0)
    );

    if (currentUnpaid <= 0 && raw.financial_status === "paid") {
      return NextResponse.json({ success: false, message: "Đơn hàng này đã được thanh toán đủ, không còn dư nợ" }, { status: 400 });
    }

    const newReceived = currentReceived + payAmount;
    const newUnpaid = Math.max(0, currentUnpaid - payAmount);
    const newFinancialStatus = newUnpaid === 0 ? "paid" : "partially_paid";

    // 1. Đồng bộ lên Sapo API nếu được yêu cầu
    let sapoResponse: any = null;
    let sapoSynced = false;
    let sapoErrorNotice = "";

    const sapoId = raw.id || (/^\d+$/.test(orderDoc.id) ? orderDoc.id : null);

    if (sync_to_sapo && sapoId) {
      try {
        sapoResponse = await SapoService.createTransaction(sapoId, {
          amount: payAmount,
          gateway: payment_method,
          kind: "sale",
          status: "success",
          note: note ? `[Hệ thống nội bộ] ${note}` : `Thu công nợ từ hệ thống nội bộ (${collected_by})`,
        });
        sapoSynced = true;
      } catch (err: any) {
        console.error(`[Sapo Debt Sync Error] Không thể đẩy giao dịch thanh toán lên Sapo cho đơn #${order_sn}:`, err);
        const detailedErr = parseSapoErrorDetail(err, "Lỗi từ Sapo");
        sapoErrorNotice = `Đã ghi nhận nội bộ, nhưng Sapo báo lỗi: ${detailedErr}`;
      }
    }

    // 2. Cập nhật dữ liệu vào MongoDB
    const now = new Date().toISOString();
    raw.total_received = newReceived;
    raw.total_outstanding = newUnpaid;
    raw.unpaid_amount = newUnpaid;
    raw.financial_status = newFinancialStatus;

    if (!Array.isArray(raw.internal_debt_transactions)) {
      raw.internal_debt_transactions = [];
    }

    raw.internal_debt_transactions.push({
      amount: payAmount,
      payment_method,
      note,
      collected_by,
      sapo_synced: sapoSynced,
      created_at: now,
    });

    const statusDesc = `Kênh: ${(orderDoc.shop_username || "sapo").toUpperCase()} | Thanh toán: ${newFinancialStatus} | Đã thu: ${newReceived.toLocaleString("vi-VN")} đ | Còn nợ: ${newUnpaid.toLocaleString("vi-VN")} đ`;

    await MongoShopeeOrderModel.updateOne(
      { order_sn },
      {
        $set: {
          status_description: statusDesc,
          payment_method: payment_method || orderDoc.payment_method,
          raw_text: JSON.stringify(raw),
          synced_at: now,
          updatedAt: now,
        },
      }
    );

    // 3. Ghi log hệ thống
    await LogModel.createLog({
      level: "info",
      type: "debt_collection",
      source: "backend_server",
      shop_username: orderDoc.shop_username || "sapo",
      message: `Đã thu ${payAmount.toLocaleString("vi-VN")} ₫ tiền công nợ đơn #${order_sn} qua ${payment_method}. Còn nợ: ${newUnpaid.toLocaleString("vi-VN")} ₫.`,
      details: {
        order_sn,
        payAmount,
        remainingDebt: newUnpaid,
        payment_method,
        sapoSynced,
      },
    });

    return NextResponse.json({
      success: true,
      message: newUnpaid === 0
        ? `Đã thu đủ ${payAmount.toLocaleString("vi-VN")} ₫. Đơn hàng #${order_sn} đã hết nợ (Hoàn tất thanh toán)!`
        : `Đã thu ${payAmount.toLocaleString("vi-VN")} ₫. Số nợ còn lại của đơn #${order_sn} là: ${newUnpaid.toLocaleString("vi-VN")} ₫`,
      data: {
        order_sn,
        paid_amount: payAmount,
        remaining_debt: newUnpaid,
        financial_status: newFinancialStatus,
        sapo_synced: sapoSynced,
        sapo_notice: sapoErrorNotice || undefined,
      },
    });
  } catch (error: any) {
    console.error("[Sapo Debt Payment Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi xử lý thanh toán công nợ",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

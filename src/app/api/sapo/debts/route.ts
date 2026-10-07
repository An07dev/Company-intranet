import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

export const dynamic = "force-dynamic";

/**
 * Helper: Bóc tách chi tiết lỗi từ Sapo API
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
 * Helper trích xuất thông tin đơn hàng
 */
function parseOrderDebtData(doc: any) {
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

  const phone =
    raw.customer?.phone ||
    raw.shipping_address?.phone ||
    raw.billing_address?.phone ||
    "";

  const customerName =
    raw.shipping_address?.name ||
    [raw.customer?.last_name, raw.customer?.first_name].filter(Boolean).join(" ").trim() ||
    raw.customer?.name ||
    doc.buyer_username ||
    "Khách lẻ";

  const address =
    raw.shipping_address?.address1 ||
    [raw.shipping_address?.address1, raw.shipping_address?.ward, raw.shipping_address?.district, raw.shipping_address?.city]
      .filter(Boolean)
      .join(", ") ||
    "";

  const createdTime = new Date(raw.created_on || raw.created_at || doc.createdAt).getTime();
  const paidTime = raw.paid_on ? new Date(raw.paid_on).getTime() : null;
  const totalPrice = Number(raw.total_price || doc.total_amount) || 0;
  const totalReceived = Number(raw.total_received) || 0;
  const outstanding = Number(
    raw.total_outstanding ?? raw.unpaid_amount ?? (totalPrice > totalReceived ? totalPrice - totalReceived : 0)
  );

  const sapoId = raw.id || (/^\d+$/.test(doc.id) ? doc.id : null);
  const financialStatus = raw.financial_status || (doc.status_description?.includes("pending") ? "pending" : "paid");

  return {
    order_sn: doc.order_sn,
    sapo_id: sapoId,
    shop_username: doc.shop_username || "sapo_pos",
    customer_id: raw.customer?.id || null,
    customer_name: customerName,
    customer_phone: phone,
    customer_address: address,
    created_at: raw.created_on || doc.createdAt,
    created_time: createdTime,
    paid_on: raw.paid_on || null,
    paid_time: paidTime,
    total_price: totalPrice,
    total_received: totalReceived,
    outstanding,
    financial_status: financialStatus,
    order_status: doc.order_status,
    is_cancelled: isCancelled,
    has_debt: financialStatus === "pending" || financialStatus === "partially_paid" || outstanding > 0,
    payment_method: doc.payment_method || raw.gateway || raw.payment_gateway_names?.[0] || "Chưa rõ",
    items: doc.items || [],
  };
}

/**
 * GET /api/sapo/debts
 * Query Parameters:
 *  - type: 'summary' | 'customers' | 'orders' | 'customer_detail'
 *  - start_date: YYYY-MM-DD (mặc định 30 ngày trước)
 *  - end_date: YYYY-MM-DD (mặc định hôm nay)
 *  - filter: 'cuoi_ky' | 'phat_sinh' | 'all' (mặc định 'cuoi_ky')
 *  - search: string (tên hoặc SĐT)
 *  - page, limit
 *  - include_cancelled: 'true' | 'false' (mặc định false)
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const filterType = searchParams.get("filter") || "cuoi_ky";
    const includeCancelled = searchParams.get("include_cancelled") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "15", 10)));

    // Xác định khoảng thời gian báo cáo kế toán (Mặc định 30 ngày qua: 08/09/2026 - 07/10/2026)
    const now = new Date();
    const defaultEndStr = now.toISOString().slice(0, 10);
    const dStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const defaultStartStr = dStart.toISOString().slice(0, 10);

    const startDateStr = searchParams.get("start_date") || defaultStartStr;
    const endDateStr = searchParams.get("end_date") || defaultEndStr;

    // Giờ VN (GMT+7)
    const startTime = new Date(`${startDateStr}T00:00:00+07:00`).getTime();
    const endTime = new Date(`${endDateStr}T23:59:59.999+07:00`).getTime();

    // 1. TYPE = SUMMARY (Phương trình công nợ Sapo: Nợ đầu kỳ + Nợ tăng trong kỳ - Nợ giảm trong kỳ = Nợ cuối kỳ)
    if (type === "summary") {
      const cursor = MongoShopeeOrderModel.find(
        includeCancelled ? {} : { order_status: { $ne: "Đã hủy" } }
      ).lean();

      let totalDauKy = 0;
      let totalTangTrongKy = 0;
      let totalGiamTrongKy = 0;
      let totalDebtOrders = 0;
      const debtorsSet = new Set<string>();

      for await (const doc of cursor) {
        const order = parseOrderDebtData(doc);
        if (order.is_cancelled && !includeCancelled) continue;

        let hasCustomerDebt = false;

        // A: Đơn phát sinh trước kỳ (created_time < startTime)
        if (order.created_time < startTime) {
          if (order.outstanding > 0) {
            totalDauKy += order.outstanding;
            hasCustomerDebt = true;
          }
          if (order.paid_time && order.paid_time >= startTime && order.paid_time <= endTime) {
            totalDauKy += order.total_received;
            totalGiamTrongKy += order.total_received;
            hasCustomerDebt = true;
          }
        }
        // B: Đơn phát sinh trong kỳ (startTime <= created_time <= endTime)
        else if (order.created_time >= startTime && order.created_time <= endTime) {
          if (order.has_debt || (order.paid_time && order.paid_time > order.created_time + 60000)) {
            totalTangTrongKy += order.total_price;
            if (order.total_received > 0) {
              totalGiamTrongKy += order.total_received;
            }
            hasCustomerDebt = true;
          }
        }

        if (order.outstanding > 0) {
          totalDebtOrders++;
        }

        if (hasCustomerDebt) {
          const key = (order.customer_phone || order.customer_name).toLowerCase();
          debtorsSet.add(key);
        }
      }

      const totalCuoiKy = totalDauKy + totalTangTrongKy - totalGiamTrongKy;

      return NextResponse.json({
        success: true,
        data: {
          dau_ky: totalDauKy,
          tang_trong_ky: totalTangTrongKy,
          giam_trong_ky: totalGiamTrongKy,
          cuoi_ky: totalCuoiKy,
          totalDebtAmount: totalCuoiKy,
          totalDebtOrders,
          totalDebtors: debtorsSet.size,
          startDate: startDateStr,
          endDate: endDateStr,
        },
      });
    }

    // 2. TYPE = CUSTOMERS (Sổ nợ gom nhóm theo Khách hàng chuẩn Sapo)
    if (type === "customers") {
      const cursor = MongoShopeeOrderModel.find(
        includeCancelled ? {} : { order_status: { $ne: "Đã hủy" } }
      ).lean();

      const customerMap = new Map<string, any>();

      for await (const doc of cursor) {
        const order = parseOrderDebtData(doc);
        if (order.is_cancelled && !includeCancelled) continue;

        // Bỏ qua đơn khách lẻ không có SĐT nếu bảng công nợ khách hàng cần theo dõi đối tượng cụ thể
        const rawPhone = order.customer_phone.replace(/\D/g, "");
        const key = rawPhone ? `phone_${rawPhone.slice(-9)}` : `name_${order.customer_name.toLowerCase()}`;

        if (!customerMap.has(key)) {
          customerMap.set(key, {
            customer_id: order.customer_id,
            name: order.customer_name,
            phone: order.customer_phone,
            address: order.customer_address,
            dau_ky: 0,
            tang_trong_ky: 0,
            giam_trong_ky: 0,
            cuoi_ky: 0,
            total_debt: 0,
            total_spent: 0,
            order_count: 0,
            debt_orders_count: 0,
            orders: [],
            latest_order_date: order.created_at,
          });
        }

        const c = customerMap.get(key);
        c.order_count++;
        c.total_spent += order.total_price;

        let isOrderRelevant = false;

        // A: Đơn tạo trước kỳ
        if (order.created_time < startTime) {
          if (order.outstanding > 0) {
            c.dau_ky += order.outstanding;
            isOrderRelevant = true;
          }
          if (order.paid_time && order.paid_time >= startTime && order.paid_time <= endTime) {
            c.dau_ky += order.total_received;
            c.giam_trong_ky += order.total_received;
            isOrderRelevant = true;
          }
        }
        // B: Đơn tạo trong kỳ
        else if (order.created_time >= startTime && order.created_time <= endTime) {
          if (order.has_debt || (order.paid_time && order.paid_time > order.created_time + 60000)) {
            c.tang_trong_ky += order.total_price;
            if (order.total_received > 0) {
              c.giam_trong_ky += order.total_received;
            }
            isOrderRelevant = true;
          }
        }

        if (order.outstanding > 0) {
          c.debt_orders_count++;
        }

        if (isOrderRelevant) {
          c.orders.push({
            order_sn: order.order_sn,
            total_amount: order.total_price,
            total_received: order.total_received,
            unpaid_amount: order.outstanding,
            financial_status: order.financial_status,
            order_status: order.order_status,
            created_at: order.created_at,
            paid_at: order.paid_on,
            shop_username: order.shop_username,
          });
        }

        if (order.created_at && (!c.latest_order_date || order.created_at > c.latest_order_date)) {
          c.latest_order_date = order.created_at;
        }
      }

      // Tính Nợ cuối kỳ: Cuối = Đầu + Tăng - Giảm
      let allCustomers: any[] = [];
      for (const c of customerMap.values()) {
        c.cuoi_ky = c.dau_ky + c.tang_trong_ky - c.giam_trong_ky;
        c.total_debt = c.cuoi_ky;

        // Lọc theo filterType:
        // - 'cuoi_ky': Chỉ lấy khách hàng còn nợ cuối kỳ > 0 (chuẩn Sapo)
        // - 'phat_sinh': Khách hàng có phát sinh nợ (Tăng > 0 hoặc Giảm > 0 hoặc Cuối > 0)
        // - 'all': Tất cả
        if (filterType === "cuoi_ky" && c.cuoi_ky <= 0) continue;
        if (filterType === "phat_sinh" && c.cuoi_ky <= 0 && c.tang_trong_ky <= 0 && c.giam_trong_ky <= 0) continue;

        // Ẩn nhóm "Khách lẻ" không có SĐT nếu không muốn lẫn vào đối tượng khách nợ
        if (!c.phone && (c.name === "Khách lẻ" || c.name === "Chưa rõ")) {
          // Bỏ qua dòng khách lẻ vô danh
          continue;
        }

        allCustomers.push(c);
      }

      // Tìm kiếm theo tên / SĐT
      if (search) {
        allCustomers = allCustomers.filter((c) =>
          c.name.toLowerCase().includes(search) ||
          c.phone.toLowerCase().includes(search) ||
          (c.address && c.address.toLowerCase().includes(search))
        );
      }

      // Sắp xếp theo Phải thu cuối kỳ giảm dần
      allCustomers.sort((a, b) => b.cuoi_ky - a.cuoi_ky);

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
      const channel = searchParams.get("channel") || "all";
      const status = searchParams.get("status") || "all";
      const customerPhone = searchParams.get("customer_phone") || "";
      const customerName = searchParams.get("customer_name") || "";

      const cursor = MongoShopeeOrderModel.find(
        includeCancelled ? {} : { order_status: { $ne: "Đã hủy" } }
      ).lean();

      let debtOrders: any[] = [];

      for await (const doc of cursor) {
        const order = parseOrderDebtData(doc);
        if (order.is_cancelled && !includeCancelled) continue;
        if (!order.has_debt) continue;

        if (status !== "all" && order.financial_status !== status) continue;
        if (channel !== "all" && order.shop_username !== channel) continue;

        if (search) {
          const matchSn = order.order_sn.toLowerCase().includes(search);
          const matchName = order.customer_name.toLowerCase().includes(search);
          const matchPhone = order.customer_phone.toLowerCase().includes(search);
          if (!matchSn && !matchName && !matchPhone) continue;
        }

        if (customerPhone && order.customer_phone !== customerPhone) continue;
        if (customerName && order.customer_name.toLowerCase() !== customerName.toLowerCase()) continue;

        const daysOverdue = order.created_time
          ? Math.max(0, Math.floor((Date.now() - order.created_time) / (1000 * 60 * 60 * 24)))
          : 0;

        debtOrders.push({
          order_sn: order.order_sn,
          sapo_id: order.sapo_id,
          shop_username: order.shop_username,
          order_status: order.order_status,
          financial_status: order.financial_status,
          total_amount: order.total_price,
          total_received: order.total_received,
          unpaid_amount: order.outstanding,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_address: order.customer_address,
          created_at: order.created_at,
          days_overdue: daysOverdue,
          payment_method: order.payment_method,
          items: order.items,
        });
      }

      debtOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
        return NextResponse.json(
          { success: false, message: "Thiếu thông tin số điện thoại hoặc tên khách" },
          { status: 400 }
        );
      }

      const cursor = MongoShopeeOrderModel.find(
        includeCancelled ? {} : { order_status: { $ne: "Đã hủy" } }
      ).lean();

      const customerOrders: any[] = [];
      let totalDebt = 0;
      let targetName = qName;
      let targetAddress = "";

      for await (const doc of cursor) {
        const order = parseOrderDebtData(doc);
        if (order.is_cancelled && !includeCancelled) continue;

        const matchPhone = qPhone && order.customer_phone && order.customer_phone.replace(/\D/g, "").includes(qPhone.replace(/\D/g, "").slice(-9));
        const matchName = qName && order.customer_name.toLowerCase() === qName.toLowerCase();

        if (matchPhone || matchName) {
          if (order.has_debt || order.total_received > 0) {
            customerOrders.push(order);
            totalDebt += order.outstanding;
            if (order.customer_name && !targetName) targetName = order.customer_name;
            if (order.customer_address && !targetAddress) targetAddress = order.customer_address;
          }
        }
      }

      customerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return NextResponse.json({
        success: true,
        data: {
          customer: {
            name: targetName || "Khách hàng",
            phone: qPhone || "",
            address: targetAddress,
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
 * Đồng bộ phiếu thu lên Sapo Omnichannel qua /admin/orders/{id}/transactions.json
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
      return NextResponse.json(
        { success: false, message: "Đơn hàng này đã được thanh toán đủ, không còn dư nợ" },
        { status: 400 }
      );
    }

    const newReceived = currentReceived + payAmount;
    const newUnpaid = Math.max(0, currentUnpaid - payAmount);
    const newFinancialStatus = newUnpaid === 0 ? "paid" : "partially_paid";

    // 1. Đồng bộ lên Sapo API nếu được yêu cầu
    let sapoSynced = false;
    let sapoErrorNotice = "";

    const sapoId = raw.id || (/^\d+$/.test(orderDoc.id) ? orderDoc.id : null);

    if (sync_to_sapo && sapoId) {
      try {
        await SapoService.createTransaction(sapoId, {
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
    if (newUnpaid === 0) {
      raw.paid_on = now;
      orderDoc.order_status = "Đã thanh toán";
    }

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
          order_status: orderDoc.order_status,
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
      message:
        newUnpaid === 0
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

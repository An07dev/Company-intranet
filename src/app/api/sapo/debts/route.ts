import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel } from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cấu trúc Cache dữ liệu công nợ tối ưu hoá hiệu năng
 */
interface DebtCacheEntry {
  summary: {
    dau_ky: number;
    tang_trong_ky: number;
    giam_trong_ky: number;
    cuoi_ky: number;
    totalDebtAmount: number;
    totalDebtOrders: number;
    totalDebtors: number;
    startDate: string;
    endDate: string;
  };
  allCustomers: any[];
  allDebtOrders: any[];
  timestamp: number;
}

const debtCache = new Map<string, DebtCacheEntry>();
const ongoingCalculations = new Map<string, Promise<DebtCacheEntry>>();
const DEBT_CACHE_TTL_MS = 60 * 1000; // 60 giây TTL

export function invalidateCustomerDebtCache() {
  debtCache.clear();
  ongoingCalculations.clear();
}

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

  const orderSnClean = String(doc.order_sn || "").replace(/^#/, "").trim();
  const rawBuyer = doc.buyer_username && doc.buyer_username.trim() !== "Khách lẻ" ? doc.buyer_username.trim() : "";

  // Ưu tiên Họ tên trên tài khoản khách hàng CRM Sapo
  const customerName =
    [raw.customer?.last_name, raw.customer?.first_name].filter(Boolean).join(" ").trim() ||
    (raw.customer?.name && raw.customer.name !== "Khách lẻ" ? raw.customer.name : "") ||
    (raw.shipping_address?.name && raw.shipping_address.name !== "Khách lẻ" ? raw.shipping_address.name : "") ||
    rawBuyer ||
    `Khách lẻ (#${orderSnClean || doc.id || "N/A"})`;

  const address =
    raw.shipping_address?.address1 ||
    [raw.shipping_address?.address1, raw.shipping_address?.ward, raw.shipping_address?.district, raw.shipping_address?.city]
      .filter(Boolean)
      .join(", ") ||
    "";

  const createdTime = new Date(raw.created_on || raw.created_at || doc.createdAt).getTime();
  const paidTime = raw.paid_on ? new Date(raw.paid_on).getTime() : null;
  const totalPrice = Number(raw.total_price || doc.total_amount) || 0;
  const rawReceived = Number(raw.total_received) || 0;
  const outstanding = Number(
    raw.total_outstanding ?? raw.unpaid_amount ?? (totalPrice > rawReceived ? totalPrice - rawReceived : 0)
  );

  // Số tiền thực thu (nếu out = 0 và đã trả hết thì = total_price)
  const totalReceived = rawReceived > 0 ? rawReceived : Math.max(0, totalPrice - outstanding);

  const sapoId = raw.id || (/^\d+$/.test(doc.id) ? doc.id : null);
  const financialStatus = raw.financial_status || (doc.status_description?.includes("pending") ? "pending" : "paid");

  return {
    order_sn: doc.order_sn,
    sapo_id: sapoId,
    shop_username: doc.shop_username || "sapo_pos",
    buyer_username: doc.buyer_username || "",
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
    has_debt: outstanding > 0,
    payment_method: doc.payment_method || raw.gateway || raw.payment_gateway_names?.[0] || "Chưa rõ",
    items: doc.items || [],
  };
}

/**
 * Helper: Tạo key gom nhóm khách hàng chuẩn Sapo
 * - Ưu tiên 1: customer_id từ CRM Sapo (chuẩn nhất cho tài khoản khách)
 * - Ưu tiên 2: SĐT đầy đủ (>= 9 số và không chứa dấu * ẩn danh tính)
 * - Ưu tiên 3: Tên đăng nhập người mua (buyer_username trên Shopee)
 * - Ưu tiên 4: Tên khách hàng (nếu không phải "Khách lẻ")
 * - Đơn Khách lẻ: Nhóm theo mã đơn để hiển thị độc lập như Sapo
 */
function getCustomerGroupKey(order: {
  customer_id?: number | null;
  customer_phone?: string;
  buyer_username?: string;
  customer_name?: string;
  order_sn?: string;
}): string {
  if (order.customer_id) {
    return `sapo_cust_${order.customer_id}`;
  }
  const phone = order.customer_phone || "";
  const rawPhone = phone.replace(/\D/g, "");
  if (rawPhone.length >= 9 && !phone.includes("*")) {
    return `phone_${rawPhone.slice(-9)}`;
  }
  if (order.buyer_username && order.buyer_username.trim() && order.buyer_username.trim() !== "Khách lẻ") {
    return `buyer_${order.buyer_username.trim().toLowerCase()}`;
  }
  if (order.customer_name && order.customer_name.trim() && !order.customer_name.startsWith("Khách lẻ")) {
    return `name_${order.customer_name.trim().toLowerCase()}`;
  }
  return `khach_le_${order.order_sn || phone || "unknown"}`;
}

/**
 * Tính toán toàn bộ dữ liệu công nợ 1 lần duy nhất cho toàn bộ các endpoint (summary, customers, orders)
 */
async function computeDebtData(
  startDateStr: string,
  endDateStr: string,
  includeCancelled: boolean
): Promise<DebtCacheEntry> {
  const startTime = new Date(`${startDateStr}T00:00:00+07:00`).getTime();
  const endTime = new Date(`${endDateStr}T23:59:59.999+07:00`).getTime();

  const startIsoStr = `${startDateStr}T00:00:00.000Z`;

  const query: any = {
    order_status: includeCancelled ? { $exists: true } : { $ne: "Đã hủy" },
    $or: [
      { status_description: { $regex: /pending|partially_paid/i } },
      { createdAt: { $gte: startIsoStr } },
    ],
  };

  const docs = await MongoShopeeOrderModel.find(
    query,
    { order_sn: 1, shop_username: 1, buyer_username: 1, order_status: 1, total_amount: 1, raw_text: 1, createdAt: 1 }
  )
    .lean()
    .exec();

  let totalDauKy = 0;
  let totalTangTrongKy = 0;
  let totalGiamTrongKy = 0;
  let totalDebtOrders = 0;
  const customerMap = new Map<string, any>();
  const allDebtOrders: any[] = [];

  for (const doc of docs) {
    const order = parseOrderDebtData(doc);
    if (order.is_cancelled && !includeCancelled) continue;

    // A: Đơn phát sinh trước kỳ (created_time < startTime)
    if (order.created_time < startTime) {
      if (order.outstanding > 0) {
        totalDauKy += order.outstanding;
      }
      if (order.paid_time && order.paid_time >= startTime && order.paid_time <= endTime) {
        totalDauKy += order.total_received;
        totalGiamTrongKy += order.total_received;
      }
    }
    // B: Đơn phát sinh trong kỳ (startTime <= created_time <= endTime)
    else if (order.created_time >= startTime && order.created_time <= endTime) {
      totalTangTrongKy += order.total_price;
      if (order.total_received > 0) {
        totalGiamTrongKy += order.total_received;
      }
    }

    if (order.outstanding > 0) {
      totalDebtOrders++;
      const daysOverdue = order.created_time
        ? Math.max(0, Math.floor((Date.now() - order.created_time) / (1000 * 60 * 60 * 24)))
        : 0;

      allDebtOrders.push({
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

    // Gom nhóm khách hàng
    const key = getCustomerGroupKey(order);
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

    if (!c.customer_id && order.customer_id) {
      c.customer_id = order.customer_id;
    }

    if (order.customer_name && !order.customer_name.startsWith("Khách lẻ") && (c.name.startsWith("Khách lẻ") || !c.name)) {
      c.name = order.customer_name;
    }
    if (order.customer_phone && (!c.phone || c.phone.includes("*")) && !order.customer_phone.includes("*")) {
      c.phone = order.customer_phone;
    }
    if (order.customer_address && !c.address) {
      c.address = order.customer_address;
    }

    let isOrderRelevant = false;
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
    } else if (order.created_time >= startTime && order.created_time <= endTime) {
      c.tang_trong_ky += order.total_price;
      if (order.total_received > 0) {
        c.giam_trong_ky += order.total_received;
      }
      isOrderRelevant = true;
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
  const allCustomers: any[] = [];
  for (const c of customerMap.values()) {
    c.cuoi_ky = c.dau_ky + c.tang_trong_ky - c.giam_trong_ky;
    c.total_debt = c.cuoi_ky;
    allCustomers.push(c);
  }

  // Sắp xếp
  allCustomers.sort((a, b) => b.cuoi_ky - a.cuoi_ky);
  allDebtOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalCuoiKy = totalDauKy + totalTangTrongKy - totalGiamTrongKy;
  const activeDebtors = allCustomers.filter((c) => c.cuoi_ky > 0).length;

  return {
    summary: {
      dau_ky: totalDauKy,
      tang_trong_ky: totalTangTrongKy,
      giam_trong_ky: totalGiamTrongKy,
      cuoi_ky: totalCuoiKy,
      totalDebtAmount: totalCuoiKy,
      totalDebtOrders,
      totalDebtors: activeDebtors,
      startDate: startDateStr,
      endDate: endDateStr,
    },
    allCustomers,
    allDebtOrders,
    timestamp: Date.now(),
  };
}

/**
 * Single-Flight Deduplication & In-Memory Cache Helper
 */
async function getOrComputeDebtData(
  cacheKey: string,
  startDateStr: string,
  endDateStr: string,
  includeCancelled: boolean,
  forceRefresh: boolean
): Promise<DebtCacheEntry> {
  const now = Date.now();

  if (!forceRefresh) {
    const cached = debtCache.get(cacheKey);
    if (cached && now - cached.timestamp < DEBT_CACHE_TTL_MS) {
      return cached;
    }

    if (ongoingCalculations.has(cacheKey)) {
      return ongoingCalculations.get(cacheKey)!;
    }
  }

  const computePromise = computeDebtData(startDateStr, endDateStr, includeCancelled)
    .then((entry) => {
      debtCache.set(cacheKey, entry);
      ongoingCalculations.delete(cacheKey);
      return entry;
    })
    .catch((err) => {
      ongoingCalculations.delete(cacheKey);
      throw err;
    });

  ongoingCalculations.set(cacheKey, computePromise);
  return computePromise;
}

/**
 * GET /api/sapo/debts
 * Query Parameters:
 *  - type: 'summary' | 'customers' | 'orders' | 'customer_detail'
 *  - start_date: YYYY-MM-DD (mặc định 30 ngày trước)
 *  - end_date: YYYY-MM-DD (mặc định hôm nay)
 *  - filter: 'cuoi_ky' | 'phat_sinh' | 'all' (mặc định 'cuoi_ky')
 *  - search: string (tên, SĐT hoặc mã đơn)
 *  - page, limit
 *  - include_cancelled: 'true' | 'false' (mặc định false)
 *  - refresh: 'true' | 'false' (bỏ qua cache)
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const filterType = searchParams.get("filter") || "cuoi_ky";
    const includeCancelled = searchParams.get("include_cancelled") === "true";
    const forceRefresh = searchParams.get("refresh") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "15", 10)));

    // Xác định khoảng thời gian báo cáo
    const now = new Date();
    const defaultEndStr = now.toISOString().slice(0, 10);
    const dStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const defaultStartStr = dStart.toISOString().slice(0, 10);

    const startDateStr = searchParams.get("start_date") || defaultStartStr;
    const endDateStr = searchParams.get("end_date") || defaultEndStr;

    const cacheKey = `${startDateStr}_${endDateStr}_${includeCancelled}`;
    const cacheEntry = await getOrComputeDebtData(cacheKey, startDateStr, endDateStr, includeCancelled, forceRefresh);

    const responseHeaders = {
      "Cache-Control": "private, max-age=10, stale-while-revalidate=45",
    };

    // 1. TYPE = SUMMARY
    if (type === "summary") {
      return NextResponse.json(
        {
          success: true,
          data: cacheEntry.summary,
        },
        { headers: responseHeaders }
      );
    }

    // 2. TYPE = CUSTOMERS
    if (type === "customers") {
      let filtered = cacheEntry.allCustomers;

      if (!search) {
        if (filterType === "cuoi_ky") {
          filtered = filtered.filter((c) => c.cuoi_ky > 0);
        } else if (filterType === "phat_sinh") {
          filtered = filtered.filter((c) => c.cuoi_ky > 0 || c.tang_trong_ky > 0 || c.giam_trong_ky > 0);
        }
      } else {
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(search) ||
            (c.phone && c.phone.toLowerCase().includes(search)) ||
            (c.customer_id && String(c.customer_id).includes(search)) ||
            (c.address && c.address.toLowerCase().includes(search)) ||
            (c.orders && c.orders.some((o: any) => o.order_sn?.toLowerCase().includes(search)))
        );
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      return NextResponse.json(
        {
          success: true,
          data: {
            customers: paginated,
            pagination: {
              page,
              limit,
              total,
              totalDebtors: total,
              totalPages,
            },
          },
        },
        { headers: responseHeaders }
      );
    }

    // 3. TYPE = ORDERS
    if (type === "orders") {
      const channel = searchParams.get("channel") || "all";
      const status = searchParams.get("status") || "all";
      const customerPhone = searchParams.get("customer_phone") || "";
      const customerName = searchParams.get("customer_name") || "";

      let filtered = cacheEntry.allDebtOrders;

      if (status !== "all") {
        filtered = filtered.filter((o) => o.financial_status === status);
      }
      if (channel !== "all") {
        filtered = filtered.filter((o) => o.shop_username === channel);
      }

      if (search) {
        filtered = filtered.filter(
          (o) =>
            o.order_sn.toLowerCase().includes(search) ||
            o.customer_name.toLowerCase().includes(search) ||
            (o.customer_phone && o.customer_phone.toLowerCase().includes(search))
        );
      }

      if (customerPhone) {
        filtered = filtered.filter((o) => o.customer_phone === customerPhone);
      }
      if (customerName) {
        filtered = filtered.filter((o) => o.customer_name.toLowerCase() === customerName.toLowerCase());
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      return NextResponse.json(
        {
          success: true,
          data: {
            orders: paginated,
            pagination: {
              page,
              limit,
              total,
              totalOrders: total,
              totalPages,
            },
          },
        },
        { headers: responseHeaders }
      );
    }

    // 4. TYPE = CUSTOMER_DETAIL
    if (type === "customer_detail") {
      const qCustId = searchParams.get("customer_id") || "";
      const qPhone = searchParams.get("phone") || "";
      const qName = searchParams.get("name") || "";

      if (!qCustId && !qPhone && !qName) {
        return NextResponse.json(
          { success: false, message: "Thiếu thông tin mã khách hàng, số điện thoại hoặc tên khách" },
          { status: 400 }
        );
      }

      const foundCustomer = cacheEntry.allCustomers.find((c) => {
        if (qCustId && c.customer_id && String(c.customer_id) === String(qCustId)) return true;
        if (
          qPhone &&
          !qPhone.includes("*") &&
          c.phone &&
          !c.phone.includes("*") &&
          c.phone.replace(/\D/g, "").slice(-9) === qPhone.replace(/\D/g, "").slice(-9)
        ) {
          return true;
        }
        if (qName && qName.trim().toLowerCase() !== "khách lẻ" && c.name.trim().toLowerCase() === qName.trim().toLowerCase()) {
          return true;
        }
        return false;
      });

      if (!foundCustomer) {
        return NextResponse.json({
          success: true,
          data: {
            customer: {
              customer_id: qCustId ? Number(qCustId) : undefined,
              name: qName || "Khách hàng",
              phone: qPhone || "",
              address: "",
              total_debt: 0,
              order_count: 0,
            },
            orders: [],
          },
        });
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            customer: {
              customer_id: foundCustomer.customer_id,
              name: foundCustomer.name,
              phone: foundCustomer.phone,
              address: foundCustomer.address,
              total_debt: foundCustomer.cuoi_ky,
              order_count: foundCustomer.orders?.length || 0,
            },
            orders: foundCustomer.orders || [],
          },
        },
        { headers: responseHeaders }
      );
    }

    return NextResponse.json({ success: false, message: "Type không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("[Sapo Debts API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi tính toán công nợ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sapo/debts
 * Thu nợ / Thanh toán công nợ đơn hàng
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

    // Xóa cache công nợ ngay khi có thu tiền
    invalidateCustomerDebtCache();

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

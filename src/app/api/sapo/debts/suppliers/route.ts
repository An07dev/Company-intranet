import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import {
  MongoSapoSupplierModel,
  MongoSapoReceiveInventoryModel,
  MongoSapoSupplierReturnModel,
} from "@/server/db/schema";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

export const dynamic = "force-dynamic";

/**
 * Trợ lý trích xuất số tiền đã trả cho một đơn nhập kho
 */
function getReiPaidAmount(inv: any): number {
  if (inv.transaction_status === "paid") {
    return Number(inv.total_price || 0);
  }
  if (inv.transactions && Array.isArray(inv.transactions) && inv.transactions.length > 0) {
    let paid = 0;
    for (const tx of inv.transactions) {
      if (tx.status === "success" || !tx.status) {
        paid += Number(tx.amount || 0);
      }
    }
    return paid;
  }
  return 0;
}

/**
 * GET /api/sapo/debts/suppliers
 * Query Params:
 *  - type: 'summary' | 'suppliers' | 'supplier_detail'
 *  - start_date: YYYY-MM-DD
 *  - end_date: YYYY-MM-DD
 *  - search: string
 *  - supplier_id: number (khi type = 'supplier_detail')
 *  - page, limit
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const supplierId = searchParams.get("supplier_id") ? parseInt(searchParams.get("supplier_id")!, 10) : null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));

    // Xác định khoảng thời gian báo cáo (Mặc định 30 ngày qua)
    const now = new Date();
    const defaultEndStr = now.toISOString().slice(0, 10);
    const dStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const defaultStartStr = dStart.toISOString().slice(0, 10);

    const startDateStr = searchParams.get("start_date") || defaultStartStr;
    const endDateStr = searchParams.get("end_date") || defaultEndStr;

    // Chuẩn hóa mốc thời gian VN (GMT+7)
    const startTime = new Date(`${startDateStr}T00:00:00+07:00`).getTime();
    const endTime = new Date(`${endDateStr}T23:59:59.999+07:00`).getTime();

    // 1. TYPE = SUMMARY (4 thẻ KPI theo chuẩn công nợ Sapo)
    if (type === "summary") {
      // Lấy toàn bộ receive inventories và returns
      const [allInventories, allReturns] = await Promise.all([
        MongoSapoReceiveInventoryModel.find({ status: { $ne: "cancelled" } }).lean(),
        MongoSapoSupplierReturnModel.find({ status: { $ne: "cancelled" } }).lean(),
      ]);

      let noDauKy = 0;
      let noTangTrongKy = 0;
      let noGiamTrongKy = 0;

      // Tính toán theo từng đơn nhập kho
      for (const inv of allInventories) {
        const invTime = new Date(inv.received_on || inv.created_on).getTime();
        const totalPrice = Number(inv.total_price || 0);
        const paidAmount = getReiPaidAmount(inv);

        // Nợ tăng: phát sinh trong kỳ
        if (invTime >= startTime && invTime <= endTime) {
          noTangTrongKy += totalPrice;
        }

        // Thanh toán: xét thời gian thanh toán
        if (inv.transactions && inv.transactions.length > 0) {
          for (const tx of inv.transactions) {
            const txDateStr = tx.processed_on || tx.created_on || "";
            const txTime = txDateStr ? new Date(txDateStr).getTime() : 0;
            const txAmount = Number(tx.amount || 0);
            if (txTime >= startTime && txTime <= endTime) {
              noGiamTrongKy += txAmount;
            } else if (txTime < startTime) {
              // Thanh toán trước kỳ làm tăng credit (hoặc giảm nợ) trước kỳ
              noDauKy += txAmount;
            }
          }
        } else if (inv.transaction_status === "paid") {
          if (invTime >= startTime && invTime <= endTime) {
            noGiamTrongKy += totalPrice;
          } else if (invTime < startTime) {
            noDauKy += totalPrice;
          }
        }

        // Nhập hàng trước kỳ làm giảm credit (hoặc tăng nợ) trước kỳ
        if (invTime < startTime) {
          noDauKy -= totalPrice;
        }
      }

      // Tính toán trả hàng (SRT)
      for (const ret of allReturns) {
        const retTime = new Date(ret.returned_on || ret.created_on).getTime();
        const retAmount = Number(ret.subtotal || 0);

        if (retTime >= startTime && retTime <= endTime) {
          noGiamTrongKy += retAmount;
        } else if (retTime < startTime) {
          noDauKy += retAmount;
        }
      }

      // Theo công thức chuẩn trên Sapo:
      // Nợ cuối kỳ = Nợ đầu kỳ + Nợ giảm trong kỳ - Nợ tăng trong kỳ
      const noCuoiKy = noDauKy + noGiamTrongKy - noTangTrongKy;

      return NextResponse.json({
        success: true,
        data: {
          period: {
            start_date: startDateStr,
            end_date: endDateStr,
          },
          summary: {
            no_dau_ky: noDauKy,
            no_giam_trong_ky: noGiamTrongKy,
            no_tang_trong_ky: noTangTrongKy,
            no_cuoi_ky: noCuoiKy,
            total_suppliers: await MongoSapoSupplierModel.countDocuments(),
            total_receive_orders: allInventories.length,
            total_returns: allReturns.length,
          },
        },
      });
    }

    // 2. TYPE = SUPPLIERS (Bảng danh sách 23 Nhà cung cấp)
    if (type === "suppliers") {
      const [suppliers, allInventories, allReturns] = await Promise.all([
        MongoSapoSupplierModel.find().sort({ id: 1 }).lean(),
        MongoSapoReceiveInventoryModel.find({ status: { $ne: "cancelled" } }).lean(),
        MongoSapoSupplierReturnModel.find({ status: { $ne: "cancelled" } }).lean(),
      ]);

      // Lập chỉ mục tính toán theo từng NCC
      const supplierMap = new Map<number, {
        noDauKy: number;
        noTangTrongKy: number;
        noGiamTrongKy: number;
        reiCount: number;
        pendingCount: number;
        latestOrderDate: string | null;
      }>();

      for (const s of suppliers) {
        supplierMap.set(s.id, {
          noDauKy: 0,
          noTangTrongKy: 0,
          noGiamTrongKy: 0,
          reiCount: 0,
          pendingCount: 0,
          latestOrderDate: null,
        });
      }

      for (const inv of allInventories) {
        let stats = supplierMap.get(inv.supplier_id);
        if (!stats) {
          stats = {
            noDauKy: 0,
            noTangTrongKy: 0,
            noGiamTrongKy: 0,
            reiCount: 0,
            pendingCount: 0,
            latestOrderDate: null,
          };
          supplierMap.set(inv.supplier_id, stats);
        }

        stats.reiCount++;
        if (inv.transaction_status === "pending") {
          stats.pendingCount++;
        }

        const invTime = new Date(inv.received_on || inv.created_on).getTime();
        const totalPrice = Number(inv.total_price || 0);

        if (!stats.latestOrderDate || new Date(inv.received_on || inv.created_on) > new Date(stats.latestOrderDate)) {
          stats.latestOrderDate = inv.received_on || inv.created_on;
        }

        if (invTime >= startTime && invTime <= endTime) {
          stats.noTangTrongKy += totalPrice;
        } else if (invTime < startTime) {
          stats.noDauKy -= totalPrice;
        }

        // Transactions thanh toán
        if (inv.transactions && inv.transactions.length > 0) {
          for (const tx of inv.transactions) {
            const txDateStr = tx.processed_on || tx.created_on || "";
            const txTime = txDateStr ? new Date(txDateStr).getTime() : 0;
            const txAmount = Number(tx.amount || 0);
            if (txTime >= startTime && txTime <= endTime) {
              stats.noGiamTrongKy += txAmount;
            } else if (txTime < startTime) {
              stats.noDauKy += txAmount;
            }
          }
        } else if (inv.transaction_status === "paid") {
          if (invTime >= startTime && invTime <= endTime) {
            stats.noGiamTrongKy += totalPrice;
          } else if (invTime < startTime) {
            stats.noDauKy += totalPrice;
          }
        }
      }

      // Trả hàng NCC
      for (const ret of allReturns) {
        const stats = supplierMap.get(ret.supplier_id);
        if (stats) {
          const retTime = new Date(ret.returned_on || ret.created_on).getTime();
          const retAmount = Number(ret.subtotal || 0);
          if (retTime >= startTime && retTime <= endTime) {
            stats.noGiamTrongKy += retAmount;
          } else if (retTime < startTime) {
            stats.noDauKy += retAmount;
          }
        }
      }

      // Xây dựng danh sách đầu ra
      let result = suppliers.map((s) => {
        const stats = supplierMap.get(s.id) || {
          noDauKy: 0,
          noTangTrongKy: 0,
          noGiamTrongKy: 0,
          reiCount: 0,
          pendingCount: 0,
          latestOrderDate: null,
        };
        const noCuoiKy = stats.noDauKy + stats.noGiamTrongKy - stats.noTangTrongKy;

        return {
          id: s.id,
          code: s.code || `SUP${s.id}`,
          name: s.name,
          phone: s.phone || "",
          email: s.email || "",
          address: s.address1 || "",
          status: s.status,
          no_dau_ky: stats.noDauKy,
          no_tang_trong_ky: stats.noTangTrongKy,
          no_giam_trong_ky: stats.noGiamTrongKy,
          phai_thu_tra_cuoi_ky: noCuoiKy,
          rei_count: stats.reiCount,
          pending_count: stats.pendingCount,
          latest_order_date: stats.latestOrderDate,
        };
      });

      // Lọc tìm kiếm theo tên hoặc SĐT
      if (search) {
        result = result.filter(
          (s) =>
            s.name.toLowerCase().includes(search) ||
            s.code.toLowerCase().includes(search) ||
            s.phone.toLowerCase().includes(search)
        );
      }

      const totalItems = result.length;
      const totalPages = Math.ceil(totalItems / limit) || 1;
      const paginated = result.slice((page - 1) * limit, page * limit);

      return NextResponse.json({
        success: true,
        data: {
          suppliers: paginated,
          pagination: {
            page,
            limit,
            total: totalItems,
            total_pages: totalPages,
          },
        },
      });
    }

    // 3. TYPE = SUPPLIER_DETAIL (Xem chi tiết đơn nhập & phiếu trả của 1 NCC)
    if (type === "supplier_detail") {
      if (!supplierId) {
        return NextResponse.json({ success: false, message: "Thiếu supplier_id" }, { status: 400 });
      }

      const [supplier, receiveInventories, supplierReturns] = await Promise.all([
        MongoSapoSupplierModel.findOne({ id: supplierId }).lean(),
        MongoSapoReceiveInventoryModel.find({ supplier_id: supplierId }).sort({ received_on: -1, created_on: -1 }).lean(),
        MongoSapoSupplierReturnModel.find({ supplier_id: supplierId }).sort({ returned_on: -1, created_on: -1 }).lean(),
      ]);

      if (!supplier) {
        return NextResponse.json({ success: false, message: "Không tìm thấy nhà cung cấp" }, { status: 404 });
      }

      let noDauKy = 0;
      let noTangTrongKy = 0;
      let noGiamTrongKy = 0;

      for (const inv of receiveInventories) {
        if (inv.status === "cancelled") continue;
        const invTime = new Date(inv.received_on || inv.created_on).getTime();
        const totalPrice = Number(inv.total_price || 0);

        if (invTime >= startTime && invTime <= endTime) {
          noTangTrongKy += totalPrice;
        } else if (invTime < startTime) {
          noDauKy -= totalPrice;
        }

        if (inv.transactions && inv.transactions.length > 0) {
          for (const tx of inv.transactions) {
            const txDateStr = tx.processed_on || tx.created_on || "";
            const txTime = txDateStr ? new Date(txDateStr).getTime() : 0;
            const txAmount = Number(tx.amount || 0);
            if (txTime >= startTime && txTime <= endTime) {
              noGiamTrongKy += txAmount;
            } else if (txTime < startTime) {
              noDauKy += txAmount;
            }
          }
        } else if (inv.transaction_status === "paid") {
          if (invTime >= startTime && invTime <= endTime) {
            noGiamTrongKy += totalPrice;
          } else if (invTime < startTime) {
            noDauKy += totalPrice;
          }
        }
      }

      for (const ret of supplierReturns) {
        if (ret.status === "cancelled") continue;
        const retTime = new Date(ret.returned_on || ret.created_on).getTime();
        const retAmount = Number(ret.subtotal || 0);
        if (retTime >= startTime && retTime <= endTime) {
          noGiamTrongKy += retAmount;
        } else if (retTime < startTime) {
          noDauKy += retAmount;
        }
      }

      const noCuoiKy = noDauKy + noGiamTrongKy - noTangTrongKy;

      return NextResponse.json({
        success: true,
        data: {
          supplier,
          summary: {
            no_dau_ky: noDauKy,
            no_tang_trong_ky: noTangTrongKy,
            no_giam_trong_ky: noGiamTrongKy,
            no_cuoi_ky: noCuoiKy,
            rei_count: receiveInventories.length,
            return_count: supplierReturns.length,
          },
          receive_inventories: receiveInventories,
          supplier_returns: supplierReturns,
        },
      });
    }

    return NextResponse.json({ success: false, message: `Type '${type}' không hợp lệ` }, { status: 400 });
  } catch (error: any) {
    console.error("[Supplier Debts API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi xử lý API công nợ nhà cung cấp",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sapo/debts/suppliers
 * Thanh toán công nợ đơn nhập kho (Tạo transaction trên Sapo)
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { receive_inventory_id, amount, payment_method_id, reference } = body;

    if (!receive_inventory_id || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, message: "Thông tin thanh toán không hợp lệ (cần mã đơn nhập và số tiền > 0)" },
        { status: 400 }
      );
    }

    // 1. Gửi lệnh thanh toán lên Sapo
    const sapoTxRes = await SapoService.createReceiveInventoryTransaction(receive_inventory_id, {
      amount: Number(amount),
      payment_method_id: payment_method_id || 2192344,
      reference: reference || "Thanh toán công nợ nhà cung cấp từ hệ thống nội bộ",
      status: "success",
    });

    const newTx = sapoTxRes.transaction || {
      id: Date.now(),
      amount: Number(amount),
      payment_method_name: "Chuyển khoản",
      status: "success",
      created_on: new Date().toISOString(),
      processed_on: new Date().toISOString(),
    };

    // 2. Cập nhật lại trong MongoDB
    const updatedInv = await MongoSapoReceiveInventoryModel.findOneAndUpdate(
      { id: receive_inventory_id },
      {
        $push: { transactions: newTx },
        $set: { transaction_status: "paid" }, // Có thể đánh dấu paid hoặc pending tùy tổng
      },
      { new: true }
    );

    // Ghi log
    try {
      await LogModel.createLog({
        level: "info",
        type: "sapo_supplier_payment",
        message: `Thanh toán ${Number(amount).toLocaleString()}₫ cho đơn nhập kho ${updatedInv?.code || receive_inventory_id}`,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        message: `Đã tạo giao dịch thanh toán ${Number(amount).toLocaleString()}₫ thành công`,
        transaction: newTx,
      },
    });
  } catch (error: any) {
    console.error("[Supplier Payment API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi khi tạo giao dịch thanh toán cho nhà cung cấp trên Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { apiSuccess, apiError } from "@/server/utils/response";

/**
 * GET /api/test
 * Dùng để kiểm tra nhanh kết nối tới Backend
 */
import { connectToDatabase } from "@/server/db";
import { MongoShopeeOrderModel } from "@/server/db/schema";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");
  const step = request.nextUrl.searchParams.get("step");
  if (action === "test_debt" || action === "db_info" || action === "migrate" || action === "migrate_batch" || step) {
    const t0 = Date.now();
    try {
      if (action === "db_info") {
        const mongoose = await connectToDatabase();
        const total = await MongoShopeeOrderModel.countDocuments();
        const totalRaw = await MongoShopeeOrderModel.countDocuments({ raw_text: { $exists: true, $ne: "" } });
        const colName = MongoShopeeOrderModel.collection.name;
        const dbName = mongoose.connection.name;
        const host = mongoose.connection.host;
        const rawUri = process.env.MONGODB_URI || "";
        const maskedUri = rawUri.replace(/:([^:@]+)@/, ":***@");
        if (request.nextUrl.searchParams.get("full") === "true") {
          return apiSuccess({ rawUri }, "full URI");
        }
        const withUnpaid = await MongoShopeeOrderModel.countDocuments({ unpaid_amount: { $exists: true } });
        const sampleOrder = await MongoShopeeOrderModel.findOne({}).lean().exec();
        return apiSuccess({
          host,
          dbName,
          colName,
          total,
          totalRaw,
          withUnpaid,
          maskedUri,
          sampleOrder: sampleOrder ? { order_sn: sampleOrder.order_sn, hasRaw: Boolean(sampleOrder.raw_text), unpaid_amount: sampleOrder.unpaid_amount } : null,
          time: Date.now() - t0,
        }, "db_info OK");
      }
      if (action === "migrate_batch" || action === "migrate") {
        await connectToDatabase();
        const col = MongoShopeeOrderModel.collection;
        const limit = Math.min(2000, parseInt(request.nextUrl.searchParams.get("limit") || "1000", 10));
        const docs = await col.find(
          { unpaid_amount: { $exists: false } },
          { projection: { _id: 1, raw_text: 1, order_sn: 1, buyer_username: 1, total_amount: 1, id: 1 } }
        ).limit(limit).toArray();

        if (docs.length === 0) {
          await col.createIndex({ unpaid_amount: 1, createdAt: -1 });
          await col.createIndex({ paid_on: 1 });
          return apiSuccess({ remaining: 0, processed: 0, done: true, time: Date.now() - t0 }, "All migrated!");
        }

        const batch = docs.map((doc: any) => {
          let raw: any = {};
          if (doc.raw_text) {
            try { raw = JSON.parse(doc.raw_text); } catch {}
          }
          const totalPrice = Number(raw.total_price || doc.total_amount) || 0;
          const rawReceived = Number(raw.total_received) || 0;
          const outstanding = Number(
            raw.total_outstanding ?? raw.unpaid_amount ?? (totalPrice > rawReceived ? totalPrice - rawReceived : 0)
          );
          const totalReceived = rawReceived > 0 ? rawReceived : Math.max(0, totalPrice - outstanding);
          const phone = raw.customer?.phone || raw.shipping_address?.phone || raw.billing_address?.phone || "";
          const orderSnClean = String(doc.order_sn || "").replace(/^#/, "").trim();
          const rawBuyer = doc.buyer_username && doc.buyer_username.trim() !== "Khách lẻ" ? doc.buyer_username.trim() : "";
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
              .join(", ") || "";
          const sapoId = raw.id || (/^\d+$/.test(doc.id) ? Number(doc.id) : null);
          const customerId = raw.customer?.id || null;
          const financialStatus = raw.financial_status || (outstanding > 0 ? "pending" : "paid");
          const paidOn = raw.paid_on || null;

          return {
            updateOne: {
              filter: { _id: doc._id },
              update: {
                $set: {
                  customer_phone: phone,
                  customer_name: customerName,
                  customer_address: address,
                  customer_id: customerId,
                  sapo_id: sapoId,
                  financial_status: financialStatus,
                  total_received: totalReceived,
                  unpaid_amount: outstanding,
                  paid_on: paidOn,
                }
              }
            }
          };
        });

        const res = await col.bulkWrite(batch, { ordered: false });
        const remaining = await col.countDocuments({ unpaid_amount: { $exists: false } });

        return apiSuccess({
          processed: batch.length,
          modified: res.modifiedCount,
          remaining,
          time: Date.now() - t0,
        }, "Batch OK");
      }
      if (step === "1") {
        await connectToDatabase();
        return apiSuccess({ step: 1, time: Date.now() - t0 }, "connectToDatabase OK");
      }
      if (step === "2") {
        await connectToDatabase();
        const total = await MongoShopeeOrderModel.countDocuments();
        return apiSuccess({ step: 2, total, time: Date.now() - t0 }, "countDocuments OK");
      }
      if (step === "3") {
        await connectToDatabase();
        const dStart = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
        const startDateStr = dStart.toISOString().slice(0, 10);
        const startIsoStr = `${startDateStr}T00:00:00.000Z`;
        const query: any = {
          order_status: { $ne: "Đã hủy" },
          $or: [
            { status_description: { $regex: /pending|partially_paid/i } },
            { createdAt: { $gte: startIsoStr } },
          ],
        };
        const count = await MongoShopeeOrderModel.countDocuments(query);
        return apiSuccess({ step: 3, count, time: Date.now() - t0 }, "countMatchedQuery OK");
      }
      if (step === "4") {
        await connectToDatabase();
        const dStart = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
        const startDateStr = dStart.toISOString().slice(0, 10);
        const startIsoStr = `${startDateStr}T00:00:00.000Z`;
        const query: any = {
          order_status: { $ne: "Đã hủy" },
          $or: [
            { status_description: { $regex: /pending|partially_paid/i } },
            { createdAt: { $gte: startIsoStr } },
          ],
        };
        const docs = await MongoShopeeOrderModel.find(query, {
          order_sn: 1, shop_username: 1, buyer_username: 1, order_status: 1, total_amount: 1, createdAt: 1
        }).lean().exec();
        return apiSuccess({ step: 4, count: docs.length, time: Date.now() - t0 }, "find all matched docs without raw_text OK");
      }
      if (step === "5") {
        await connectToDatabase();
        // ONLY debt orders with raw_text (481 docs)
        const debtDocs = await MongoShopeeOrderModel.find({
          order_status: { $ne: "Đã hủy" },
          status_description: { $regex: /pending|partially_paid/i },
        }, {
          order_sn: 1, shop_username: 1, buyer_username: 1, order_status: 1, total_amount: 1, raw_text: 1, createdAt: 1
        }).lean().exec();
        return apiSuccess({ step: 5, count: debtDocs.length, time: Date.now() - t0 }, "find only debt orders with raw_text OK");
      }
      return apiSuccess({ message: "Specify ?step=1, 2, 3, or 4" });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
    }
  }

  const userAgent = request.headers.get("user-agent") || "unknown";
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

  return apiSuccess(
    {
      status: "online",
      message: "Backend đang hoạt động hoàn toàn bình thường! 🚀",
      serverTime: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      clientInfo: {
        ip,
        userAgent,
      },
    },
    "Kết nối Backend thành công!"
  );
}

/**
 * POST /api/test
 * Dùng để test gửi dữ liệu từ Frontend lên Backend và nhận phản hồi
 */
export async function POST(request: NextRequest) {
  try {
    const rawText = await request.text();
    let body: unknown = null;

    if (rawText && rawText.trim().length > 0) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = rawText;
      }
    }

    return apiSuccess(
      {
        status: "received",
        receivedData: body ?? "Không có body truyền lên",
        receivedAt: new Date().toISOString(),
      },
      "Backend đã nhận và xử lý POST request thành công!"
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Dữ liệu không hợp lệ";
    return apiError(errorMsg, 400, "Không thể xử lý yêu cầu");
  }
}

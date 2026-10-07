import { NextRequest, NextResponse } from "next/server";
import { ProductModel } from "@/server/models/product.model";
import { SapoService } from "@/server/services/sapo.service";
import { connectToDatabase } from "@/server/db";
import { MongoShopeeProductModel } from "@/server/db/schema";

// Headers hỗ trợ CORS để Chrome Extension bắn dữ liệu trực tiếp không bị chặn
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Xử lý preflight CORS request từ Extension
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * POST /api/shopee/products
 * Endpoint nhận dữ liệu đồng bộ sản phẩm từ Chrome Extension
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop_username, products } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, message: "Danh sách sản phẩm rỗng hoặc không đúng định dạng" },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await ProductModel.upsertProducts(products, shop_username || "baobiyensen");

    console.log(
      `[Shopee Product Sync] Đã đồng bộ ${result.total} sản phẩm (Mới: ${result.inserted}, Cập nhật: ${result.updated})`
    );

    return NextResponse.json(
      {
        success: true,
        message: `Đồng bộ thành công ${result.total} sản phẩm (Thêm mới: ${result.inserted}, Cập nhật: ${result.updated})`,
        data: result,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Shopee Product Sync] Lỗi khi xử lý sản phẩm:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi máy chủ khi lưu sản phẩm",
        error: error.message || String(error),
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/shopee/products
 * Endpoint lấy danh sách sản phẩm đã đồng bộ về hệ thống
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reconcile_sapo = searchParams.get("reconcile_sapo") === "true";

    // Nếu có cờ reconcile_sapo=true (khi ấn "Làm mới" trên giao diện kho):
    // Tự động kiểm tra danh sách sản phẩm thực tế từ Sapo để xóa những sản phẩm đã bị xóa trên Sapo
    if (reconcile_sapo) {
      try {
        const activeSapoIds: string[] = [];
        let p = 1;
        while (true) {
          const res = await SapoService.getProductsListSimple(p, 250);
          const list = res?.products || [];
          if (!list.length) break;
          for (const item of list) {
            activeSapoIds.push(String(item.id));
          }
          if (list.length < 250) break;
          p++;
        }

        if (activeSapoIds.length > 0) {
          await connectToDatabase();
          const delRes = await MongoShopeeProductModel.deleteMany({
            shop_username: "sapo_omnichannel",
            item_id: { $nin: activeSapoIds },
          });
          if (delRes.deletedCount > 0) {
            console.log(
              `[Reconcile Sapo] Đã dọn dẹp ${delRes.deletedCount} sản phẩm thừa không còn trên Sapo khỏi cơ sở dữ liệu nội bộ`
            );
          }
        }
      } catch (reconcileErr: any) {
        console.warn("[Reconcile Sapo Error]:", reconcileErr.message);
      }
    }
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const status = searchParams.get("status") || undefined;
    const stock_status = searchParams.get("stock_status") || undefined;
    const search = searchParams.get("search") || undefined;
    const shop_username = searchParams.get("shop_username") || undefined;
    const sortBy = searchParams.get("sortBy") || undefined;
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || undefined;

    const data = await ProductModel.getProducts({
      page,
      limit,
      status,
      stock_status,
      search,
      shop_username,
      sortBy,
      sortOrder,
    });
    const stats = await ProductModel.getStats(shop_username);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...data,
          stats,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/shopee/products
 * Endpoint xóa sản phẩm (theo item_id trong query hoặc danh sách trong body)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const item_id = searchParams.get("item_id");
    const all = searchParams.get("all");

    let itemIds: string[] | undefined = undefined;
    if (item_id) {
      itemIds = [item_id];
    } else if (all === "true" || all === "1") {
      itemIds = undefined; // xóa toàn bộ
    } else {
      try {
        const body = await request.json();
        if (body && Array.isArray(body.item_ids)) {
          itemIds = body.item_ids;
        } else if (body && body.all) {
          itemIds = undefined;
        }
      } catch {
        // không có json body
      }
    }

    const result = await ProductModel.deleteProducts(itemIds);

    return NextResponse.json(
      {
        success: true,
        message: `Đã xóa thành công ${result.deletedCount} sản phẩm`,
        data: result,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

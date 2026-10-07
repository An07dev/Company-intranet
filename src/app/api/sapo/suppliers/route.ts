import { NextRequest, NextResponse } from "next/server";
import { SapoService } from "@/server/services/sapo.service";
import { LogModel } from "@/server/models/log.model";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const data = await SapoService.getSuppliers();
    const suppliers = data.suppliers || [];

    const activeCount = suppliers.filter((s: any) => s.status === "active").length;
    const withPhoneCount = suppliers.filter((s: any) => !!s.phone).length;

    return NextResponse.json({
      success: true,
      data: {
        suppliers,
        stats: {
          total: suppliers.length,
          active: activeCount,
          withPhone: withPhoneCount,
        },
      },
    });
  } catch (error: any) {
    console.error("[Sapo Suppliers API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Không thể lấy danh sách nhà cung cấp từ Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...supplierData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID nhà cung cấp cần cập nhật" },
        { status: 400 }
      );
    }

    const result = await SapoService.updateSupplier(Number(id), supplierData);

    try {
      await LogModel.createLog({
        level: "info",
        type: "supplier_update",
        source: "sapo_supplier_edit",
        shop_username: "sapo_omnichannel",
        message: `Đã cập nhật thông tin nhà cung cấp: ${supplierData.name || id}`,
        details: { id, ...supplierData },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin nhà cung cấp lên Sapo thành công!",
      data: result.supplier,
    });
  } catch (error: any) {
    console.error("[Sapo Update Supplier Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi cập nhật nhà cung cấp lên Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, ...rest } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Tên nhà cung cấp không được để trống" },
        { status: 400 }
      );
    }

    const result = await SapoService.createSupplier({
      name,
      code: code || `SUP${Date.now().toString().slice(-6)}`,
      ...rest,
    });

    try {
      await LogModel.createLog({
        level: "info",
        type: "supplier_create",
        source: "sapo_supplier_create",
        shop_username: "sapo_omnichannel",
        message: `Đã tạo nhà cung cấp mới trên Sapo: ${name}`,
        details: body,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Tạo nhà cung cấp mới trên Sapo thành công!",
      data: result.supplier,
    });
  } catch (error: any) {
    console.error("[Sapo Create Supplier Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi tạo nhà cung cấp mới trên Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID nhà cung cấp cần xóa" },
        { status: 400 }
      );
    }

    const supplierId = Number(id);
    const result = await SapoService.deleteSupplier(supplierId);

    try {
      await LogModel.createLog({
        level: "info",
        type: "supplier_delete",
        source: "sapo_supplier_delete",
        shop_username: "sapo_omnichannel",
        message: `Đã xóa nhà cung cấp trên Sapo (ID: ${supplierId})`,
        details: { id: supplierId, result },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Đã xóa nhà cung cấp trên Sapo thành công!",
      data: result,
    });
  } catch (error: any) {
    console.error("[Sapo Delete Supplier Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi xóa nhà cung cấp trên Sapo",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}


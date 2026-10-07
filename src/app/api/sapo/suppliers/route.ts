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

function parseSapoErrorDetail(
  error: any,
  fallbackMessage: string,
  attemptedCode?: string
): { displayMessage: string; rawError: string } {
  const rawError = error?.message || String(error);
  let extractedJson: any = null;
  const jsonMatch = rawError.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      extractedJson = JSON.parse(jsonMatch[0]);
    } catch {}
  }

  const data = extractedJson || error?.response || {};

  // Case 1: errors là danh sách các lỗi [{ message, fields }]
  if (data?.errors && Array.isArray(data.errors)) {
    const list = data.errors.map((e: any) => {
      if (typeof e === "string") return e;
      const field = e.fields?.length ? `[${e.fields.join(", ")}] ` : "";
      return `${field}${e.message || JSON.stringify(e)}`;
    });
    return { displayMessage: list.join(" • "), rawError };
  }

  // Case 2: errors là object { "field_name": ["lỗi 1", "lỗi 2"] }
  if (data?.errors && typeof data.errors === "object") {
    const list = Object.entries(data.errors).map(([key, val]) => {
      const valStr = Array.isArray(val) ? val.join(", ") : String(val);
      return `Trường "${key}": ${valStr}`;
    });
    return { displayMessage: list.join(" • "), rawError };
  }

  // Case 3: error_description
  if (data?.error_description) {
    return { displayMessage: data.error_description, rawError };
  }

  // Case 4: Lỗi 500 từ Sapo (thường là trùng mã NCC do DB unique constraint)
  if (data?.error === "Internal server error" || rawError.includes("500") || rawError.includes("Internal Server Error")) {
    const codeHint = attemptedCode
      ? `Mã nhà cung cấp "${attemptedCode}" đã tồn tại trong cơ sở dữ liệu Sapo (kể cả những nhà cung cấp đã từng bị xóa). Vui lòng đổi mã khác hoặc để trống ô Mã NCC để Sapo tự động sinh mã mới.`
      : "Máy chủ Sapo phản hồi lỗi 500 (Internal Server Error) do dữ liệu bị trùng lặp hoặc không hợp lệ. Vui lòng để trống ô Mã NCC để hệ thống tự sinh mã.";
    return {
      displayMessage: codeHint,
      rawError,
    };
  }

  if (data?.error) {
    return { displayMessage: String(data.error), rawError };
  }

  return { displayMessage: rawError || fallbackMessage, rawError };
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
    const { displayMessage, rawError } = parseSapoErrorDetail(error, "Lỗi cập nhật nhà cung cấp lên Sapo");
    return NextResponse.json(
      {
        success: false,
        message: displayMessage,
        sapo_detail: displayMessage,
        error: rawError,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let attemptedCode = "";
  try {
    const body = await request.json();
    const { name, code, ...rest } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Tên nhà cung cấp không được để trống" },
        { status: 400 }
      );
    }

    const trimmedCode = code ? String(code).trim() : "";
    attemptedCode = trimmedCode;

    // Sapo yêu cầu: Nếu người dùng tự đặt mã, không được bắt đầu bằng 'SUP' (Sapo dành riêng tiền tố SUP để tự sinh mã)
    if (trimmedCode && /^SUP/i.test(trimmedCode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã nhà cung cấp không được bắt đầu bằng chữ 'SUP' (tiền tố này dành riêng cho hệ thống Sapo tự động sinh mã). Vui lòng chọn mã khác hoặc để trống ô này.",
        },
        { status: 400 }
      );
    }

    const supplierPayload: any = {
      name: name.trim(),
      ...rest,
    };

    // Nếu người dùng nhập mã riêng, gửi mã đó; nếu để trống, bỏ trường code để Sapo tự sinh mã chuẩn
    if (trimmedCode) {
      supplierPayload.code = trimmedCode;
    }

    const result = await SapoService.createSupplier(supplierPayload);

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
    const { displayMessage, rawError } = parseSapoErrorDetail(error, "Lỗi tạo nhà cung cấp mới trên Sapo", attemptedCode);
    return NextResponse.json(
      {
        success: false,
        message: displayMessage,
        sapo_detail: displayMessage,
        error: rawError,
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
    const { displayMessage, rawError } = parseSapoErrorDetail(error, "Lỗi xóa nhà cung cấp trên Sapo");
    return NextResponse.json(
      {
        success: false,
        message: displayMessage,
        sapo_detail: displayMessage,
        error: rawError,
      },
      { status: 500 }
    );
  }
}



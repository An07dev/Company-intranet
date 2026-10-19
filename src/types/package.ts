export type PackageStatus = "draft" | "packed" | "in_transit" | "delivered" | "cancelled";

export interface PackageItem {
  id?: string;
  product_id: string; // item_id / product ID từ kho
  model_id?: string; // ID phân loại nếu có
  product_name: string;
  sku: string;
  variation_name?: string;
  image?: string;
  quantity: number;
  unit_price?: number;
  unit?: string; // Hộp, cái, thùng, kg...
  note?: string;
}

export interface Package {
  id: string;
  code: string; // Mã kiện hàng, e.g. PKG-20261019-XXXX
  title: string; // Tên kiện hàng
  status: PackageStatus;
  package_type: string; // "Đóng hàng xuất", "Chuyển kho", "Đóng sỉ", "Đơn TMĐT", "Lưu kho", "Khác"
  destination?: string; // Điểm đến / Người nhận / Khách hàng / Đại lý / Kho nhận
  warehouse_location?: string; // Vị trí kho lưu kiện (Kệ A1, Dãy B...)
  weight_kg?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  items: PackageItem[];
  total_items: number; // Tổng số lượng sản phẩm (sum of quantity)
  total_sku_count: number; // Số loại mặt hàng
  total_value?: number; // Tổng giá trị hàng trong kiện
  notes?: string;
  created_by?: {
    id?: string;
    name: string;
    email?: string;
  };
  packed_by?: string;
  packed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackageInput {
  code?: string;
  title: string;
  status?: PackageStatus;
  package_type?: string;
  destination?: string;
  warehouse_location?: string;
  weight_kg?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  items: Array<{
    product_id: string;
    model_id?: string;
    product_name: string;
    sku?: string;
    variation_name?: string;
    image?: string;
    quantity: number;
    unit_price?: number;
    unit?: string;
    note?: string;
  }>;
  notes?: string;
}

export interface UpdatePackageInput extends Partial<CreatePackageInput> {
  status?: PackageStatus;
  packed_by?: string;
  packed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
}

export interface PackageFilterParams {
  search?: string;
  status?: string;
  package_type?: string;
  sortBy?: "createdAt" | "total_items" | "title" | "code";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

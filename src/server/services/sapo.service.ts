/**
 * Sapo API Service
 * Cung cấp các hàm kết nối và truy xuất dữ liệu từ Sapo Admin REST API
 * (Cửa hàng: cua-hang-yen-sen.mysapo.net)
 */

const SAPO_DOMAIN = process.env.SAPO_STORE_DOMAIN || "cua-hang-yen-sen.mysapo.net";
const SAPO_API_KEY = process.env.SAPO_API_KEY || "9e84e8ba383f4f99a8cf2487932d4afe";
const SAPO_API_SECRET = process.env.SAPO_API_SECRET || "b4ddea44a45447a1ab29e3680fc76c16";

function getAuthHeader(): string {
  const token = Buffer.from(`${SAPO_API_KEY}:${SAPO_API_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

async function sapoFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `https://${SAPO_DOMAIN}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    Authorization: getAuthHeader(),
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let errorDetail = "";
    try {
      const errJson = await res.json();
      errorDetail = JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(`Sapo API error [${res.status}] ${res.statusText}: ${errorDetail}`);
  }

  return res.json() as Promise<T>;
}

export interface SapoCustomer {
  id: number;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  dob: string | null;
  orders_count: number;
  total_spent: number;
  last_order_id: number | null;
  last_order_name: string | null;
  tags: string;
  note: string | null;
  created_on: string;
  modified_on: string;
  default_address?: {
    id: number;
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    district: string | null;
    ward: string | null;
    phone: string | null;
  } | null;
  addresses?: Array<{
    id: number;
    address1: string | null;
    city: string | null;
    district: string | null;
    ward: string | null;
    phone: string | null;
    default?: boolean;
  }>;
}

export interface SapoSupplier {
  id: number;
  store_id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  description: string | null;
  website: string | null;
  status: "active" | "inactive" | string;
  country: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  address1: string | null;
  address2: string | null;
  created_on: string;
  updated_on: string;
}

export interface SapoPriceRule {
  id: number;
  title: string;
  value_type: string;
  value: number;
  target_type: string;
  starts_at: string;
  ends_at: string | null;
}

export const SapoService = {
  /**
   * Lấy danh sách khách hàng có phân trang và tìm kiếm
   */
  async getCustomers(params?: { page?: number; limit?: number; query?: string }): Promise<{ customers: SapoCustomer[] }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const query = params?.query?.trim();

    let endpoint = `/admin/customers.json?page=${page}&limit=${limit}`;
    if (query) {
      endpoint += `&query=${encodeURIComponent(query)}`;
    }

    return sapoFetch<{ customers: SapoCustomer[] }>(endpoint);
  },

  /**
   * Đếm tổng số khách hàng
   */
  async getCustomersCount(query?: string): Promise<number> {
    try {
      let endpoint = "/admin/customers/count.json";
      if (query?.trim()) {
        endpoint += `?query=${encodeURIComponent(query.trim())}`;
      }
      const data = await sapoFetch<{ count: number }>(endpoint);
      return data.count || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Lấy chi tiết một khách hàng theo ID
   */
  async getCustomerById(id: number | string): Promise<{ customer: SapoCustomer }> {
    return sapoFetch<{ customer: SapoCustomer }>(`/admin/customers/${id}.json`);
  },

  /**
   * Lấy toàn bộ danh sách nhà cung cấp
   */
  async getSuppliers(): Promise<{ suppliers: SapoSupplier[] }> {
    return sapoFetch<{ suppliers: SapoSupplier[] }>("/admin/suppliers.json");
  },

  /**
   * Lấy chi tiết nhà cung cấp theo ID
   */
  async getSupplierById(id: number | string): Promise<{ supplier: SapoSupplier }> {
    return sapoFetch<{ supplier: SapoSupplier }>(`/admin/suppliers/${id}.json`);
  },

  /**
   * Lấy danh sách chương trình khuyến mãi
   */
  async getPriceRules(): Promise<{ price_rules: SapoPriceRule[] }> {
    return sapoFetch<{ price_rules: SapoPriceRule[] }>("/admin/price_rules.json");
  },

  /**
   * Lấy tổng số sản phẩm
   */
  async getProductsCount(): Promise<number> {
    try {
      const data = await sapoFetch<{ count: number }>("/admin/products/count.json");
      return data.count || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Lấy danh sách sản phẩm từ Sapo
   */
  async getProducts(params?: { page?: number; limit?: number }): Promise<any> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    return sapoFetch(`/admin/products.json?page=${page}&limit=${limit}`);
  },

  /**
   * Lấy tổng số đơn hàng
   */
  async getOrdersCount(): Promise<number> {
    try {
      const data = await sapoFetch<{ count: number }>("/admin/orders/count.json");
      return data.count || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Lấy danh sách đơn hàng từ Sapo có phân trang và bộ lọc
   */
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    query?: string;
    name?: string;
  }): Promise<{ orders: any[] }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    let endpoint = `/admin/orders.json?page=${page}&limit=${limit}`;
    if (params?.status) endpoint += `&status=${encodeURIComponent(params.status)}`;
    if (params?.query) endpoint += `&query=${encodeURIComponent(params.query.trim())}`;
    if (params?.name) endpoint += `&name=${encodeURIComponent(params.name.trim())}`;
    return sapoFetch<{ orders: any[] }>(endpoint);
  },

  /**
   * Lấy chi tiết một đơn hàng trên Sapo theo ID
   */
  async getOrderById(id: number | string): Promise<{ order: any }> {
    return sapoFetch<{ order: any }>(`/admin/orders/${id}.json`);
  },

  /**
   * Cập nhật thông tin nhà cung cấp trên Sapo
   */
  async updateSupplier(id: number, supplierData: Partial<SapoSupplier>): Promise<any> {
    return sapoFetch(`/admin/suppliers/${id}.json`, {
      method: "PUT",
      body: JSON.stringify({ supplier: { id, ...supplierData } }),
    });
  },

  /**
   * Tạo nhà cung cấp mới trên Sapo
   */
  async createSupplier(supplierData: Partial<SapoSupplier>): Promise<any> {
    return sapoFetch(`/admin/suppliers.json`, {
      method: "POST",
      body: JSON.stringify({ supplier: supplierData }),
    });
  },

  /**
   * Tạo đơn hàng mới trên Sapo Omnichannel
   */
  async createOrder(orderData: any): Promise<any> {
    return sapoFetch(`/admin/orders.json`, {
      method: "POST",
      body: JSON.stringify({ order: orderData }),
    });
  },

  /**
   * Cập nhật thông tin đơn hàng trên Sapo (ghi chú, tags, người nhận)
   */
  async updateOrder(id: number | string, orderData: any): Promise<any> {
    return sapoFetch(`/admin/orders/${id}.json`, {
      method: "PUT",
      body: JSON.stringify({ order: { id, ...orderData } }),
    });
  },

  /**
   * Đóng đơn hàng trên Sapo (Hoàn tất)
   */
  async closeOrder(id: number | string): Promise<any> {
    return sapoFetch(`/admin/orders/${id}/close.json`, {
      method: "POST",
    });
  },

  /**
   * Mở lại đơn hàng trên Sapo
   */
  async openOrder(id: number | string): Promise<any> {
    return sapoFetch(`/admin/orders/${id}/open.json`, {
      method: "POST",
    });
  },

  /**
   * Hủy đơn hàng trên Sapo
   * Giá trị hợp lệ theo Sapo API: "customer", "fraud", "inventory", "declined", "wrong_item", "duplicate", "contact", "delivery", "other"
   */
  async cancelOrder(id: number | string, reason = "customer"): Promise<any> {
    const validReasons = [
      "customer",
      "fraud",
      "inventory",
      "declined",
      "wrong_item",
      "duplicate",
      "contact",
      "delivery",
      "other",
    ];

    let sapoReason = "customer";
    if (reason && validReasons.includes(reason.toLowerCase())) {
      sapoReason = reason.toLowerCase();
    } else if (reason) {
      const lower = reason.toLowerCase();
      if (lower.includes("khách") || lower.includes("customer")) sapoReason = "customer";
      else if (lower.includes("kho") || lower.includes("hết") || lower.includes("inventory")) sapoReason = "inventory";
      else if (lower.includes("ảo") || lower.includes("lận") || lower.includes("fraud")) sapoReason = "fraud";
      else if (lower.includes("từ chối") || lower.includes("thanh toán") || lower.includes("declined")) sapoReason = "declined";
      else if (lower.includes("nhầm") || lower.includes("sai") || lower.includes("wrong")) sapoReason = "wrong_item";
      else if (lower.includes("trùng") || lower.includes("duplicate")) sapoReason = "duplicate";
      else if (lower.includes("liên hệ") || lower.includes("gọi") || lower.includes("contact")) sapoReason = "contact";
      else if (lower.includes("giao") || lower.includes("vận chuyển") || lower.includes("ship") || lower.includes("delivery")) sapoReason = "delivery";
      else sapoReason = "other";
    }

    return sapoFetch(`/admin/orders/${id}/cancel.json`, {
      method: "POST",
      body: JSON.stringify({ order_cancel: { reason: sapoReason, email: false } }),
    });
  },

  /**
   * Cập nhật số lượng tồn kho của một biến thể trên Sapo (Kiểm kho / Điều chỉnh tồn)
   */
  async updateVariantInventory(variantId: number | string, quantity: number): Promise<any> {
    return sapoFetch(`/admin/variants/${variantId}.json`, {
      method: "PUT",
      body: JSON.stringify({
        variant: {
          id: variantId,
          inventory_management: "bizweb",
          inventory_quantity: Number(quantity),
        },
      }),
    });
  },

  /**
   * Cập nhật thông tin biến thể (giá, SKU, barcode) trên Sapo
   */
  async updateVariant(variantId: number | string, variantData: any): Promise<any> {
    return sapoFetch(`/admin/variants/${variantId}.json`, {
      method: "PUT",
      body: JSON.stringify({ variant: { id: variantId, ...variantData } }),
    });
  },

  /**
   * Cập nhật thông tin sản phẩm trên Sapo
   */
  async updateProduct(productId: number | string, productData: any): Promise<any> {
    return sapoFetch(`/admin/products/${productId}.json`, {
      method: "PUT",
      body: JSON.stringify({ product: { id: productId, ...productData } }),
    });
  },

  /**
   * Tạo mới sản phẩm trên Sapo
   */
  async createProduct(productData: any): Promise<any> {
    return sapoFetch(`/admin/products.json`, {
      method: "POST",
      body: JSON.stringify({ product: productData }),
    });
  },

  /**
   * Xóa sản phẩm khỏi Sapo
   */
  async deleteProduct(productId: number | string): Promise<any> {
    return sapoFetch(`/admin/products/${productId}.json`, {
      method: "DELETE",
    });
  },
};

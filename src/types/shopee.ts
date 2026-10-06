export interface ShopeeOrderItem {
  product_name: string;
  variation?: string;
  quantity: number;
}

export interface ShopeeOrder {
  id?: string;
  order_sn: string;
  shop_username?: string;
  buyer_username: string;
  total_amount: number;
  payment_method: string;
  order_status: string;
  status_description?: string;
  shipping_carrier: string;
  tracking_number?: string;
  items: ShopeeOrderItem[];
  raw_text?: string;
  synced_at: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopeeSyncPayload {
  shop_username: string;
  source: string;
  total_orders: number;
  timestamp: string;
  orders: ShopeeOrder[];
}

export interface ShopeeProductVariation {
  model_id: string;
  name: string;
  sku: string;
  price: number;
  price_display?: string;
  stock: number;
  sales: number;
  image?: string;
}

export interface ShopeeProduct {
  id?: string;
  item_id: string;
  name: string;
  parent_sku?: string;
  image?: string;
  product_url?: string;
  price_min: number;
  price_max: number;
  price_display: string;
  stock: number;
  sales_30d: number;
  views_30d?: string | number;
  status: string;
  variations: ShopeeProductVariation[];
  shop_username?: string;
  synced_at: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopeeProductSyncPayload {
  shop_username: string;
  source: string;
  total_products: number;
  timestamp: string;
  products: ShopeeProduct[];
}

export type LogLevel = "info" | "warn" | "error" | "success";

export type LogType =
  | "order_sync"
  | "product_sync"
  | "alarm_cron"
  | "crawler_dom"
  | "system"
  | string;

export interface ShopeeLog {
  id?: string;
  level: LogLevel;
  type: LogType;
  source: string;
  shop_username?: string;
  message: string;
  details?: Record<string, any>;
  duration_ms?: number;
  createdAt: string;
}

export interface ShopeeLogStats {
  total: number;
  infoCount: number;
  warnCount: number;
  errorCount: number;
  successCount: number;
}

export interface ShopeeLogQueryParams {
  page?: number;
  limit?: number;
  level?: string;
  type?: string;
  source?: string;
  shop_username?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

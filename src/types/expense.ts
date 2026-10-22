export interface PurchaseOrderItem {
  product_id?: number | string;
  variant_id?: number | string;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  line_amount: number;
  current_stock?: number;
  sapo_synced?: boolean;
}

export interface PurchaseOrderTransaction {
  id: number | string;
  amount: number;
  payment_method_name?: string;
  status: string;
  processed_on?: string;
  created_on?: string;
}

export interface PurchaseOrder {
  id: number | string;
  code: string;
  supplier_id: number;
  supplier_name: string;
  supplier_code?: string;
  total_price: number;
  subtotal_price: number;
  paid_amount: number;
  unpaid_amount: number;
  transaction_status: "paid" | "partially" | "pending" | string;
  receipt_status: string;
  status: string;
  received_on: string;
  created_on: string;
  line_items: PurchaseOrderItem[];
  transactions: PurchaseOrderTransaction[];
  note?: string;
  inventory_synced?: boolean;
}

export type RestockUrgency = "critical" | "warning" | "reorder";

export interface RestockSuggestion {
  id: string;
  productId: string | number;
  sku: string;
  name: string;
  image?: string;
  currentStock: number;
  sales30d: number;
  dailyVelocity: number;
  daysRemaining: number;
  suggestedQuantity: number;
  estimatedCost: number;
  estimatedTotal: number;
  preferredSupplier: string;
  supplierId?: number;
  lastPurchasedDate?: string;
  urgency: RestockUrgency;
  reason: string;
}

export interface ExpenseSummaryStats {
  totalSpent: number;
  totalPaid: number;
  totalUnpaid: number;
  totalOrders: number;
  totalItemsReceived: number;
  topSuppliers: Array<{
    name: string;
    totalSpent: number;
    orderCount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    spent: number;
    paid: number;
    orderCount: number;
  }>;
}

export interface RestockProposalsSummary {
  totalSuggestions: number;
  totalEstimatedBudget: number;
  criticalCount: number;
  warningCount: number;
  reorderCount: number;
}

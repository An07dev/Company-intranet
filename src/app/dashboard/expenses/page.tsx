"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  PurchaseOrder,
  RestockSuggestion,
  ExpenseSummaryStats,
  RestockProposalsSummary,
} from "@/types";
import { RouteGuard } from "@/components/common/RouteGuard";
import { LoadingSection } from "@/components/ui/Loading";
import { useToast } from "@/context/ToastContext";
import { PurchaseOrderDetailModal } from "@/components/expenses/PurchaseOrderDetailModal";
import { CreatePurchaseOrderModal } from "@/components/expenses/CreatePurchaseOrderModal";
import { EditPurchaseOrderModal } from "@/components/expenses/EditPurchaseOrderModal";
import { DeletePurchaseOrderModal } from "@/components/expenses/DeletePurchaseOrderModal";

export default function ExpensesPage() {
  const { toast } = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"orders" | "suggestions" | "analytics">("orders");

  // Orders State
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [orderSummary, setOrderSummary] = useState<ExpenseSummaryStats | null>(null);
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Filters for Orders
  const [orderSearch, setOrderSearch] = useState("");
  const [debouncedOrderSearch, setDebouncedOrderSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState<"all" | "7d" | "30d" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Pagination for Orders
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Suggestions State
  const [suggestions, setSuggestions] = useState<RestockSuggestion[]>([]);
  const [suggestionsSummary, setSuggestionsSummary] = useState<RestockProposalsSummary | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionUrgency, setSuggestionUrgency] = useState<"all" | "critical" | "warning" | "reorder">("all");
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [selectedProposalIds, setSelectedProposalIds] = useState<Record<string, boolean>>({});
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});

  // Modals for CRUD
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrderSearch(orderSearch.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [orderSearch]);

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Fetch Purchase Orders
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));

      if (debouncedOrderSearch) params.set("search", debouncedOrderSearch);
      if (selectedSupplierId !== "all") params.set("supplier_id", selectedSupplierId);
      if (selectedStatus !== "all") params.set("status", selectedStatus);

      if (dateRange === "7d") {
        const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        params.set("start_date", d.toISOString().slice(0, 10));
      } else if (dateRange === "30d") {
        const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        params.set("start_date", d.toISOString().slice(0, 10));
      } else if (dateRange === "custom") {
        if (customStartDate) params.set("start_date", customStartDate);
        if (customEndDate) params.set("end_date", customEndDate);
      }

      const res = await fetch(`/api/expenses/purchase-orders?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tải danh sách đơn nhập hàng");
      }

      setOrders(json.data.orders || []);
      setTotalPages(json.data.pagination?.totalPages || 1);
      setTotalRecords(json.data.pagination?.total || 0);
      setOrderSummary(json.data.summary || null);
      if (json.data.suppliers) {
        setSuppliers(json.data.suppliers);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải đơn nhập hàng");
    } finally {
      setLoadingOrders(false);
    }
  }, [currentPage, pageSize, debouncedOrderSearch, selectedSupplierId, selectedStatus, dateRange, customStartDate, customEndDate, toast]);

  // Fetch Suggestions
  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const params = new URLSearchParams();
      if (suggestionUrgency !== "all") params.set("urgency", suggestionUrgency);
      if (suggestionSearch.trim()) params.set("search", suggestionSearch.trim());

      const res = await fetch(`/api/expenses/suggestions?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tải đề xuất nhập hàng");
      }

      const list: RestockSuggestion[] = json.data.suggestions || [];
      setSuggestions(list);
      setSuggestionsSummary(json.data.summary || null);

      // Khởi tạo custom quantities
      const initialQty: Record<string, number> = {};
      list.forEach((s) => {
        initialQty[s.id] = s.suggestedQuantity;
      });
      setCustomQuantities(initialQty);
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải đề xuất nhập hàng");
    } finally {
      setLoadingSuggestions(false);
    }
  }, [suggestionUrgency, suggestionSearch, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (activeTab === "suggestions" && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [activeTab, suggestions.length, fetchSuggestions]);

  // Tính tổng ngân sách của các đề xuất đã được tích chọn
  const { selectedProposalsTotalBudget, selectedProposalsCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    suggestions.forEach((s) => {
      if (selectedProposalIds[s.id]) {
        count += 1;
        const qty = customQuantities[s.id] || s.suggestedQuantity;
        total += qty * s.estimatedCost;
      }
    });
    return { selectedProposalsTotalBudget: total, selectedProposalsCount: count };
  }, [suggestions, selectedProposalIds, customQuantities]);

  // Thao tác chọn đề xuất
  const handleToggleSelectProposal = (id: string) => {
    setSelectedProposalIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAllCritical = () => {
    const next: Record<string, boolean> = { ...selectedProposalIds };
    suggestions.forEach((s) => {
      if (s.urgency === "critical") {
        next[s.id] = true;
      }
    });
    setSelectedProposalIds(next);
    toast.success("Đã chọn toàn bộ sản phẩm khẩn cấp");
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    suggestions.forEach((s) => {
      next[s.id] = true;
    });
    setSelectedProposalIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedProposalIds({});
  };

  // Xuất file Excel
  const handleExportExcel = (mode: "orders" | "suggestions" | "all") => {
    window.open(`/api/expenses/export?mode=${mode}`, "_blank");
  };

  return (
    <RouteGuard>
      <div className="space-y-6 pb-12 animate-in fade-in duration-300">
        {/* 1. Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl shadow-md shadow-emerald-500/20 shrink-0">
              💸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Quản Lý Chi Tiêu & Đơn Nhập Hàng
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Kiểm soát ngân sách, quản lý phiếu nhập hàng và đề xuất số lượng đặt hàng tối ưu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleExportExcel(activeTab === "suggestions" ? "suggestions" : "orders")}
              id="export-excel-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition shadow-2xs cursor-pointer"
            >
              <span>📊</span>
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              id="create-purchase-order-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <span>+</span>
              <span>Thêm đơn nhập</span>
            </button>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Tổng chi phí nhập hàng */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">Tổng chi phí nhập hàng</span>
              <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">
                💰
              </span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {formatCurrency(orderSummary?.totalSpent)}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                {orderSummary?.totalOrders || 0} đơn nhập • {orderSummary?.totalItemsReceived.toLocaleString("vi-VN") || 0} sản phẩm
              </span>
            </div>
          </div>

          {/* Card 2: Thực chi đã thanh toán */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-zinc-900 border border-emerald-200/60 dark:border-emerald-900/50 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
              <span className="font-medium">Thực chi đã thanh toán</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">
                ✓
              </span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                {formatCurrency(orderSummary?.totalPaid)}
              </span>
              <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 block mt-0.5">
                Dòng tiền đã xuất quỹ cho NCC
              </span>
            </div>
          </div>

          {/* Card 3: Công nợ còn phải trả */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-rose-50/40 to-white dark:from-rose-950/20 dark:to-zinc-900 border border-rose-200/60 dark:border-rose-900/50 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400">
              <span className="font-medium">Công nợ NCC còn nợ</span>
              <span className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm">
                ⏳
              </span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-2xl font-black font-mono text-rose-700 dark:text-rose-400">
                {formatCurrency(orderSummary?.totalUnpaid)}
              </span>
              <span className="text-[11px] text-rose-600/80 dark:text-rose-400/70 block mt-0.5">
                Cần cân đối dòng tiền chi trả
              </span>
            </div>
          </div>

          {/* Card 4: Đề xuất nhập hàng (Highlight) */}
          <div
            onClick={() => setActiveTab("suggestions")}
            className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-950/40 dark:to-orange-950/20 border border-amber-300/80 dark:border-amber-700/60 shadow-xs relative overflow-hidden cursor-pointer hover:border-amber-400 transition"
          >
            <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold flex items-center gap-1">
                <span>💡</span> Đề xuất nhập hàng
              </span>
              <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center text-sm font-bold">
                {suggestionsSummary?.totalSuggestions || "..."}
              </span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-2xl font-black font-mono text-amber-900 dark:text-amber-200">
                {formatCurrency(suggestionsSummary?.totalEstimatedBudget)}
              </span>
              <span className="text-[11px] text-amber-700 dark:text-amber-300 block mt-0.5">
                {suggestionsSummary?.criticalCount || 0} sản phẩm khẩn cấp hết hàng
              </span>
            </div>
          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-100/80 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-fit">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${activeTab === "orders"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
          >
            <span>📦</span>
            <span>Đơn Nhập Hàng</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono">
              {totalRecords}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("suggestions")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${activeTab === "suggestions"
                ? "bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-300 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
          >
            <span>💡</span>
            <span>Đề Xuất Nhập Hàng</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono font-bold">
              {suggestionsSummary?.totalSuggestions || suggestions.length || "0"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${activeTab === "analytics"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
          >
            <span>📊</span>
            <span>Phân Tích Chi Tiêu</span>
          </button>
        </div>

        {/* 4. TAB 1: Danh sách Đơn Nhập Hàng (Thêm / Sửa / Xóa) */}
        {activeTab === "orders" && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs p-5 sm:p-6 space-y-4">
            {/* Filters bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm mã đơn, tên NCC, SKU..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute left-3 top-2.5 text-zinc-400 text-xs">🔍</span>
                {orderSearch && (
                  <button
                    onClick={() => setOrderSearch("")}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Supplier Filter */}
              <div>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => {
                    setSelectedSupplierId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Tất cả Nhà cung cấp ({suppliers.length})</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Tất cả trạng thái thanh toán</option>
                  <option value="paid">✓ Đã thanh toán</option>
                  <option value="partially">⚡ Thanh toán 1 phần</option>
                  <option value="pending">⏳ Chưa thanh toán (Còn nợ)</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Toàn bộ thời gian</option>
                  <option value="7d">7 ngày gần nhất</option>
                  <option value="30d">30 ngày gần nhất</option>
                  <option value="custom">Tùy chọn ngày...</option>
                </select>
              </div>
            </div>

            {/* Custom Date Picker (if selected) */}
            {dateRange === "custom" && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
                <span className="font-semibold text-zinc-600 dark:text-zinc-300">Từ ngày:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
                <span className="font-semibold text-zinc-600 dark:text-zinc-300">Đến ngày:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>
            )}

            {/* Orders Table with Action Buttons */}
            <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-100/70 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                      <th className="py-3 px-4 font-semibold">Mã đơn & Ngày nhập</th>
                      <th className="py-3 px-4 font-semibold">Nhà cung cấp</th>
                      <th className="py-3 px-4 font-semibold text-center">Số SP</th>
                      <th className="py-3 px-4 font-semibold text-right">Tổng tiền</th>
                      <th className="py-3 px-4 font-semibold text-right">Đã trả</th>
                      <th className="py-3 px-4 font-semibold text-right">Còn nợ</th>
                      <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                      <th className="py-3 px-4 font-semibold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                    {loadingOrders ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <LoadingSection text="Đang tải dữ liệu đơn nhập kho..." size="sm" />
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-400">
                          Không tìm thấy đơn nhập hàng nào. Bạn có thể nhấn <strong>"Thêm đơn nhập"</strong> để tạo mới!
                        </td>
                      </tr>
                    ) : (
                      orders.map((ord) => {
                        const isPaid = ord.transaction_status === "paid" || ord.unpaid_amount <= 0;
                        const isPartial = !isPaid && ord.paid_amount > 0;

                        return (
                          <tr
                            key={ord.id}
                            className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                  {ord.code}
                                </span>
                                {ord.inventory_synced && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                    title="Đã đồng bộ tồn kho Sapo"
                                  >
                                    ⚡ Sapo
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-400 block mt-0.5">
                                {formatDate(ord.received_on)}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block truncate max-w-[180px]">
                                {ord.supplier_name}
                              </span>
                              {ord.supplier_code && (
                                <span className="text-[10px] text-zinc-400 font-mono block">
                                  {ord.supplier_code}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center font-mono text-zinc-600 dark:text-zinc-300">
                              {(ord.line_items || []).length}
                            </td>

                            <td className="py-3 px-4 text-right font-bold font-mono text-zinc-900 dark:text-zinc-100">
                              {formatCurrency(ord.total_price)}
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(ord.paid_amount)}
                            </td>

                            <td className="py-3 px-4 text-right font-bold font-mono text-rose-600 dark:text-rose-400">
                              {ord.unpaid_amount > 0 ? formatCurrency(ord.unpaid_amount) : "—"}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${isPaid
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                    : isPartial
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                  }`}
                              >
                                {isPaid ? "Đã trả" : isPartial ? "Một phần" : "Còn nợ"}
                              </span>
                            </td>

                            {/* Cột Thao tác: Xem, Sửa, Xóa */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrder(ord);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                                  title="Xem chi tiết"
                                >
                                  👁️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrderToEdit(ord);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition cursor-pointer"
                                  title="Chỉnh sửa đơn nhập"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrderToDelete(ord);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                                  title="Xóa đơn nhập"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)} trong tổng số {totalRecords} đơn
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                  >
                    Trang trước
                  </button>
                  <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. TAB 2: Đề Xuất Nhập Hàng Thông Minh */}
        {activeTab === "suggestions" && (
          <div className="space-y-4">
            {/* Thanh điều khiển đề xuất & Dự toán ngân sách */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <h3 className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-200">
                    Kế Hoạch & Dự Toán Chi Tiêu Nhập Hàng
                  </h3>
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 max-w-2xl leading-relaxed">
                  Thuật toán tự động phân tích tốc độ bán ra 30 ngày gần nhất kết hợp lượng tồn kho thực tế và đơn giá nhập lịch sử từ các đơn NCC để đưa ra số lượng cần nhập tối ưu nhất.
                </p>
              </div>

              {/* Khối dự toán ngân sách đã tích chọn */}
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 border border-amber-300/80 dark:border-amber-800/60 shadow-xs flex items-center justify-between sm:justify-start gap-4 shrink-0">
                <div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-medium">
                    Đã chọn ({selectedProposalsCount} mặt hàng)
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedProposalsTotalBudget)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleExportExcel("suggestions")}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>📑</span>
                    <span>Xuất phiếu đặt hàng</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter buttons & Actions */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSuggestionUrgency("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${suggestionUrgency === "all"
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                >
                  Tất cả ({suggestionsSummary?.totalSuggestions || suggestions.length})
                </button>
                <button
                  onClick={() => setSuggestionUrgency("critical")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${suggestionUrgency === "critical"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                    }`}
                >
                  <span>🔴</span>
                  <span>Khẩn cấp ({suggestionsSummary?.criticalCount || 0})</span>
                </button>
                <button
                  onClick={() => setSuggestionUrgency("warning")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${suggestionUrgency === "warning"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                    }`}
                >
                  <span>🟡</span>
                  <span>Cảnh báo ({suggestionsSummary?.warningCount || 0})</span>
                </button>
                <button
                  onClick={() => setSuggestionUrgency("reorder")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${suggestionUrgency === "reorder"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                    }`}
                >
                  <span>🟢</span>
                  <span>Định kỳ ({suggestionsSummary?.reorderCount || 0})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAllCritical}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer"
                >
                  Chọn hết khẩn cấp
                </button>
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {/* Suggestions List */}
            {loadingSuggestions ? (
              <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <LoadingSection text="Đang phân tích tồn kho và tính toán đề xuất nhập hàng..." size="md" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-zinc-400">
                Hiện tại lượng tồn kho các sản phẩm đều đang ở mức an toàn, không có mặt hàng nào cần nhập thêm!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {suggestions.map((sug) => {
                  const isSelected = Boolean(selectedProposalIds[sug.id]);
                  const currentQty = customQuantities[sug.id] ?? sug.suggestedQuantity;
                  const calculatedTotal = currentQty * sug.estimatedCost;

                  return (
                    <div
                      key={sug.id}
                      className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 relative flex flex-col justify-between ${isSelected
                          ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700 shadow-sm"
                          : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs"
                        }`}
                    >
                      <div>
                        {/* Top: Checkbox, Badge & Urgency */}
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-3 cursor-pointer min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectProposal(sug.id)}
                              className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                                {sug.name}
                              </h4>
                              <span className="font-mono text-xs text-zinc-400 block mt-0.5">
                                SKU: {sug.sku}
                              </span>
                            </div>
                          </label>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${sug.urgency === "critical"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-900"
                                : sug.urgency === "warning"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                              }`}
                          >
                            {sug.urgency === "critical" ? "🔴 Hết hàng" : sug.urgency === "warning" ? "🟡 Tồn thấp" : "🟢 Đặt thêm"}
                          </span>
                        </div>

                        {/* Lý do đề xuất */}
                        <div className="mt-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-[11px] text-zinc-600 dark:text-zinc-400">
                          {sug.reason}
                        </div>

                        {/* Thống kê tồn vs bán */}
                        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                          <div className="p-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 block">Tồn kho</span>
                            <span
                              className={`font-bold font-mono text-xs ${sug.currentStock <= 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-800 dark:text-zinc-200"
                                }`}
                            >
                              {sug.currentStock}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 block">Bán 30d</span>
                            <span className="font-bold font-mono text-xs text-zinc-800 dark:text-zinc-200">
                              {sug.sales30d}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 block">Còn bán (ngày)</span>
                            <span className="font-bold font-mono text-xs text-zinc-800 dark:text-zinc-200">
                              {sug.daysRemaining > 90 ? "90+" : sug.daysRemaining}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom: Custom quantity & estimated budget */}
                      <div className="mt-4 pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                            SL đề xuất:
                          </span>
                          <input
                            type="number"
                            min="1"
                            value={currentQty}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setCustomQuantities((prev) => ({ ...prev, [sug.id]: val }));
                            }}
                            className="w-16 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold font-mono text-center focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                          />
                          <span className="text-[11px] text-zinc-400">
                            × {formatCurrency(sug.estimatedCost)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 block">Dự toán:</span>
                          <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(calculatedTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 6. TAB 3: Phân Tích & Báo Cáo Chi Tiêu */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Xu hướng chi tiêu theo tháng */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>📈</span> Xu hướng chi tiêu nhập hàng (6 tháng gần nhất)
                  </h3>
                </div>

                <div className="space-y-3 pt-2">
                  {orderSummary?.monthlyTrend && orderSummary.monthlyTrend.length > 0 ? (
                    orderSummary.monthlyTrend.map((item) => {
                      const maxSpent = Math.max(
                        ...orderSummary.monthlyTrend.map((m) => m.spent),
                        1
                      );
                      const pct = Math.min(100, Math.round((item.spent / maxSpent) * 100));

                      return (
                        <div key={item.month} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold font-mono text-zinc-700 dark:text-zinc-300">
                              Tháng {item.month}
                            </span>
                            <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold">
                              {formatCurrency(item.spent)} ({item.orderCount} đơn)
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-zinc-400 text-xs">
                      Chưa có đủ dữ liệu theo tháng
                    </div>
                  )}
                </div>
              </div>

              {/* Top 5 Nhà cung cấp chiếm nhiều chi phí nhất */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>🏢</span> Cơ cấu chi tiêu theo Nhà cung cấp
                  </h3>
                </div>

                <div className="space-y-3 pt-2">
                  {orderSummary?.topSuppliers && orderSummary.topSuppliers.length > 0 ? (
                    orderSummary.topSuppliers.map((sup) => (
                      <div key={sup.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                            {sup.name}
                          </span>
                          <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold">
                            {formatCurrency(sup.totalSpent)} ({sup.percentage}%)
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                          <div
                            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${sup.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-zinc-400 text-xs">
                      Chưa có dữ liệu nhà cung cấp
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xem chi tiết đơn nhập */}
        <PurchaseOrderDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />

        {/* Modal Tạo đơn nhập mới */}
        <CreatePurchaseOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          suppliers={suppliers}
          onOrderCreated={() => {
            fetchOrders();
            if (activeTab === "suggestions") fetchSuggestions();
          }}
        />

        {/* Modal Chỉnh sửa đơn nhập */}
        <EditPurchaseOrderModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setOrderToEdit(null);
          }}
          order={orderToEdit}
          suppliers={suppliers}
          onOrderUpdated={() => {
            fetchOrders();
            if (activeTab === "suggestions") fetchSuggestions();
          }}
        />

        {/* Modal Xóa đơn nhập */}
        <DeletePurchaseOrderModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setOrderToDelete(null);
          }}
          order={orderToDelete}
          onOrderDeleted={() => {
            fetchOrders();
            if (activeTab === "suggestions") fetchSuggestions();
          }}
        />
      </div>
    </RouteGuard>
  );
}

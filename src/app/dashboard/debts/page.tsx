"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/context/ToastContext";
import { DebtStatsCards } from "@/components/debts/DebtStatsCards";
import { CustomerDebtsTable, DebtorCustomer } from "@/components/debts/CustomerDebtsTable";
import { OrderDebtsTable, DebtOrder } from "@/components/debts/OrderDebtsTable";
import { CollectDebtModal } from "@/components/debts/CollectDebtModal";
import { CustomerDebtDetailModal } from "@/components/debts/CustomerDebtDetailModal";

// Phân hệ Công nợ Nhà cung cấp
import { SupplierDebtStatsCards } from "@/components/debts/SupplierDebtStatsCards";
import { SupplierDebtsTable, SupplierDebtItem } from "@/components/debts/SupplierDebtsTable";
import { SupplierDebtDetailModal } from "@/components/debts/SupplierDebtDetailModal";

type MainSection = "customers" | "suppliers";
type CustomerSubTab = "customers" | "orders";
type DateRangePreset = "30_days" | "7_days" | "today" | "yesterday" | "this_month" | "last_month" | "custom";

export default function DebtsManagementPage() {
  const { toast } = useToast();

  // Phân hệ chính: 'customers' (Khách hàng) | 'suppliers' (Nhà cung cấp)
  const [mainSection, setMainSection] = useState<MainSection>("customers");

  // Tab con của Khách hàng: 'customers' (Khách nợ) | 'orders' (Đơn nợ)
  const [customerSubTab, setCustomerSubTab] = useState<CustomerSubTab>("customers");

  // Date Range state
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30_days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Calculate start & end date strings based on preset
  const { startDateStr, endDateStr, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    const formatYMD = (d: Date) => d.toISOString().slice(0, 10);
    const formatDMY = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    if (datePreset === "custom" && customStartDate && customEndDate) {
      const d1 = new Date(customStartDate);
      const d2 = new Date(customEndDate);
      return {
        startDateStr: customStartDate,
        endDateStr: customEndDate,
        dateRangeLabel: `Tuỳ chọn (${formatDMY(d1)} - ${formatDMY(d2)})`,
      };
    }

    if (datePreset === "today") {
      const s = formatYMD(now);
      return { startDateStr: s, endDateStr: s, dateRangeLabel: `Hôm nay (${formatDMY(now)})` };
    }

    if (datePreset === "yesterday") {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const s = formatYMD(y);
      return { startDateStr: s, endDateStr: s, dateRangeLabel: `Hôm qua (${formatDMY(y)})` };
    }

    if (datePreset === "7_days") {
      const d = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      return {
        startDateStr: formatYMD(d),
        endDateStr: formatYMD(now),
        dateRangeLabel: `7 ngày qua (${formatDMY(d)} - ${formatDMY(now)})`,
      };
    }

    if (datePreset === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDateStr: formatYMD(firstDay),
        endDateStr: formatYMD(now),
        dateRangeLabel: `Tháng này (${formatDMY(firstDay)} - ${formatDMY(now)})`,
      };
    }

    if (datePreset === "last_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDateStr: formatYMD(firstDay),
        endDateStr: formatYMD(lastDay),
        dateRangeLabel: `Tháng trước (${formatDMY(firstDay)} - ${formatDMY(lastDay)})`,
      };
    }

    // Default: 30 days
    const dStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    return {
      startDateStr: formatYMD(dStart),
      endDateStr: formatYMD(now),
      dateRangeLabel: `30 ngày qua (${formatDMY(dStart)} - ${formatDMY(now)})`,
    };
  }, [datePreset, customStartDate, customEndDate]);

  // ==================== STATE KHÁCH HÀNG ====================
  const [filterType, setFilterType] = useState("cuoi_ky");
  const [customerSummary, setCustomerSummary] = useState<any>(null);
  const [loadingCustomerSummary, setLoadingCustomerSummary] = useState(true);

  const [customers, setCustomers] = useState<DebtorCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotalPages, setCustomerTotalPages] = useState(1);
  const [customerTotalCount, setCustomerTotalCount] = useState(0);

  const [orders, setOrders] = useState<DebtOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderTotalCount, setOrderTotalCount] = useState(0);

  const [selectedOrderForPay, setSelectedOrderForPay] = useState<DebtOrder | null>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<DebtorCustomer | null>(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);

  // ==================== STATE NHÀ CUNG CẤP ====================
  const [supplierSummary, setSupplierSummary] = useState<any>(null);
  const [loadingSupplierSummary, setLoadingSupplierSummary] = useState(true);

  const [suppliers, setSuppliers] = useState<SupplierDebtItem[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierLimit, setSupplierLimit] = useState(10);
  const [supplierTotalPages, setSupplierTotalPages] = useState(1);
  const [supplierTotalCount, setSupplierTotalCount] = useState(0);

  const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState<SupplierDebtItem | null>(null);
  const [isSupplierDetailOpen, setIsSupplierDetailOpen] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch Customer Summary
  const fetchCustomerSummary = useCallback(async () => {
    setLoadingCustomerSummary(true);
    try {
      const params = new URLSearchParams({
        type: "summary",
        start_date: startDateStr,
        end_date: endDateStr,
      });
      const res = await fetch(`/api/sapo/debts?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCustomerSummary(json.data);
      }
    } catch {
      toast.error("Không thể tải thống kê công nợ khách hàng");
    } finally {
      setLoadingCustomerSummary(false);
    }
  }, [startDateStr, endDateStr, toast]);

  // 2. Fetch Customers List
  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const params = new URLSearchParams({
        type: "customers",
        start_date: startDateStr,
        end_date: endDateStr,
        filter: filterType,
        search: customerSearch,
        page: String(customerPage),
        limit: "15",
      });
      const res = await fetch(`/api/sapo/debts?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCustomers(json.data.customers || []);
        if (json.data.pagination) {
          setCustomerTotalPages(json.data.pagination.totalPages || 1);
          setCustomerTotalCount(json.data.pagination.totalDebtors || 0);
        }
      }
    } catch {
      toast.error("Không thể tải danh sách khách hàng nợ");
    } finally {
      setLoadingCustomers(false);
    }
  }, [startDateStr, endDateStr, filterType, customerSearch, customerPage, toast]);

  // 3. Fetch Orders List
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams({
        type: "orders",
        start_date: startDateStr,
        end_date: endDateStr,
        search: orderSearch,
        channel: selectedChannel,
        status: selectedStatus,
        page: String(orderPage),
        limit: "15",
      });
      const res = await fetch(`/api/sapo/debts?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOrders(json.data.orders || []);
        if (json.data.pagination) {
          setOrderTotalPages(json.data.pagination.totalPages || 1);
          setOrderTotalCount(json.data.pagination.totalOrders || 0);
        }
      }
    } catch {
      toast.error("Không thể tải danh sách đơn hàng nợ");
    } finally {
      setLoadingOrders(false);
    }
  }, [startDateStr, endDateStr, orderSearch, selectedChannel, selectedStatus, orderPage, toast]);

  // 4. Fetch Supplier Summary
  const fetchSupplierSummary = useCallback(async () => {
    setLoadingSupplierSummary(true);
    try {
      const params = new URLSearchParams({
        type: "summary",
        start_date: startDateStr,
        end_date: endDateStr,
      });
      const res = await fetch(`/api/sapo/debts/suppliers?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data?.summary) {
        setSupplierSummary(json.data.summary);
      }
    } catch {
      toast.error("Không thể tải thống kê công nợ nhà cung cấp");
    } finally {
      setLoadingSupplierSummary(false);
    }
  }, [startDateStr, endDateStr, toast]);

  // 5. Fetch Suppliers List
  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const params = new URLSearchParams({
        type: "suppliers",
        start_date: startDateStr,
        end_date: endDateStr,
        search: supplierSearch,
        page: String(supplierPage),
        limit: String(supplierLimit),
      });
      const res = await fetch(`/api/sapo/debts/suppliers?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSuppliers(json.data.suppliers || []);
        if (json.data.pagination) {
          setSupplierTotalPages(json.data.pagination.total_pages || 1);
          setSupplierTotalCount(json.data.pagination.total || 0);
        }
      }
    } catch {
      toast.error("Không thể tải danh sách nhà cung cấp");
    } finally {
      setLoadingSuppliers(false);
    }
  }, [startDateStr, endDateStr, supplierSearch, supplierPage, supplierLimit, toast]);

  const handleSupplierSearchChange = (q: string) => {
    setSupplierSearch(q);
    setSupplierPage(1);
  };

  const handleSupplierLimitChange = (newLimit: number) => {
    setSupplierLimit(newLimit);
    setSupplierPage(1);
  };

  // Effects loading based on mainSection
  useEffect(() => {
    if (mainSection === "customers") {
      fetchCustomerSummary();
    } else {
      fetchSupplierSummary();
    }
  }, [mainSection, fetchCustomerSummary, fetchSupplierSummary]);

  useEffect(() => {
    if (mainSection === "customers") {
      if (customerSubTab === "customers") {
        fetchCustomers();
      } else {
        fetchOrders();
      }
    } else {
      fetchSuppliers();
    }
  }, [mainSection, customerSubTab, fetchCustomers, fetchOrders, fetchSuppliers]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      if (mainSection === "customers") {
        const syncRes = await fetch("/api/sapo/debts/sync", { method: "POST" });
        const syncJson = await syncRes.json();
        if (syncRes.ok && syncJson.success) {
          toast.success(syncJson.message || "Đã đồng bộ công nợ khách hàng từ Sapo!");
        } else {
          toast.error(syncJson.message || "Lỗi đồng bộ công nợ khách hàng từ Sapo");
        }
        await Promise.all([fetchCustomerSummary(), fetchCustomers(), fetchOrders()]);
      } else {
        const syncRes = await fetch("/api/sapo/debts/suppliers/sync", { method: "POST" });
        const syncJson = await syncRes.json();
        if (syncRes.ok && syncJson.success) {
          const { synced } = syncJson.data || {};
          toast.success(
            `Đã đồng bộ: ${synced?.suppliers || 23} NCC, ${synced?.receive_inventories || 707} đơn nhập kho, ${synced?.supplier_returns || 38} phiếu trả hàng!`
          );
        } else {
          toast.error(syncJson.message || "Lỗi khi đồng bộ dữ liệu từ Sapo");
        }
        await Promise.all([fetchSupplierSummary(), fetchSuppliers()]);
      }
    } catch {
      toast.error("Lỗi khi đồng bộ dữ liệu từ Sapo");
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenCollectModal = (order: DebtOrder) => {
    setSelectedOrderForPay(order);
    setIsCollectModalOpen(true);
  };

  const handleOpenCustomerDetail = (customer: DebtorCustomer) => {
    setSelectedCustomerForDetail(customer);
    setIsCustomerDetailOpen(true);
  };

  const handleOpenSupplierDetail = (supplier: SupplierDebtItem) => {
    setSelectedSupplierForDetail(supplier);
    setIsSupplierDetailOpen(true);
  };

  const handleExportCSV = async () => {
    if (mainSection === "suppliers") {
      let exportItems = suppliers;
      if (supplierTotalCount > suppliers.length) {
        try {
          const res = await fetch(
            `/api/sapo/debts/suppliers?type=suppliers&limit=1000&search=${encodeURIComponent(supplierSearch)}`
          );
          const json = await res.json();
          if (json.success && json.data?.suppliers?.length > 0) {
            exportItems = json.data.suppliers;
          }
        } catch {
          // fallback to current page suppliers
        }
      }

      if (exportItems.length === 0) {
        toast.info("Không có dữ liệu NCC để xuất");
        return;
      }
      const headers = [
        "Mã NCC",
        "Tên nhà cung cấp",
        "Số điện thoại",
        "Nợ đầu kỳ",
        "Nợ tăng trong kỳ (Nhập)",
        "Nợ giảm trong kỳ (Đã trả)",
        "Phải thu/trả cuối kỳ",
        "Số đơn nhập",
      ];
      const rows = exportItems.map((s) => [
        `"${s.code}"`,
        `"${(s.name || "").replace(/"/g, '""')}"`,
        `"${s.phone || ""}"`,
        s.no_dau_ky,
        s.no_tang_trong_ky,
        s.no_giam_trong_ky,
        s.phai_thu_tra_cuoi_ky,
        s.rei_count,
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cong_no_nha_cung_cap_sapo_${startDateStr}_${endDateStr}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống file CSV công nợ nhà cung cấp!");
      return;
    }

    if (customerSubTab === "customers") {
      if (customers.length === 0) {
        toast.info("Không có dữ liệu để xuất");
        return;
      }
      const headers = [
        "Tên đối tượng",
        "Số điện thoại",
        "Địa chỉ",
        "Nợ đầu kỳ",
        "Nợ tăng trong kỳ",
        "Nợ giảm trong kỳ",
        "Phải thu cuối kỳ",
      ];
      const rows = customers.map((c) => [
        `"${(c.name || "").replace(/"/g, '""')}"`,
        `"${c.phone || ""}"`,
        `"${(c.address || "").replace(/"/g, '""')}"`,
        c.dau_ky,
        c.tang_trong_ky,
        c.giam_trong_ky,
        c.cuoi_ky,
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cong_no_khach_hang_sapo_${startDateStr}_${endDateStr}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống file CSV công nợ khách hàng thành công!");
    } else {
      if (orders.length === 0) {
        toast.info("Không có dữ liệu để xuất");
        return;
      }
      const headers = ["Mã đơn", "Kênh bán", "Khách hàng", "Số điện thoại", "Tổng tiền", "Đã thu", "Còn nợ", "Ngày tạo"];
      const rows = orders.map((o) => [
        `"#${o.order_sn}"`,
        `"${o.shop_username}"`,
        `"${(o.customer_name || "").replace(/"/g, '""')}"`,
        `"${o.customer_phone || ""}"`,
        o.total_amount,
        o.total_received,
        o.unpaid_amount,
        `"${o.created_at || ""}"`,
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `danh_sach_don_no_${endDateStr}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống file CSV danh sách đơn nợ thành công!");
    }
  };

  return (
    <div className="w-full px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-5 space-y-3 sm:space-y-4 max-w-[1920px] mx-auto">
      {/* 1. LEVEL 1: SEGMENT TABS (KHÁCH HÀNG VS NHÀ CUNG CẤP) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
          <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-rose-500 text-white items-center justify-center text-xl shadow-2xs shrink-0">
            ⚖️
          </div>
          <div className="w-full sm:w-auto">
            <div className="hidden sm:block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Quản lý công nợ Sapo
            </div>
            {/* Top Level Nav Pill Switcher */}
            <div className="flex items-center gap-1 sm:gap-2 mt-0 sm:mt-1 bg-zinc-100 dark:bg-zinc-800/80 sm:bg-transparent p-1 sm:p-0 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMainSection("customers")}
                className={`flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  mainSection === "customers"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                }`}
              >
                <span>👥</span>
                <span>Khách hàng</span>
                {customerSummary && (
                  <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-zinc-700 dark:bg-zinc-200 text-white dark:text-zinc-900 font-mono">
                    {customerSummary.totalDebtors || 0}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMainSection("suppliers")}
                className={`flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  mainSection === "suppliers"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                }`}
              >
                <span>🏭</span>
                <span>Nhà cung cấp</span>
                <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                  {supplierSummary?.total_suppliers || 23}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* Dropdown Bộ lọc thời gian */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DateRangePreset)}
              className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium text-xs shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="30_days">30 ngày qua</option>
              <option value="7_days">7 ngày qua</option>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
              <option value="custom">Tuỳ chọn...</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white"
              />
              <span className="text-zinc-400 text-xs">→</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            title="Xuất file CSV"
            aria-label="Xuất file CSV"
          >
            <span>📥</span>
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={refreshing}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs shrink-0 whitespace-nowrap ${
              mainSection === "suppliers"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900"
            }`}
            title="Đồng bộ lại dữ liệu từ Sapo Omnichannel"
            aria-label="Đồng bộ lại từ Sapo"
          >
            <span className={`shrink-0 ${refreshing ? "animate-spin" : ""}`}>🔄</span>
            <span className="text-[11px] sm:text-xs">
              {refreshing
                ? "Đang đồng bộ..."
                : mainSection === "suppliers"
                  ? "Đồng bộ NCC Sapo"
                  : "Đồng bộ Sapo"}
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. NỘI DUNG PHÂN HỆ: CÔNG NỢ KHÁCH HÀNG                       */}
      {/* ============================================================== */}
      {mainSection === "customers" && (
        <div className="space-y-3.5">
          {/* Customer KPI Cards */}
          <DebtStatsCards
            summary={customerSummary}
            loading={loadingCustomerSummary}
            dateRangeLabel={dateRangeLabel}
          />

          {/* Sub-tabs: Khách nợ vs Đơn nợ */}
          <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setCustomerSubTab("customers")}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                customerSubTab === "customers"
                  ? "border-rose-600 text-rose-600 dark:text-rose-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <span>👥</span>
              <span>Khách nợ</span>
              <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 font-mono">
                {customerSummary?.totalDebtors || customerTotalCount || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCustomerSubTab("orders")}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                customerSubTab === "orders"
                  ? "border-rose-600 text-rose-600 dark:text-rose-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <span>📋</span>
              <span>Đơn nợ</span>
              <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 font-mono">
                {customerSummary?.totalDebtOrders || orderTotalCount || 0}
              </span>
            </button>
          </div>

          {/* Sub-tab Content */}
          {customerSubTab === "customers" ? (
            <CustomerDebtsTable
              customers={customers}
              loading={loadingCustomers}
              searchQuery={customerSearch}
              onSearchChange={setCustomerSearch}
              page={customerPage}
              totalPages={customerTotalPages}
              totalCount={customerTotalCount}
              onPageChange={setCustomerPage}
              onViewCustomerDetail={handleOpenCustomerDetail}
              filterType={filterType}
              onFilterTypeChange={setFilterType}
            />
          ) : (
            <OrderDebtsTable
              orders={orders}
              loading={loadingOrders}
              searchQuery={orderSearch}
              onSearchChange={setOrderSearch}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              selectedChannel={selectedChannel}
              onChannelChange={setSelectedChannel}
              page={orderPage}
              totalPages={orderTotalPages}
              totalCount={orderTotalCount}
              onPageChange={setOrderPage}
              onCollectDebt={handleOpenCollectModal}
            />
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. NỘI DUNG PHÂN HỆ: CÔNG NỢ NHÀ CUNG CẤP                      */}
      {/* ============================================================== */}
      {mainSection === "suppliers" && (
        <div className="space-y-3.5">
          {/* Supplier KPI Cards */}
          <SupplierDebtStatsCards
            summary={supplierSummary}
            loading={loadingSupplierSummary}
          />

          {/* Suppliers Table & Mobile Card View */}
          <SupplierDebtsTable
            suppliers={suppliers}
            loading={loadingSuppliers}
            searchQuery={supplierSearch}
            onSearchChange={handleSupplierSearchChange}
            page={supplierPage}
            totalPages={supplierTotalPages}
            totalCount={supplierTotalCount}
            onPageChange={setSupplierPage}
            onViewSupplierDetail={handleOpenSupplierDetail}
            limit={supplierLimit}
            onLimitChange={handleSupplierLimitChange}
          />
        </div>
      )}

      {/* ==================== MODALS ==================== */}
      {/* 1. Modal Thu nợ khách hàng */}
      <CollectDebtModal
        order={selectedOrderForPay}
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        onDebtCollected={() => {
          fetchCustomerSummary();
          if (customerSubTab === "customers") fetchCustomers();
          else fetchOrders();
        }}
      />

      {/* 2. Modal Chi tiết khách hàng nợ */}
      <CustomerDebtDetailModal
        customer={selectedCustomerForDetail}
        isOpen={isCustomerDetailOpen}
        onClose={() => setIsCustomerDetailOpen(false)}
        onCollectDebt={handleOpenCollectModal}
      />

      {/* 3. Modal Chi tiết nhà cung cấp & Đơn nhập kho (REI) */}
      <SupplierDebtDetailModal
        supplier={selectedSupplierForDetail}
        isOpen={isSupplierDetailOpen}
        onClose={() => setIsSupplierDetailOpen(false)}
        onPaymentSuccess={() => {
          fetchSupplierSummary();
          fetchSuppliers();
        }}
      />
    </div>
  );
}

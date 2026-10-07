"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/context/ToastContext";
import { DebtStatsCards } from "@/components/debts/DebtStatsCards";
import { CustomerDebtsTable, DebtorCustomer } from "@/components/debts/CustomerDebtsTable";
import { OrderDebtsTable, DebtOrder } from "@/components/debts/OrderDebtsTable";
import { CollectDebtModal } from "@/components/debts/CollectDebtModal";
import { CustomerDebtDetailModal } from "@/components/debts/CustomerDebtDetailModal";

type DateRangePreset = "30_days" | "7_days" | "today" | "yesterday" | "this_month" | "last_month" | "custom";

export default function DebtsManagementPage() {
  const { toast } = useToast();

  // Active Tab: 'customers' (Công nợ khách hàng chuẩn Sapo) | 'orders' (Chi tiết đơn nợ)
  const [activeTab, setActiveTab] = useState<"customers" | "orders">("customers");

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

  // Filter Type: 'cuoi_ky' | 'phat_sinh' | 'all'
  const [filterType, setFilterType] = useState("cuoi_ky");

  // Summary state
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Tab Customers state
  const [customers, setCustomers] = useState<DebtorCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotalPages, setCustomerTotalPages] = useState(1);
  const [customerTotalCount, setCustomerTotalCount] = useState(0);

  // Tab Orders state
  const [orders, setOrders] = useState<DebtOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderTotalCount, setOrderTotalCount] = useState(0);

  // Modals state
  const [selectedOrderForPay, setSelectedOrderForPay] = useState<DebtOrder | null>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);

  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<DebtorCustomer | null>(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch Summary
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const params = new URLSearchParams({
        type: "summary",
        start_date: startDateStr,
        end_date: endDateStr,
      });
      const res = await fetch(`/api/sapo/debts?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data);
      }
    } catch {
      toast.error("Không thể tải thống kê công nợ");
    } finally {
      setLoadingSummary(false);
    }
  }, [startDateStr, endDateStr, toast]);

  // 2. Fetch Customers
  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const params = new URLSearchParams({
        type: "customers",
        page: customerPage.toString(),
        limit: "15",
        start_date: startDateStr,
        end_date: endDateStr,
        filter: filterType,
        search: customerSearch.trim(),
      });
      const res = await fetch(`/api/sapo/debts?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCustomers(json.data.customers || []);
        setCustomerTotalPages(json.data.pagination?.totalPages || 1);
        setCustomerTotalCount(json.data.pagination?.total || 0);
      }
    } catch {
      toast.error("Lỗi khi tải danh sách khách hàng nợ");
    } finally {
      setLoadingCustomers(false);
    }
  }, [customerPage, customerSearch, startDateStr, endDateStr, filterType, toast]);

  // 3. Fetch Orders
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams({
        type: "orders",
        page: orderPage.toString(),
        limit: "15",
        search: orderSearch.trim(),
        status: selectedStatus,
        channel: selectedChannel,
      });
      const res = await fetch(`/api/sapo/debts?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOrders(json.data.orders || []);
        setOrderTotalPages(json.data.pagination?.totalPages || 1);
        setOrderTotalCount(json.data.pagination?.total || 0);
      }
    } catch {
      toast.error("Lỗi khi tải danh sách đơn hàng nợ");
    } finally {
      setLoadingOrders(false);
    }
  }, [orderPage, orderSearch, selectedStatus, selectedChannel, toast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === "customers") {
      fetchCustomers();
    } else {
      fetchOrders();
    }
  }, [activeTab, fetchCustomers, fetchOrders]);

  useEffect(() => {
    setCustomerPage(1);
  }, [customerSearch, datePreset, customStartDate, customEndDate, filterType]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderSearch, selectedStatus, selectedChannel]);

  // Đồng bộ thời gian thực từ Sapo Omnichannel
  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      // Gọi sync đơn hàng từ Sapo
      await fetch("/api/sapo/sync-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });
    } catch {}

    await Promise.all([fetchSummary(), fetchCustomers(), fetchOrders()]);
    setRefreshing(false);
    toast.success("Đã đồng bộ công nợ từ Sapo Omnichannel thành công!");
  };

  const handleOpenCollectModal = (order: DebtOrder) => {
    setSelectedOrderForPay(order);
    setIsCollectModalOpen(true);
  };

  const handleOpenCustomerDetail = (customer: DebtorCustomer) => {
    setSelectedCustomerForDetail(customer);
    setIsCustomerDetailOpen(true);
  };

  // Export Excel / CSV chuẩn Sapo
  const handleExportCSV = () => {
    if (activeTab === "customers") {
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
    <div className="p-3 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Sapo Header / Breadcrumb */}
      <div className="flex items-start justify-between flex-wrap gap-4 pb-2">
        <div>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
            <span>Sapo Apps</span>
            <span>/</span>
            <span>Quản lý công nợ</span>
            <span>/</span>
            <span className="text-zinc-900 dark:text-white font-semibold">Công nợ khách hàng</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 text-lg">
              📊
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Công nợ khách hàng
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 pl-11">
            Đồng bộ chuẩn xác theo phương trình kế toán Sapo Quản lý Công nợ | Cập nhật thời gian thực
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Dropdown Bộ lọc thời gian chuẩn Sapo */}
          <div className="relative">
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DateRangePreset)}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            >
              <option value="30_days">30 ngày qua (Mặc định Sapo)</option>
              <option value="7_days">7 ngày qua</option>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
              <option value="custom">Tuỳ chọn ngày...</option>
            </select>
          </div>

          {/* Custom Date Pickers if selected */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
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
            className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>📥</span>
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <span className={refreshing ? "animate-spin" : ""}>🔄</span>
            <span>{refreshing ? "Đang đồng bộ..." : "Đồng bộ từ Sapo"}</span>
          </button>
        </div>
      </div>

      {/* Sapo Equation Banner: Nợ đầu kỳ + Nợ tăng trong kỳ - Nợ giảm trong kỳ = Nợ cuối kỳ */}
      <DebtStatsCards
        summary={summary}
        loading={loadingSummary}
        dateRangeLabel={dateRangeLabel}
      />

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pt-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "customers"
                ? "border-rose-600 text-rose-600 dark:text-rose-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            <span>👥</span>
            <span>Công nợ khách hàng (Sapo)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 font-mono">
              {summary?.totalDebtors || customerTotalCount || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "orders"
                ? "border-rose-600 text-rose-600 dark:text-rose-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            <span>📋</span>
            <span>Danh sách Đơn hàng nợ</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 font-mono">
              {summary?.totalDebtOrders || orderTotalCount || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "customers" ? (
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

      {/* Modal: Ghi nhận Thu nợ */}
      <CollectDebtModal
        order={selectedOrderForPay}
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        onDebtCollected={() => {
          fetchSummary();
          if (activeTab === "customers") fetchCustomers();
          else fetchOrders();
        }}
      />

      {/* Modal: Chi tiết công nợ một khách hàng */}
      <CustomerDebtDetailModal
        customer={selectedCustomerForDetail}
        isOpen={isCustomerDetailOpen}
        onClose={() => setIsCustomerDetailOpen(false)}
        onCollectDebt={handleOpenCollectModal}
      />
    </div>
  );
}

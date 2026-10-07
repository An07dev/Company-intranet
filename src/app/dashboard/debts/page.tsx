"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/context/ToastContext";
import { DebtStatsCards } from "@/components/debts/DebtStatsCards";
import { CustomerDebtsTable, DebtorCustomer } from "@/components/debts/CustomerDebtsTable";
import { OrderDebtsTable, DebtOrder } from "@/components/debts/OrderDebtsTable";
import { CollectDebtModal } from "@/components/debts/CollectDebtModal";
import { CustomerDebtDetailModal } from "@/components/debts/CustomerDebtDetailModal";

export default function DebtsManagementPage() {
  const { toast } = useToast();

  // Active Tab: 'customers' (Sổ nợ khách hàng) | 'orders' (Chi tiết đơn nợ)
  const [activeTab, setActiveTab] = useState<"customers" | "orders">("customers");

  // Summary state
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [includeCancelled, setIncludeCancelled] = useState(false);

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
      const res = await fetch(`/api/sapo/debts?type=summary&include_cancelled=${includeCancelled}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data);
      }
    } catch {
      toast.error("Không thể tải thống kê công nợ");
    } finally {
      setLoadingSummary(false);
    }
  }, [includeCancelled, toast]);

  // 2. Fetch Customers
  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const params = new URLSearchParams({
        type: "customers",
        page: customerPage.toString(),
        limit: "15",
        include_cancelled: includeCancelled.toString(),
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
  }, [customerPage, customerSearch, includeCancelled, toast]);

  // 3. Fetch Orders
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams({
        type: "orders",
        page: orderPage.toString(),
        limit: "15",
        include_cancelled: includeCancelled.toString(),
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
  }, [orderPage, orderSearch, selectedStatus, selectedChannel, includeCancelled, toast]);

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

  // Debounced search for customers
  useEffect(() => {
    setCustomerPage(1);
  }, [customerSearch]);

  // Debounced search for orders
  useEffect(() => {
    setOrderPage(1);
  }, [orderSearch, selectedStatus, selectedChannel]);

  // Refresh all
  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchSummary(), fetchCustomers(), fetchOrders()]);
    setRefreshing(false);
    toast.success("Đã làm mới dữ liệu công nợ thời gian thực!");
  };

  // Open Collect Modal
  const handleOpenCollectModal = (order: DebtOrder) => {
    setSelectedOrderForPay(order);
    setIsCollectModalOpen(true);
  };

  // Open Customer Detail Modal
  const handleOpenCustomerDetail = (customer: DebtorCustomer) => {
    setSelectedCustomerForDetail(customer);
    setIsCustomerDetailOpen(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === "customers") {
      if (customers.length === 0) {
        toast.info("Không có dữ liệu để xuất");
        return;
      }
      const headers = ["Khách hàng", "Số điện thoại", "Địa chỉ", "Số đơn nợ", "Tổng nợ (VND)", "Tuổi nợ cao nhất (ngày)"];
      const rows = customers.map((c) => [
        `"${(c.name || "").replace(/"/g, '""')}"`,
        `"${c.phone || ""}"`,
        `"${(c.address || "").replace(/"/g, '""')}"`,
        c.debt_orders_count,
        c.total_debt,
        c.max_days_overdue,
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cong_no_khach_hang_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống file CSV công nợ khách hàng thành công!");
    } else {
      if (orders.length === 0) {
        toast.info("Không có dữ liệu để xuất");
        return;
      }
      const headers = ["Mã đơn", "Kênh bán", "Khách hàng", "Số điện thoại", "Tổng tiền (VND)", "Đã thanh toán (VND)", "Còn nợ (VND)", "Tuổi nợ (ngày)", "Ngày tạo"];
      const rows = orders.map((o) => [
        `"#${o.order_sn}"`,
        `"${o.shop_username}"`,
        `"${(o.customer_name || "").replace(/"/g, '""')}"`,
        `"${o.customer_phone || ""}"`,
        o.total_amount,
        o.total_received,
        o.unpaid_amount,
        o.days_overdue,
        `"${o.created_at || ""}"`,
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `danh_sach_don_no_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống file CSV danh sách đơn nợ thành công!");
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 text-lg">
              💳
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Quản lý Công nợ & Thu hồi Dòng tiền
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 pl-11">
            Đồng bộ thời gian thực từ Sapo Omnichannel | Theo dõi sổ nợ khách hàng và ghi nhận thanh toán tự động
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>📥</span>
            <span>Xuất Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <span className={refreshing ? "animate-spin" : ""}>🔄</span>
            <span>{refreshing ? "Đang đồng bộ..." : "Làm mới từ Sapo"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <DebtStatsCards
        summary={summary}
        loading={loadingSummary}
        includeCancelled={includeCancelled}
        onToggleIncludeCancelled={(val) => setIncludeCancelled(val)}
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
            <span>Sổ nợ theo Khách hàng</span>
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

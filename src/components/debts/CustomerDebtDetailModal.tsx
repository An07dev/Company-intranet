"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { DebtorCustomer } from "./CustomerDebtsTable";
import { DebtOrder } from "./OrderDebtsTable";

interface CustomerDebtDetailModalProps {
  customer: DebtorCustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onCollectDebt: (order: DebtOrder) => void;
}

export function CustomerDebtDetailModal({
  customer,
  isOpen,
  onClose,
  onCollectDebt,
}: CustomerDebtDetailModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!customer || !isOpen) {
      setOrders([]);
      return;
    }

    setLoadingOrders(true);
    const params = new URLSearchParams({
      type: "customer_detail",
      name: customer.name || "",
      phone: customer.phone || "",
    });

    fetch(`/api/sapo/debts?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setOrders(json.data.orders || []);
        } else {
          setOrders(customer.orders || []);
        }
      })
      .catch(() => {
        setOrders(customer.orders || []);
      })
      .finally(() => {
        setLoadingOrders(false);
      });
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const formatVND = (num?: number) => {
    return (num || 0).toLocaleString("vi-VN") + "\u00A0₫";
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleCopyStatement = () => {
    const orderLines = orders
      .map(
        (o, idx) =>
          `  ${idx + 1}. Đơn #${o.order_sn} (${formatDateTime(o.created_at)}): Tổng ${formatVND(o.total_amount || o.total_price)} - Đã thu ${formatVND(o.total_received)} - Còn nợ ${formatVND(o.unpaid_amount ?? o.outstanding)}`
      )
      .join("\n");

    const text = `Kính gửi Anh/Chị ${customer.name},
Bao Bì Yến Sen trân trọng gửi bảng kê chi tiết công nợ:
- Nợ đầu kỳ: ${formatVND(customer.dau_ky)}
- Nợ tăng trong kỳ: ${formatVND(customer.tang_trong_ky)}
- Nợ giảm trong kỳ: ${formatVND(customer.giam_trong_ky)}
- TỔNG NỢ PHẢI THU CUỐI KỲ: ${formatVND(customer.cuoi_ky ?? customer.total_debt)}
- Tổng số đơn: ${orders.length} đơn hàng
${orderLines ? `\nChi tiết các đơn hàng:\n${orderLines}` : ""}

Kính mong Quý khách kiểm tra đối soát và hỗ trợ thanh toán sớm.
Trân trọng cảm ơn Quý khách!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Đã sao chép sao kê chi tiết công nợ gửi Zalo!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0"></div>

        {/* Modal Header */}
        <div className="px-4 py-3 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-2xs">
              {(customer.name || "K").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                  {customer.name}
                </h3>
                {customer.phone && (
                  <span className="text-[10px] sm:text-xs font-mono font-medium px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                    {customer.phone}
                  </span>
                )}
              </div>
              {customer.address && (
                <p className="text-[10px] text-zinc-400 truncate max-w-[200px] sm:max-w-md mt-0.5">
                  📍 {customer.address}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyStatement}
              className="px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold text-[11px] sm:text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Sao chép toàn bộ sao kê gửi qua Zalo/SMS"
            >
              <span>{copied ? "✓" : "💬"}</span>
              <span className="hidden sm:inline">{copied ? "Đã sao chép" : "Sao chép gửi Zalo"}</span>
              <span className="sm:hidden">{copied ? "Đã chép" : "Zalo"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards for Customer */}
        <div className="p-3 sm:p-4 bg-zinc-50/40 dark:bg-zinc-800/30 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
            {/* Đầu kỳ */}
            <div className="bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-semibold">Nợ đầu kỳ</span>
              <div className="text-xs sm:text-base font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                {formatVND(customer.dau_ky)}
              </div>
            </div>

            {/* Tăng trong kỳ */}
            <div className="bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border border-blue-200/80 dark:border-blue-900 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] text-blue-600 uppercase font-semibold">Nợ tăng (+)</span>
              <div className="text-xs sm:text-base font-bold font-mono text-blue-600 mt-0.5 truncate">
                {formatVND(customer.tang_trong_ky)}
              </div>
            </div>

            {/* Giảm trong kỳ */}
            <div className="bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border border-rose-200/80 dark:border-rose-900 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] text-rose-600 uppercase font-semibold">Nợ giảm (−)</span>
              <div className="text-xs sm:text-base font-bold font-mono text-rose-600 mt-0.5 truncate">
                {customer.giam_trong_ky ? `-${formatVND(customer.giam_trong_ky)}` : "0\u00A0₫"}
              </div>
            </div>

            {/* Phải thu cuối kỳ */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-2.5 sm:p-3 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 uppercase font-bold">Phải thu cuối kỳ</span>
              <div className="text-xs sm:text-base lg:text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 truncate">
                {formatVND(customer.cuoi_ky ?? customer.total_debt)}
              </div>
            </div>
          </div>
        </div>

        {/* Orders List Section */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 text-xs">
          <div className="font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span>📦</span>
              <span>Lịch sử các đơn hàng liên quan:</span>
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              {orders.length} đơn
            </span>
          </div>

          {loadingOrders ? (
            <div className="py-8 text-center text-zinc-400 space-y-2">
              <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs">Đang tải danh sách đơn hàng...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              <p className="text-xs">Không có đơn hàng nào</p>
            </div>
          ) : (
            <>
              {/* 1. MOBILE CARD VIEW FOR ORDERS (< md screens) */}
              <div className="block md:hidden space-y-2">
                {orders.map((o) => {
                  const unp = o.unpaid_amount ?? o.outstanding ?? 0;
                  const isPaid = unp === 0;

                  return (
                    <div
                      key={o.order_sn}
                      className="p-3 bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl space-y-2"
                    >
                      {/* Top row: Order SN + Date + Status */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                            #{o.order_sn}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {formatDateTime(o.created_at)}
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[10px] font-semibold ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : o.financial_status === "partially_paid"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {isPaid ? "Đã trả đủ" : o.financial_status === "partially_paid" ? "Trả 1 phần" : "Chưa trả"}
                        </span>
                      </div>

                      {/* Amounts row */}
                      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-700/50 font-mono text-[11px]">
                        <div>
                          <div className="text-[9px] text-zinc-400">Tổng tiền</div>
                          <div className="text-zinc-700 dark:text-zinc-300 truncate">
                            {formatVND(o.total_price || o.total_amount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-zinc-400">Đã thu</div>
                          <div className="text-emerald-600 dark:text-emerald-400 truncate">
                            {formatVND(o.total_received)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-zinc-400">Còn nợ</div>
                          <div className={`font-bold truncate ${unp > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
                            {formatVND(unp)}
                          </div>
                        </div>
                      </div>

                      {/* Bottom action if unpaid */}
                      {unp > 0 && (
                        <div className="pt-1.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onCollectDebt({
                                order_sn: o.order_sn,
                                sapo_id: o.sapo_id,
                                shop_username: o.shop_username || "sapo",
                                order_status: o.order_status || "Chờ xử lý",
                                financial_status: o.financial_status || "pending",
                                is_cancelled: false,
                                total_amount: o.total_price || o.total_amount,
                                total_received: o.total_received || 0,
                                unpaid_amount: unp,
                                payment_method: "Tiền mặt",
                                customer_name: customer.name,
                                customer_phone: customer.phone,
                                customer_address: customer.address,
                                created_at: o.created_at,
                                days_overdue: o.days_overdue || 0,
                              });
                            }}
                            className="w-full py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <span>💳</span>
                            <span>Thu nợ đơn #{o.order_sn}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. DESKTOP TABLE VIEW (>= md screens) */}
              <div className="hidden md:block border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold">
                      <th className="py-2.5 px-3.5 whitespace-nowrap">Mã đơn</th>
                      <th className="py-2.5 px-3.5 whitespace-nowrap">Ngày tạo</th>
                      <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Tổng tiền</th>
                      <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Đã thu</th>
                      <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Còn nợ lại</th>
                      <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Trạng thái</th>
                      <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {orders.map((o) => {
                      const unp = o.unpaid_amount ?? o.outstanding ?? 0;
                      return (
                        <tr key={o.order_sn} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                            #{o.order_sn}
                          </td>
                          <td className="py-2.5 px-3.5 text-zinc-500 whitespace-nowrap">
                            {formatDateTime(o.created_at)}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                            {formatVND(o.total_price || o.total_amount)}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatVND(o.total_received)}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {unp > 0 ? formatVND(unp) : "0\u00A0₫"}
                          </td>
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                                unp === 0
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                  : o.financial_status === "partially_paid"
                                  ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                                  : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
                              }`}
                            >
                              {unp === 0 ? "Đã trả đủ" : o.financial_status === "partially_paid" ? "Trả một phần" : "Chưa thanh toán"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            {unp > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onCollectDebt({
                                    order_sn: o.order_sn,
                                    sapo_id: o.sapo_id,
                                    shop_username: o.shop_username || "sapo",
                                    order_status: o.order_status || "Chờ xử lý",
                                    financial_status: o.financial_status || "pending",
                                    is_cancelled: false,
                                    total_amount: o.total_price || o.total_amount,
                                    total_received: o.total_received || 0,
                                    unpaid_amount: unp,
                                    payment_method: "Tiền mặt",
                                    customer_name: customer.name,
                                    customer_phone: customer.phone,
                                    customer_address: customer.address,
                                    created_at: o.created_at,
                                    days_overdue: o.days_overdue || 0,
                                  });
                                }}
                                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs whitespace-nowrap"
                              >
                                <span>💳</span>
                                <span>Thu nợ</span>
                              </button>
                            ) : (
                              <span className="text-zinc-400 text-[11px] font-medium">Đã xong</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-zinc-500 font-mono">
            Phải thu: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatVND(customer.cuoi_ky ?? customer.total_debt)}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

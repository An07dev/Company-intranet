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

  const formatVND = (num: number) => {
    return (num || 0).toLocaleString("vi-VN") + " ₫";
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
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleCopyStatement = () => {
    const orderLines = orders
      .map(
        (o, idx) =>
          `  ${idx + 1}. Đơn #${o.order_sn} (${formatDateTime(o.created_at)}): Tổng ${formatVND(o.total_amount)} - Còn nợ ${formatVND(o.unpaid_amount)}`
      )
      .join("\n");

    const text = `Kính gửi Anh/Chị ${customer.name},
Bao Bì Yến Sen trân trọng gửi bảng kê chi tiết công nợ của Quý khách:
- Tổng số tiền công nợ còn lại: ${formatVND(customer.total_debt)}
- Tổng số đơn hàng: ${orders.length} đơn
Chi tiết từng đơn hàng:\n${orderLines}

Kính mong Quý khách kiểm tra đối soát và hỗ trợ thanh toán sớm.
Trân trọng cảm ơn Quý khách!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Đã sao chép sao kê chi tiết công nợ gửi Zalo!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center font-bold text-base shadow-xs">
              {(customer.name || "K").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                <span>{customer.name}</span>
                {customer.phone && (
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {customer.phone}
                  </span>
                )}
              </h3>
              {customer.address && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  📍 {customer.address}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyStatement}
              className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Sao chép toàn bộ sao kê gửi qua Zalo/SMS"
            >
              <span>{copied ? "✓" : "💬"}</span>
              <span>{copied ? "Đã sao chép" : "Sao chép gửi Zalo"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tổng dư nợ banner */}
        <div className="bg-rose-50/60 dark:bg-rose-950/40 p-4 border-b border-rose-100 dark:border-rose-900/40 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">Tổng dư nợ hiện tại:</span>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatVND(customer.total_debt)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-zinc-600 dark:text-zinc-400">Số đơn nợ cần thu:</span>
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              {orders.length || customer.debt_orders_count} đơn hàng
            </div>
          </div>
        </div>

        {/* Table Orders */}
        <div className="overflow-y-auto p-4 sm:p-5 text-xs">
          <div className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2 flex items-center gap-1.5">
            <span>📦</span>
            <span>Danh sách các đơn hàng còn nợ:</span>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold">
                  <th className="py-2.5 px-3">Mã đơn</th>
                  <th className="py-2.5 px-3">Ngày mua</th>
                  <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                  <th className="py-2.5 px-3 text-right">Đã thanh toán</th>
                  <th className="py-2.5 px-3 text-right">Còn nợ lại</th>
                  <th className="py-2.5 px-3 text-center">Tuổi nợ</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loadingOrders ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      Đang tải danh sách đơn nợ...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      Không có đơn nợ nào
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.order_sn} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 dark:text-white">
                        #{o.order_sn}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-500">
                        {formatDateTime(o.created_at)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                        {formatVND(o.total_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatVND(o.total_received || (o.total_amount - o.unpaid_amount))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatVND(o.unpaid_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {o.days_overdue || 0} ngày
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
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
                              total_amount: o.total_amount,
                              total_received: o.total_received || 0,
                              unpaid_amount: o.unpaid_amount,
                              payment_method: "Tiền mặt",
                              customer_name: customer.name,
                              customer_phone: customer.phone,
                              customer_address: customer.address,
                              created_at: o.created_at,
                              days_overdue: o.days_overdue || 0,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Thu nợ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

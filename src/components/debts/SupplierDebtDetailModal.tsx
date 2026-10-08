"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { SupplierDebtItem } from "./SupplierDebtsTable";

interface SupplierDebtDetailModalProps {
  supplier: SupplierDebtItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export function SupplierDebtDetailModal({
  supplier,
  isOpen,
  onClose,
  onPaymentSuccess,
}: SupplierDebtDetailModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"rei" | "srt">("rei");
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    summary?: any;
    receive_inventories?: any[];
    supplier_returns?: any[];
  } | null>(null);

  // State thanh toán cho đơn nhập
  const [payingRei, setPayingRei] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNote, setPayNote] = useState<string>("");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!supplier || !isOpen) {
      setDetailData(null);
      setPayingRei(null);
      return;
    }

    setLoading(true);
    fetch(`/api/sapo/debts/suppliers?type=supplier_detail&supplier_id=${supplier.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setDetailData(json.data);
        }
      })
      .catch((err) => {
        console.error("Error fetching supplier detail:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [supplier, isOpen]);

  if (!isOpen || !supplier) return null;

  const formatVND = (num?: number) => {
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
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const receiveInventories = detailData?.receive_inventories || [];
  const supplierReturns = detailData?.supplier_returns || [];
  const summary = detailData?.summary || {
    no_dau_ky: supplier.no_dau_ky,
    no_tang_trong_ky: supplier.no_tang_trong_ky,
    no_giam_trong_ky: supplier.no_giam_trong_ky,
    no_cuoi_ky: supplier.phai_thu_tra_cuoi_ky,
    rei_count: supplier.rei_count,
    return_count: 0,
  };

  const handleCopyStatement = () => {
    const text = `Kính gửi Nhà cung cấp ${supplier.name},
Bao Bì Yến Sen gửi bảng đối soát số dư công nợ:
- Nợ đầu kỳ: ${formatVND(summary.no_dau_ky)}
- Nợ giảm trong kỳ (Đã thanh toán / Trả hàng): ${formatVND(summary.no_giam_trong_ky)}
- Nợ tăng trong kỳ (Nhập hàng mới): ${formatVND(summary.no_tang_trong_ky)}
- TỔNG CÔNG NỢ PHẢI TRẢ CUỐI KỲ: ${formatVND(summary.no_cuoi_ky)}
- Tổng số đơn nhập kho: ${receiveInventories.length} đơn
- Tổng số phiếu trả hàng: ${supplierReturns.length} phiếu

Quý đối tác vui lòng kiểm tra đối soát số liệu.
Trân trọng cảm ơn!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Đã sao chép bảng đối soát công nợ gửi NCC qua Zalo!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPay = (rei: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPayingRei(rei);
    // Tính số tiền còn thiếu của đơn
    let paid = 0;
    if (rei.transactions && Array.isArray(rei.transactions)) {
      for (const t of rei.transactions) {
        if (t.status === "success" || !t.status) paid += Number(t.amount || 0);
      }
    }
    const remaining = Math.max(0, (rei.total_price || 0) - paid);
    setPayAmount(remaining > 0 ? remaining : (rei.total_price || 0));
    setPayNote(`Thanh toán đơn nhập ${rei.code}`);
  };

  const handleConfirmPay = async () => {
    if (!payingRei || payAmount <= 0) {
      toast.error("Vui lòng nhập số tiền thanh toán hợp lệ");
      return;
    }

    try {
      setSubmittingPay(true);
      const res = await fetch("/api/sapo/debts/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receive_inventory_id: payingRei.id,
          amount: payAmount,
          reference: payNote,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể thực hiện thanh toán");
      }

      toast.success(json.data?.message || "Đã thanh toán thành công");
      setPayingRei(null);

      // Cập nhật lại danh sách
      if (supplier) {
        const refresh = await fetch(`/api/sapo/debts/suppliers?type=supplier_detail&supplier_id=${supplier.id}`);
        const refJson = await refresh.json();
        if (refJson.success && refJson.data) {
          setDetailData(refJson.data);
        }
      }
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo giao dịch thanh toán");
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0"></div>

        {/* Modal Header */}
        <div className="px-4 py-3 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-2xs">
              {supplier.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                  {supplier.name}
                </h3>
                <span className="text-[10px] sm:text-xs font-mono font-medium px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                  {supplier.code}
                </span>
                {supplier.phone && (
                  <span className="text-[10px] sm:text-xs font-mono font-medium px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                    📞 {supplier.phone}
                  </span>
                )}
              </div>
              {supplier.address && (
                <p className="text-[10px] text-zinc-400 truncate max-w-sm sm:max-w-md mt-0.5">
                  📍 {supplier.address}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyStatement}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 shadow-2xs transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">{copied ? "Đã chép!" : "Sao chép đối soát"}</span>
              <span className="sm:hidden">{copied ? "Đã chép" : "Sao chép"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {/* 4 Stats Cards cho NCC này */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 sm:p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="text-[10px] text-zinc-400 font-medium">Nợ đầu kỳ</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
                {formatVND(summary.no_dau_ky)}
              </div>
            </div>

            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 sm:p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                + Nợ giảm (Đã trả / Hàng trả)
              </div>
              <div className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatVND(summary.no_giam_trong_ky)}
              </div>
            </div>

            <div className="bg-rose-50/50 dark:bg-rose-950/20 p-2.5 sm:p-3 rounded-2xl border border-rose-100 dark:border-rose-900/50">
              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                − Nợ tăng (Nhập hàng)
              </div>
              <div className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                {formatVND(summary.no_tang_trong_ky)}
              </div>
            </div>

            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 sm:p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">
                = Phải thu/trả cuối kỳ
              </div>
              <div className="text-xs sm:text-sm font-bold font-mono text-indigo-900 dark:text-indigo-200 mt-0.5">
                {formatVND(summary.no_cuoi_ky)}
              </div>
            </div>
          </div>

          {/* Sub-tabs: Đơn nhập kho REI vs Phiếu trả hàng SRT */}
          <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("rei")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                activeTab === "rei"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Đơn nhập kho ({receiveInventories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("srt")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                activeTab === "srt"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Phiếu trả hàng ({supplierReturns.length})
            </button>
          </div>

          {/* Tab 1: Danh sách Đơn nhập kho (REI) */}
          {activeTab === "rei" && (
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 animate-pulse space-y-2">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded-sm w-1/3"></div>
                    <div className="h-3 bg-zinc-100 dark:bg-zinc-700/60 rounded-sm w-2/3"></div>
                  </div>
                ))
              ) : receiveInventories.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Chưa có đơn nhập kho nào cho nhà cung cấp này.
                </div>
              ) : (
                receiveInventories.map((rei) => {
                  const isPaid = rei.transaction_status === "paid";
                  const paidAmount = (rei.transactions || []).reduce(
                    (sum: number, tx: any) => sum + (tx.status === "success" || !tx.status ? Number(tx.amount || 0) : 0),
                    0
                  );
                  const remaining = Math.max(0, (rei.total_price || 0) - paidAmount);

                  return (
                    <div
                      key={rei.id}
                      className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400">
                            {rei.code}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {formatDateTime(rei.received_on || rei.created_on)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isPaid || remaining === 0
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {isPaid || remaining === 0 ? "✓ Đã thanh toán" : "Chờ thanh toán"}
                          </span>

                          {!isPaid && remaining > 0 && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenPay(rei, e)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors"
                            >
                              Thanh toán
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Thông tin số tiền */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500">Tổng tiền đơn:</span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {formatVND(rei.total_price)}
                        </span>
                      </div>

                      {/* Chi tiết sản phẩm trong đơn nhập */}
                      {rei.line_items && rei.line_items.length > 0 && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-2 space-y-1 text-[11px]">
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                            Sản phẩm nhập ({rei.line_items.length}):
                          </div>
                          {rei.line_items.slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                              <span className="truncate max-w-[240px] sm:max-w-md">
                                • {item.name || item.title}
                              </span>
                              <span className="font-mono shrink-0">
                                {item.quantity} x {formatVND(item.price)}
                              </span>
                            </div>
                          ))}
                          {rei.line_items.length > 3 && (
                            <div className="text-[10px] text-zinc-400 italic">
                              + và {rei.line_items.length - 3} mặt hàng khác
                            </div>
                          )}
                        </div>
                      )}

                      {/* Lịch sử thanh toán của đơn */}
                      {rei.transactions && rei.transactions.length > 0 && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-2 space-y-0.5">
                          <span className="font-semibold text-[10px] uppercase">Giao dịch đã thanh toán:</span>
                          {rei.transactions.map((tx: any, idx: number) => (
                            <div key={idx} className="flex justify-between font-mono">
                              <span>
                                {formatDateTime(tx.processed_on || tx.created_on)} ({tx.payment_method_name || "Chuyển khoản"})
                              </span>
                              <span className="font-bold">+{formatVND(tx.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Danh sách Phiếu trả hàng (SRT) */}
          {activeTab === "srt" && (
            <div className="space-y-3">
              {loading ? (
                <div className="p-4 text-center text-xs text-zinc-400">Đang tải phiếu trả hàng...</div>
              ) : supplierReturns.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Không có phiếu trả hàng nào cho nhà cung cấp này.
                </div>
              ) : (
                supplierReturns.map((srt) => (
                  <div
                    key={srt.id}
                    className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                          {srt.code}
                        </span>
                        {srt.receive_inventory_code && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                            Trả đơn: {srt.receive_inventory_code}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {formatDateTime(srt.returned_on || srt.created_on)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-500">Giá trị hàng trả lại (giảm công nợ):</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{formatVND(srt.subtotal)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Pop-up thanh toán đơn nhập kho */}
      {payingRei && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPayingRei(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                Thanh toán đơn nhập {payingRei.code}
              </h4>
              <button
                type="button"
                onClick={() => setPayingRei(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Số tiền thanh toán (VNĐ)
                </label>
                <input
                  type="number"
                  value={payAmount || ""}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full text-sm font-mono font-bold px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <div className="text-[11px] text-zinc-400 mt-1">
                  Tổng đơn: {formatVND(payingRei.total_price)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Nội dung chuyển khoản / Ghi chú
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={submittingPay}
                onClick={() => setPayingRei(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submittingPay || payAmount <= 0}
                onClick={handleConfirmPay}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {submittingPay ? "Đang gửi Sapo..." : "Xác nhận thanh toán"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

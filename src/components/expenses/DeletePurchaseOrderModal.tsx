"use client";

import React, { useState } from "react";
import { PurchaseOrder } from "@/types";
import { Spinner } from "@/components/ui/Loading";
import { useToast } from "@/context/ToastContext";

interface DeletePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onOrderDeleted: () => void;
}

export function DeletePurchaseOrderModal({
  isOpen,
  onClose,
  order,
  onOrderDeleted,
}: DeletePurchaseOrderModalProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !order) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/purchase-orders/${order.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể xóa đơn nhập hàng");
      }

      toast.success(json.message || `Đã xóa đơn ${order.code} thành công`);
      onOrderDeleted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa đơn");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto shadow-2xs">
          🗑️
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Xác Nhận Xóa Đơn Nhập Hàng?
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Hành động này sẽ xóa hoàn toàn đơn nhập khỏi cơ sở dữ liệu nội bộ và cập nhật lại số liệu thống kê chi tiêu.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Mã đơn nhập:</span>
            <strong className="font-mono text-zinc-900 dark:text-zinc-100">{order.code}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Nhà cung cấp:</span>
            <strong className="text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">{order.supplier_name}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Tổng giá trị:</span>
            <strong className="font-mono text-rose-600 dark:text-rose-400">{formatCurrency(order.total_price)}</strong>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Spinner size="sm" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <span>Xác nhận xóa</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

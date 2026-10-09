"use client";

import React, { useState, useEffect } from "react";
import { ShopeeOrder } from "@/types";
import { useToast } from "@/context/ToastContext";

interface LineItemEdit {
  id: string;
  product_name: string;
  variation?: string;
  quantity: number;
  price: number;
}

interface EditOrderModalProps {
  order: ShopeeOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: (updatedOrder: ShopeeOrder) => void;
}

export function EditOrderModal({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}: EditOrderModalProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Form Fields
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<LineItemEdit[]>([]);

  // Tự động giải nén dữ liệu từ đơn hàng vào Form
  useEffect(() => {
    if (!order || !isOpen) {
      setApiError(null);
      return;
    }

    setApiError(null);
    setBuyerName(order.buyer_username || "");

    // Bóc tách Sapo raw_text
    let rawObj: any = {};
    if (order.raw_text) {
      try {
        rawObj = JSON.parse(order.raw_text);
      } catch {}
    }

    const shipAddr = rawObj.shipping_address || rawObj.billing_address || {};
    const cust = rawObj.customer || {};

    const phone = shipAddr.phone || cust.phone || "";
    setBuyerPhone(phone);

    const email = cust.email || rawObj.email || "";
    setBuyerEmail(email);

    const addrParts = [
      shipAddr.address1,
      shipAddr.address2,
      shipAddr.district,
      shipAddr.city,
    ].filter(Boolean);
    setBuyerAddress(addrParts.join(", ") || shipAddr.address1 || "");

    // Note
    setNote(rawObj.note || "");

    // Bóc tách Items
    if (Array.isArray(rawObj.line_items) && rawObj.line_items.length > 0) {
      const parsedItems = rawObj.line_items.map((it: any, idx: number) => ({
        id: String(it.id || idx + 1),
        product_name: String(it.title || it.name || "Sản phẩm"),
        variation: String(it.variant_title || ""),
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
      }));
      setItems(parsedItems);
    } else if (Array.isArray(order.items) && order.items.length > 0) {
      const approxUnitPrice =
        order.items.length > 0
          ? Math.round(order.total_amount / order.items.length)
          : 0;
      setItems(
        order.items.map((it: any, idx: number) => ({
          id: String(idx + 1),
          product_name: it.product_name || "Sản phẩm",
          variation: it.variation || "",
          quantity: it.quantity || 1,
          price: approxUnitPrice,
        }))
      );
    } else {
      setItems([
        {
          id: "1",
          product_name: "Sản phẩm mẫu",
          variation: "",
          quantity: 1,
          price: order.total_amount || 0,
        },
      ]);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num || 0);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        product_name: "",
        variation: "",
        quantity: 1,
        price: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.warning("Đơn hàng cần có ít nhất 1 sản phẩm");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof LineItemEdit, val: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  const calculatedTotal = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim()) {
      toast.warning("Vui lòng nhập họ tên khách hàng");
      return;
    }

    const invalidItem = items.find((it) => !it.product_name.trim());
    if (invalidItem) {
      toast.warning("Vui lòng nhập tên đầy đủ cho các sản phẩm trong đơn");
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const payload = {
        order_sn: order.order_sn,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        buyer_email: buyerEmail.trim(),
        buyer_address: buyerAddress.trim(),
        source_name: order.shop_username,
        payment_method: order.payment_method,
        shipping_carrier: order.shipping_carrier,
        tracking_number: order.tracking_number,
        note: note.trim(),
        items: items.map((it) => ({
          product_name: it.product_name.trim(),
          variation: it.variation?.trim() || "",
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || 0,
        })),
      };

      const res = await fetch("/api/sapo/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg =
          data.sapo_detail ||
          data.message ||
          data.error ||
          "Không thể cập nhật đơn hàng";
        setApiError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      toast.success(
        data.message || `Đã cập nhật đơn hàng #${order.order_sn} thành công!`
      );
      if (data.data && onOrderUpdated) {
        onOrderUpdated(data.data);
      }
      onClose();
    } catch (err: any) {
      const errMsg = "Lỗi kết nối máy chủ: " + (err?.message || String(err));
      setApiError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/60 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/70 border border-orange-200 dark:border-orange-800/80 flex items-center justify-center text-orange-600 dark:text-orange-400 text-base font-bold">
              ✏️
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>Chỉnh sửa đơn hàng</span>
                <span className="font-mono text-orange-600 dark:text-orange-400">
                  #{order.marketplace_order_sn || order.order_sn}
                </span>
                {order.sapo_order_number && order.sapo_order_number !== (order.marketplace_order_sn || order.order_sn) && (
                  <span className="text-[11px] font-mono text-zinc-500 font-normal">
                    (Sapo: #{order.sapo_order_number})
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Cập nhật thông tin và đồng bộ trực tiếp 2 chiều với Sapo Omnichannel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 transition cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 sm:space-y-5">
          {/* Thông báo lỗi nếu có */}
          {apiError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1 animate-in fade-in">
              <div className="font-bold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Phản hồi lỗi từ máy chủ:</span>
              </div>
              <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2 rounded-lg text-rose-900 dark:text-rose-100">
                {apiError}
              </div>
            </div>
          )}

          {/* Phân nhóm 1: Thông tin khách hàng & Giao hàng */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
              <span>👤</span>
              <span>Thông tin khách hàng &amp; Giao nhận</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Họ tên khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="Ví dụ: 0987654321"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Email (Tùy chọn)
                </label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="khachhang@gmail.com"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Địa chỉ nhận hàng
                </label>
                <input
                  type="text"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Số nhà, đường, phường, quận/huyện..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Phân nhóm 2: Danh sách sản phẩm trong đơn */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                <span>📦</span>
                <span>Sản phẩm trong đơn ({items.length})</span>
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>+ Thêm dòng sản phẩm</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      required
                      value={it.product_name}
                      onChange={(e) =>
                        handleUpdateItem(it.id, "product_name", e.target.value)
                      }
                      placeholder="Tên sản phẩm..."
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition cursor-pointer text-xs shrink-0"
                        title="Xóa dòng"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pl-7">
                    <div>
                      <label className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                        Phân loại / Quy cách
                      </label>
                      <input
                        type="text"
                        value={it.variation || ""}
                        onChange={(e) =>
                          handleUpdateItem(it.id, "variation", e.target.value)
                        }
                        placeholder="Màu sắc, kích thước..."
                        className="w-full text-xs px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                        Số lượng
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={it.quantity}
                        onChange={(e) =>
                          handleUpdateItem(
                            it.id,
                            "quantity",
                            Math.max(1, parseInt(e.target.value, 10) || 1)
                          )
                        }
                        className="w-full text-xs font-mono px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                        Đơn giá (₫)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={it.price}
                        onChange={(e) =>
                          handleUpdateItem(
                            it.id,
                            "price",
                            Math.max(0, parseInt(e.target.value, 10) || 0)
                          )
                        }
                        className="w-full text-xs font-mono px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tổng cộng */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60">
              <span className="text-xs font-semibold text-orange-900 dark:text-orange-200">
                Tổng thanh toán dự kiến:
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-orange-600 dark:text-orange-400">
                {formatVND(calculatedTotal)}
              </span>
            </div>
          </div>

          {/* Phân nhóm 4: Ghi chú đơn hàng */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Ghi chú đơn hàng
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú nội bộ, yêu cầu đóng gói, giao hàng..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-semibold text-xs transition cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs shadow-orange-600/30"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Đang đồng bộ Sapo...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Lưu thay đổi &amp; Đồng bộ Sapo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

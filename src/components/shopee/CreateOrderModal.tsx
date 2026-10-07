"use client";

import React, { useState } from "react";
import { useToast } from "@/context/ToastContext";

interface LineItemInput {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
}

const SAPO_ORDER_SOURCES = [
  { value: "Tại quầy", label: "🏪 Tại quầy (POS)" },
  { value: "Zalo", label: "💬 Zalo OA / Chat" },
  { value: "Facebook", label: "📘 Facebook Fanpage" },
  { value: "Hotline", label: "📞 Hotline / Bán trực tiếp" },
  { value: "Website", label: "🌐 Website Bán Hàng" },
  { value: "Telesale", label: "💼 Telesale" },
  { value: "TikTok", label: "🎵 TikTok Shop" },
  { value: "Khách quen", label: "⭐ Khách quen / Giới thiệu" },
  { value: "Đối tác B2B", label: "🤝 Đại lý / Khách sỉ B2B" },
  { value: "Sự kiện", label: "🎪 Sự kiện / Hội chợ" },
  { value: "other", label: "✏️ Nguồn khác (Tự nhập...)" },
];

const SHIPPING_CARRIERS = [
  { value: "", label: "-- Không chọn / Chưa gán --" },
  { value: "Giao hàng tiết kiệm (GHTK)", label: "⚡ GHTK (Giao Hàng Tiết Kiệm)" },
  { value: "Giao hàng nhanh (GHN)", label: "🚀 GHN (Giao Hàng Nhanh)" },
  { value: "Viettel Post", label: "🔴 Viettel Post" },
  { value: "VNPost", label: "📮 VNPost (Bưu Điện Việt Nam)" },
  { value: "J&T Express", label: "🚚 J&T Express" },
  { value: "Shopee Xpress (SPX)", label: "🟠 Shopee Xpress (SPX)" },
  { value: "GrabExpress", label: "🟢 GrabExpress" },
  { value: "Ahamove", label: "🛵 Ahamove" },
  { value: "Lalamove", label: "🚐 Lalamove" },
  { value: "Shipper nội bộ", label: "🏍️ Shipper nội bộ cửa hàng" },
  { value: "Khách lấy tại quầy", label: "🚶 Khách tự lấy tại quầy" },
  { value: "other", label: "✏️ Đơn vị khác (Tự nhập...)" },
];

export function CreateOrderModal({ isOpen, onClose, onOrderCreated }: CreateOrderModalProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [sourceSelect, setSourceSelect] = useState("Tại quầy");
  const [customSource, setCustomSource] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Tiền mặt");
  const [carrierSelect, setCarrierSelect] = useState("");
  const [customCarrier, setCustomCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("internal_website");

  const [items, setItems] = useState<LineItemInput[]>([
    { id: "1", product_name: "", quantity: 1, price: 0 },
  ]);

  if (!isOpen) return null;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num || 0);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), product_name: "", quantity: 1, price: 0 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.warning("Đơn hàng cần có ít nhất 1 sản phẩm");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof LineItemInput, val: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  const totalAmount = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerName.trim()) {
      toast.error("Vui lòng nhập họ tên khách hàng");
      return;
    }

    const invalidItems = items.filter((it) => !it.product_name.trim());
    if (invalidItems.length > 0) {
      toast.error("Vui lòng nhập tên đầy đủ cho các sản phẩm trong đơn");
      return;
    }

    const finalSource =
      sourceSelect === "other"
        ? (customSource.trim() || "Khác")
        : sourceSelect;

    const finalCarrier =
      carrierSelect === "other"
        ? customCarrier.trim()
        : carrierSelect;

    setLoading(true);
    try {
      const payload = {
        source_name: finalSource,
        shop_username: finalSource,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        buyer_address: buyerAddress.trim(),
        items: items.map((it) => ({
          product_name: it.product_name.trim(),
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1,
        })),
        payment_method: paymentMethod,
        shipping_carrier: finalCarrier,
        tracking_number: trackingNumber.trim(),
        note: note.trim(),
        tags: tags.trim(),
      };

      const res = await fetch("/api/sapo/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Tạo đơn hàng Sapo thành công!");
        onOrderCreated?.();
        onClose();
      } else {
        toast.error(data.message || "Không thể tạo đơn hàng");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối khi tạo đơn hàng lên Sapo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
              ➕
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base">
                Lập Đơn Hàng Mới
              </h2>
              <p className="text-[11px] text-zinc-500">
                Tạo đơn hàng trực tiếp lên Sapo Omnichannel & đồng bộ tức thì về hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* 1. Nguồn đơn hàng & Khách hàng */}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-3">
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <span>👤</span>
              <span>Nguồn đơn & Thông tin khách hàng</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nguồn đơn hàng Dropdown */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nguồn đơn hàng (Sapo) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sourceSelect}
                  onChange={(e) => setSourceSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs cursor-pointer"
                >
                  {SAPO_ORDER_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {sourceSelect === "other" && (
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên nguồn đơn tùy ý..."
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    className="w-full mt-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs animate-in fade-in duration-150"
                  />
                )}
              </div>

              {/* Họ & tên khách hàng */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Họ & tên khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A hoặc Khách lẻ"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                />
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0987654321"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                />
              </div>

              {/* Địa chỉ giao hàng */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Địa chỉ giao hàng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 123 Lê Lợi, Q1, TP. HCM"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                />
              </div>
            </div>
          </div>

          {/* 2. Danh sách sản phẩm */}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>📦</span>
                <span>Chi tiết sản phẩm ({items.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="py-1 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1 text-[11px]"
              >
                <span>➕</span>
                <span>Thêm dòng</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750"
                >
                  <span className="text-zinc-400 font-mono text-[10px] w-4 shrink-0 text-center">
                    #{index + 1}
                  </span>

                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Tên sản phẩm / quy cách..."
                      required
                      value={item.product_name}
                      onChange={(e) => handleUpdateItem(item.id, "product_name", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-250 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-20 shrink-0">
                      <input
                        type="number"
                        min="1"
                        placeholder="SL"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-250 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-center text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="w-28 shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="Đơn giá"
                        value={item.price || ""}
                        onChange={(e) =>
                          handleUpdateItem(item.id, "price", Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-250 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-right text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="w-24 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs shrink-0">
                      {formatVND(item.price * item.quantity)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Xóa dòng này"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Row */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-500 font-medium">Tổng giá trị sản phẩm:</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatVND(totalAmount)}
              </span>
            </div>
          </div>

          {/* 3. Thanh toán & Vận chuyển */}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-3">
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <span>💳</span>
              <span>Thanh toán & Vận chuyển</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Hình thức thanh toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="Tiền mặt">💵 Tiền mặt</option>
                  <option value="Chuyển khoản">🏦 Chuyển khoản ngân hàng</option>
                  <option value="COD">📦 Thu hộ COD</option>
                  <option value="Ví điện tử">📱 Ví điện tử</option>
                </select>
              </div>

              {/* Đơn vị vận chuyển Dropdown */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Đơn vị vận chuyển
                </label>
                <select
                  value={carrierSelect}
                  onChange={(e) => setCarrierSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs cursor-pointer"
                >
                  {SHIPPING_CARRIERS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {carrierSelect === "other" && (
                  <input
                    type="text"
                    placeholder="Nhập tên đơn vị vận chuyển..."
                    value={customCarrier}
                    onChange={(e) => setCustomCarrier(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs animate-in fade-in duration-150"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Mã vận đơn (Tracking)
                </label>
                <input
                  type="text"
                  placeholder="Mã bill gửi hàng"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Ghi chú đơn hàng (Note)
                </label>
                <textarea
                  rows={2}
                  placeholder="Giao giờ hành chính, đóng gói cẩn thận..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Nhãn / Thẻ phân loại (Tags)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: vãng lai, khách vip, giao gấp..."
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Phân cách nhiều thẻ bằng dấu phẩy
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Đang gửi Sapo...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Tạo đơn hàng Sapo ({formatVND(totalAmount)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

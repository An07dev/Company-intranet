"use client";

import React, { useState, useEffect } from "react";
import { ShopeeOrder } from "@/types";
import { useToast } from "@/context/ToastContext";

interface ShipOrderModalProps {
  order: ShopeeOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderShipped?: (updatedOrder: ShopeeOrder) => void;
}

const POPULAR_CARRIERS = [
  { name: "SPX Express", icon: "🟠", badge: "Shopee Xpress" },
  { name: "Giao Hàng Nhanh (GHN)", icon: "🔷", badge: "GHN" },
  { name: "Giao Hàng Tiết Kiệm (GHTK)", icon: "🟢", badge: "GHTK" },
  { name: "Viettel Post", icon: "🔴", badge: "Viettel Post" },
  { name: "J&T Express", icon: "🔴", badge: "J&T Express" },
  { name: "VNPost (Bưu điện)", icon: "🟡", badge: "VNPost" },
  { name: "GrabExpress", icon: "🟢", badge: "Grab" },
  { name: "Ahamove", icon: "🟧", badge: "Ahamove" },
  { name: "Tự giao hàng / Khác", icon: "🛵", badge: "Nội bộ" },
];

const COMMON_NOTES = [
  "Cho xem hàng không cho thử",
  "Cho thử hàng",
  "Không cho xem hàng",
  "Giao giờ hành chính",
  "Gọi trước khi giao hàng",
];

export function ShipOrderModal({
  order,
  isOpen,
  onClose,
  onOrderShipped,
}: ShipOrderModalProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Form State
  const [carrier, setCarrier] = useState("SPX Express");
  const [customCarrier, setCustomCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingNote, setShippingNote] = useState("Cho xem hàng không cho thử");
  const [codAmount, setCodAmount] = useState<number>(0);
  const [notifyCustomer, setNotifyCustomer] = useState(false);

  // Parsed recipient info from raw_text or order
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  useEffect(() => {
    if (!order || !isOpen) {
      setApiError(null);
      return;
    }

    setApiError(null);
    setRecipientName(order.buyer_username || "");

    // Extract address & phone from raw_text
    let rawObj: any = {};
    if (order.raw_text) {
      try {
        rawObj = JSON.parse(order.raw_text);
      } catch {}
    }

    const shipAddr = rawObj.shipping_address || rawObj.billing_address || {};
    const cust = rawObj.customer || {};

    const phone = shipAddr.phone || cust.phone || "";
    setRecipientPhone(phone);

    const addrParts = [
      shipAddr.address1,
      shipAddr.address2,
      shipAddr.district,
      shipAddr.city,
      shipAddr.province,
    ].filter(Boolean);
    setRecipientAddress(addrParts.join(", ") || shipAddr.address1 || "Việt Nam");

    // Existing carrier / tracking if any
    if (order.shipping_carrier) {
      const match = POPULAR_CARRIERS.find((c) =>
        c.name.toLowerCase().includes(order.shipping_carrier.toLowerCase())
      );
      if (match) {
        setCarrier(match.name);
      } else {
        setCarrier("Tự giao hàng / Khác");
        setCustomCarrier(order.shipping_carrier);
      }
    } else {
      setCarrier("SPX Express");
    }

    setTrackingNumber(order.tracking_number || "");

    // COD calculation
    const isPaid =
      order.order_status === "Đã thanh toán" ||
      rawObj.financial_status === "paid" ||
      (order.payment_method && !order.payment_method.toLowerCase().includes("cod"));
    setCodAmount(isPaid ? 0 : order.total_amount || 0);
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const selectedCarrierName =
    carrier === "Tự giao hàng / Khác" && customCarrier.trim()
      ? customCarrier.trim()
      : carrier;

  const handleGenerateQuickTracking = () => {
    const cleanSn = String(order.marketplace_order_sn || order.order_sn).replace(/^#/, "");
    const prefix = carrier.includes("SPX")
      ? "SPXVN"
      : carrier.includes("GHN")
      ? "GHN"
      : carrier.includes("GHTK")
      ? "GHTK"
      : carrier.includes("Viettel")
      ? "VTP"
      : "SHIP";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setTrackingNumber(`${prefix}${cleanSn.slice(-6)}${randomSuffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCarrierName) {
      setApiError("Vui lòng chọn hoặc nhập đơn vị vận chuyển!");
      return;
    }

    if (!trackingNumber.trim()) {
      setApiError("Vui lòng nhập mã vận đơn!");
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/sapo/orders/fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_sn: order.order_sn,
          shipping_carrier: selectedCarrierName,
          tracking_number: trackingNumber.trim(),
          shipping_note: shippingNote,
          notify_customer: notifyCustomer,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || `Đã đẩy đơn #${order.order_sn} qua ${selectedCarrierName} thành công!`);
        onOrderShipped?.(data.data || order);
        onClose();
      } else {
        const errMsg = data.sapo_detail || data.message || data.error || "Lỗi khi đẩy đơn vận chuyển lên Sapo";
        setApiError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = "Không thể kết nối API máy chủ: " + (err?.message || String(err));
      setApiError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚚</span>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Đẩy đơn qua đối tác vận chuyển
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Đơn hàng:</span>
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                #{order.marketplace_order_sn || order.order_sn}
              </span>
              {order.sapo_order_number && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                  Sapo #{order.sapo_order_number}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
            {apiError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                  <span>⚠️</span>
                  <span>Phản hồi lỗi từ Sapo Omnichannel:</span>
                </div>
                <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2.5 rounded-xl text-rose-900 dark:text-rose-100">
                  {apiError}
                </div>
              </div>
            )}

            {/* Thông tin người nhận */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <span>👤</span>
                  <span>Thông tin người nhận</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {recipientPhone || "Chưa có SĐT"}
                </span>
              </div>
              <div className="text-zinc-900 dark:text-zinc-100 font-medium">
                {recipientName || "Khách lẻ"}
              </div>
              <div className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                📍 {recipientAddress || "Chưa có địa chỉ chi tiết"}
              </div>
            </div>

            {/* Chọn đơn vị vận chuyển */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Đối tác vận chuyển <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {POPULAR_CARRIERS.map((c) => {
                  const isSelected = carrier === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setCarrier(c.name)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? "bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200 font-bold ring-2 ring-orange-500/20"
                          : "bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300 font-medium"
                      }`}
                    >
                      <span className="text-base shrink-0">{c.icon}</span>
                      <span className="truncate">{c.badge}</span>
                    </button>
                  );
                })}
              </div>

              {carrier === "Tự giao hàng / Khác" && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={customCarrier}
                    onChange={(e) => setCustomCarrier(e.target.value)}
                    placeholder="Nhập tên đơn vị vận chuyển khác..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}
            </div>

            {/* Mã vận đơn & COD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Mã vận đơn (Tracking Code) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateQuickTracking}
                    className="text-[10px] text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                  >
                    Gợi ý mã
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: SPXVN0987654321A"
                  className="w-full font-mono text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500 uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Tiền thu hộ COD
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={codAmount}
                    onChange={(e) => setCodAmount(Number(e.target.value) || 0)}
                    className="w-full font-mono text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-400">
                    VNĐ
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400">
                  {codAmount > 0 ? `Thu hộ: ${formatVND(codAmount)}` : "Không thu COD (đã thanh toán)"}
                </div>
              </div>
            </div>

            {/* Ghi chú giao hàng */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Ghi chú cho đơn vị vận chuyển
              </label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {COMMON_NOTES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setShippingNote(n)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      shippingNote === n
                        ? "bg-orange-100 dark:bg-orange-950/60 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 font-semibold"
                        : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={shippingNote}
                onChange={(e) => setShippingNote(e.target.value)}
                placeholder="Ghi chú giao hàng cho shipper..."
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Danh sách sản phẩm trong kiện */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>📦 Sản phẩm giao hàng</span>
                <span className="text-[11px] text-zinc-400 font-normal">
                  {order.items?.length || 0} mặt hàng
                </span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-36 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/50">
                {(order.items || []).map((it, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {it.product_name}
                      </div>
                      {it.variation && (
                        <div className="text-[10px] text-zinc-400">
                          Phân loại: {it.variation}
                        </div>
                      )}
                    </div>
                    <div className="font-mono font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                      x{it.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
            <div className="text-[11px] text-zinc-400 hidden sm:block">
              Hệ thống sẽ đồng bộ tạo phiếu giao hàng trực tiếp trên Sapo Omnichannel.
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    <span>Đang đẩy lên Sapo...</span>
                  </>
                ) : (
                  <>
                    <span>🚚</span>
                    <span>Đẩy đơn & Đồng bộ Sapo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { ShopeeOrder } from "@/types";
import { useToast } from "@/context/ToastContext";
import { CarrierLogo } from "./CarrierLogos";

interface ShipOrderModalProps {
  order: ShopeeOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderShipped?: (updatedOrder: ShopeeOrder) => void;
}

// Danh sách đối tác vận chuyển chuẩn hóa theo hệ thống Sapo Omnichannel & Sapo Express
const INTEGRATED_CARRIERS = [
  { id: "spx", name: "SPX Express", icon: "🟠", badge: "SPX Express", sub: "Shopee Xpress" },
  { id: "ghn", name: "GHN", icon: "🔷", badge: "Giao Hàng Nhanh", sub: "GHN" },
  { id: "ghtk", name: "GHTK", icon: "🟢", badge: "Giao Hàng Tiết Kiệm", sub: "GHTK" },
  { id: "vtp", name: "Viettel Post", icon: "🔴", badge: "Viettel Post", sub: "VTP" },
  { id: "jt", name: "J&T Express", icon: "🔴", badge: "J&T Express", sub: "J&T" },
  { id: "vnpost", name: "VNPost", icon: "🟡", badge: "Vietnam Post", sub: "Bưu điện VN" },
  { id: "grab", name: "GrabExpress", icon: "🟢", badge: "GrabExpress", sub: "Giao hỏa tốc" },
  { id: "ahamove", name: "Ahamove", icon: "🟧", badge: "Ahamove", sub: "Trong ngày" },
];

const SELF_CARRIERS = [
  { id: "other", name: "Đối tác khác", icon: "🛵", badge: "Đối tác khác", sub: "Shipper ngoài / Xe ôm" },
  { id: "internal", name: "Tự giao hàng", icon: "📦", badge: "Tự giao hàng", sub: "Nhân viên nội bộ" },
  { id: "bus", name: "Gửi Chành xe / Bến xe", icon: "🚌", badge: "Chành xe / Xe khách", sub: "Giao liên tỉnh" },
];

const COMMON_NOTES = [
  "Cho xem hàng không cho thử",
  "Cho thử hàng",
  "Không cho xem hàng",
  "Giao giờ hành chính",
  "Gọi trước khi giao hàng",
];

const DEFAULT_WAREHOUSE = "BAO BÌ YẾN SEN (0768122116 - 5/21 Tô Hiệu, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM)";

export function ShipOrderModal({
  order,
  isOpen,
  onClose,
  onOrderShipped,
}: ShipOrderModalProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Tabs: "integrated" (Vận chuyển tích hợp Sapo Express) | "self" (Vận chuyển tự liên hệ)
  const [activeTab, setActiveTab] = useState<"integrated" | "self">("integrated");

  // Form State
  const [carrier, setCarrier] = useState("SPX Express");
  const [customCarrier, setCustomCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingNote, setShippingNote] = useState("Cho xem hàng không cho thử");
  const [codAmount, setCodAmount] = useState<number>(0);
  const [notifyCustomer, setNotifyCustomer] = useState(false);

  // Package specs (Khối lượng & Kích thước như trên Sapo)
  const [weight, setWeight] = useState<number>(500); // grams
  const [length, setLength] = useState<number>(10); // cm
  const [width, setWidth] = useState<number>(10); // cm
  const [height, setHeight] = useState<number>(10); // cm

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
      } catch { }
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
      const matchIntegrated = INTEGRATED_CARRIERS.find(
        (c) => c.name.toLowerCase() === order.shipping_carrier.toLowerCase() ||
          order.shipping_carrier.toLowerCase().includes(c.id)
      );
      if (matchIntegrated) {
        setActiveTab("integrated");
        setCarrier(matchIntegrated.name);
      } else {
        const matchSelf = SELF_CARRIERS.find(
          (c) => c.name.toLowerCase() === order.shipping_carrier.toLowerCase()
        );
        if (matchSelf) {
          setActiveTab("self");
          setCarrier(matchSelf.name);
        } else {
          setActiveTab("self");
          setCarrier("Đối tác khác");
          setCustomCarrier(order.shipping_carrier);
        }
      }
    } else {
      setActiveTab("integrated");
      setCarrier("SPX Express");
    }

    setTrackingNumber(order.tracking_number || "");

    // COD calculation
    const isPaid =
      order.order_status === "Đã thanh toán" ||
      rawObj.financial_status === "paid" ||
      (order.payment_method && !order.payment_method.toLowerCase().includes("cod"));
    setCodAmount(isPaid ? 0 : order.total_amount || 0);

    // Parse weight if available
    if (rawObj.total_weight) {
      setWeight(Number(rawObj.total_weight) || 500);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const selectedCarrierName =
    activeTab === "self" && carrier === "Đối tác khác" && customCarrier.trim()
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
            : carrier.includes("J&T")
              ? "JT"
              : carrier.includes("VNPost")
                ? "VNP"
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
          weight,
          dimensions: { length, width, height },
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
      className="fixed inset-0 z-[60] flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚚</span>
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                Đẩy qua đối tác vận chuyển
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
              <span>Đơn:</span>
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

        {/* 2 Tabs theo chuẩn thiết kế Sapo: "Vận chuyển tích hợp" & "Vận chuyển tự liên hệ" */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 px-3 sm:px-6 pt-2 shrink-0 gap-1 sm:gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("integrated");
              setCarrier("SPX Express");
            }}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${activeTab === "integrated"
              ? "border-orange-600 text-orange-600 dark:text-orange-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
          >
            <span>🚚</span>
            <span className="hidden sm:inline">Vận chuyển tích hợp (Sapo Express)</span>
            <span className="sm:hidden">Tích hợp (Sapo Express)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("self");
              setCarrier("Đối tác khác");
            }}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${activeTab === "self"
              ? "border-orange-600 text-orange-600 dark:text-orange-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
          >
            <span>🛵</span>
            <span className="hidden sm:inline">Vận chuyển tự liên hệ (Đối tác khác / Tự giao)</span>
            <span className="sm:hidden">Tự liên hệ / Tự giao</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-3 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4">
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

            {/* Thông tin Địa chỉ lấy hàng & Địa chỉ giao hàng (2 Cột) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {/* Địa chỉ lấy hàng */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                  <span className="flex items-center gap-1">
                    <span>🏢</span>
                    <span>Địa chỉ lấy hàng (Kho xuất)</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">Mặc định</span>
                </div>
                <div className="text-zinc-800 dark:text-zinc-200 text-[11px] sm:text-xs leading-relaxed break-words">
                  {DEFAULT_WAREHOUSE}
                </div>
              </div>

              {/* Địa chỉ nhận hàng */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-zinc-700 dark:text-zinc-300 gap-1 flex-wrap">
                  <span className="flex items-center gap-1 min-w-0">
                    <span>👤</span>
                    <span className="truncate">Người nhận: {recipientName || "Khách mua"}</span>
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                    {recipientPhone || "Chưa có SĐT"}
                  </span>
                </div>
                <div className="text-zinc-800 dark:text-zinc-200 text-[11px] sm:text-xs leading-relaxed break-words" title={recipientAddress}>
                  📍 {recipientAddress || "Chưa có địa chỉ chi tiết"}
                </div>
              </div>
            </div>

            {/* Lựa chọn đối tác vận chuyển */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Đối tác vận chuyển trên Sapo <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-zinc-400">
                  {activeTab === "integrated" ? "Tích hợp trực tiếp Sapo Express" : "Khai báo hãng vận chuyển độc lập"}
                </span>
              </div>

              {activeTab === "integrated" ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                  {INTEGRATED_CARRIERS.map((c) => {
                    const isSelected = carrier === c.name;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCarrier(c.name)}
                        className={`p-2 sm:p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 min-h-[58px] sm:h-[68px] ${isSelected
                          ? "bg-orange-50/90 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200 font-bold ring-2 ring-orange-500/20 shadow-xs"
                          : "bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          }`}
                      >
                        <CarrierLogo carrierId={c.id} size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate text-[11px] sm:text-xs leading-tight text-zinc-900 dark:text-zinc-100">
                            {c.badge}
                          </div>
                          <div className="text-[9.5px] sm:text-[10px] text-zinc-400 dark:text-zinc-400 truncate mt-0.5 font-normal">
                            {c.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                    {SELF_CARRIERS.map((c) => {
                      const isSelected = carrier === c.name;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCarrier(c.name)}
                          className={`p-2.5 sm:p-3 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center gap-2.5 sm:gap-3 ${isSelected
                            ? "bg-orange-50/90 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200 font-bold ring-2 ring-orange-500/20 shadow-xs"
                            : "bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            }`}
                        >
                          <CarrierLogo carrierId={c.id} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[11px] sm:text-xs leading-tight text-zinc-900 dark:text-zinc-100">
                              {c.badge}
                            </div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-400 mt-0.5 font-normal">
                              {c.sub}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {carrier === "Đối tác khác" && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={customCarrier}
                        onChange={(e) => setCustomCarrier(e.target.value)}
                        placeholder="Nhập tên đối tác vận chuyển ngoài (ví dụ: Shipper Tuấn, Xe Kim Hoàng, v.v.)..."
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Thông số kiện hàng & Tiền thu hộ COD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 sm:p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-800">
              {/* Khối lượng & Kích thước */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span>⚖️ Khối lượng & Kích thước kiện</span>
                </div>
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                  <div>
                    <label className="text-[9.5px] sm:text-[10px] text-zinc-400 block mb-0.5 truncate">Khối lượng</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value) || 0)}
                        className="w-full text-[11px] sm:text-xs font-semibold px-1.5 sm:px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white pr-3.5 sm:pr-4"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400">g</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9.5px] sm:text-[10px] text-zinc-400 block mb-0.5 truncate">Dài</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={length}
                        onChange={(e) => setLength(Number(e.target.value) || 0)}
                        className="w-full text-[11px] sm:text-xs font-semibold px-1.5 sm:px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white pr-4 sm:pr-5"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9.5px] sm:text-[10px] text-zinc-400 block mb-0.5 truncate">Rộng</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value) || 0)}
                        className="w-full text-[11px] sm:text-xs font-semibold px-1.5 sm:px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white pr-4 sm:pr-5"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9.5px] sm:text-[10px] text-zinc-400 block mb-0.5 truncate">Cao</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value) || 0)}
                        className="w-full text-[11px] sm:text-xs font-semibold px-1.5 sm:px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white pr-4 sm:pr-5"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400">cm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tiền thu hộ COD */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  💰 Tiền thu hộ COD
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={codAmount}
                    onChange={(e) => setCodAmount(Number(e.target.value) || 0)}
                    className="w-full font-mono text-xs font-semibold px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-400">
                    VNĐ
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400">
                  {codAmount > 0 ? `Thu hộ: ${formatVND(codAmount)}` : "Không thu COD (Đã thanh toán trước)"}
                </div>
              </div>
            </div>

            {/* Mã vận đơn (Tracking Number) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Mã vận đơn (Tracking Code){" "}
                  {activeTab === "integrated" ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                      (⚡ Đối tác vận chuyển tự cấp)
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-normal">
                      (Tùy chọn)
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={handleGenerateQuickTracking}
                  className="text-[10px] text-orange-600 dark:text-orange-400 hover:underline cursor-pointer font-medium"
                >
                  ⚡ Gợi ý mã tự động
                </button>
              </div>

              {activeTab === "integrated" && !trackingNumber && (
                <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <span className="text-sm shrink-0">ℹ️</span>
                  <span>
                    Với <strong>Vận chuyển tích hợp Sapo Express</strong>, mã vận đơn sẽ do đối tác (<strong>{selectedCarrierName}</strong>) cấp và tự động đồng bộ về hệ thống sau khi tiếp nhận đơn.
                  </span>
                </div>
              )}

              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                placeholder={
                  activeTab === "integrated"
                    ? "Để trống để đối tác tự cấp mã (hoặc nhập nếu đã có mã sẵn)..."
                    : "Nhập mã vận đơn bưu tá cung cấp (hoặc nhấn Gợi ý mã)..."
                }
                className="w-full font-mono text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500 uppercase"
              />
            </div>

            {/* Ghi chú giao hàng */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Ghi chú cho shipper / Yêu cầu khi giao
              </label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {COMMON_NOTES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setShippingNote(n)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${shippingNote === n
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
                <span>📦 Sản phẩm trong kiện hàng</span>
                <span className="text-[11px] text-zinc-400 font-normal">
                  {order.items?.length || 0} mặt hàng
                </span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-32 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/50">
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
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0 gap-2">
            <div className="text-[11px] text-zinc-400 hidden sm:block">
              Hệ thống sẽ đồng bộ tạo phiếu giao hàng trực tiếp trên Sapo Omnichannel.
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 sm:flex-initial px-4 py-2 sm:py-2.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer text-center"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial px-5 py-2 sm:py-2.5 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 text-center"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    <span>Đang đẩy lên Sapo...</span>
                  </>
                ) : (
                  <>
                    <span>🚚</span>
                    <span>Đẩy đơn</span>
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

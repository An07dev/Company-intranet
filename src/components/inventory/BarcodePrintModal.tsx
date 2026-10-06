"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { ShopeeProduct } from "@/types";

interface BarcodePrintModalProps {
  product: ShopeeProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodePrintModal({ product, isOpen, onClose }: BarcodePrintModalProps) {
  const [labelSize, setLabelSize] = useState<"50x30" | "40x30" | "75x50">("50x30");
  const [copyCount, setCopyCount] = useState<number>(1);
  const [showPrice, setShowPrice] = useState(true);
  const [showBranch, setShowBranch] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const skuCode = product?.parent_sku || (product?.item_id ? `SKU-${product.item_id}` : "UNKNOWN");
  const priceDisplay =
    product?.price_display && product?.price_display !== "₫0" && product?.price_display !== "₫"
      ? product.price_display
      : product?.price_min
      ? `₫${product.price_min.toLocaleString("vi-VN")}`
      : "--";

  // Generate QR Code
  useEffect(() => {
    if (!isOpen || !product) return;

    QRCode.toDataURL(skuCode, {
      margin: 1,
      width: 160,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Lỗi tạo mã QR:", err));
  }, [isOpen, product, skuCode]);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              🖨️
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base">
                In Tem Mã QR Định Danh Sản Phẩm
              </h2>
              <p className="text-[11px] text-zinc-500">
                In tem dán nhãn mã QR lên bao bì, thùng hàng phục vụ quét mã tra cứu tồn kho
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

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Cấu hình nhãn in */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Khổ giấy tem nhãn
              </label>
              <select
                value={labelSize}
                onChange={(e: any) => setLabelSize(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="50x30">50 x 30 mm (Khổ chuẩn)</option>
                <option value="40x30">40 x 30 mm (Nhỏ gọn)</option>
                <option value="75x50">75 x 50 mm (Thùng carton)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Định dạng mã
              </label>
              <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 rounded-xl font-semibold flex items-center gap-1.5">
                <span>📱</span>
                <span>Mã QR Code (Duy nhất)</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Số lượng tem in
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={copyCount}
                  onChange={(e) => setCopyCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-2 py-1.5 text-center bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setCopyCount(Math.max(1, product.stock || 1))}
                  className="px-2 py-1.5 text-[10px] font-medium rounded-xl bg-zinc-200/70 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition"
                  title="In bằng đúng số lượng tồn kho hiện có"
                >
                  Theo tồn ({product.stock})
                </button>
              </div>
            </div>
          </div>

          {/* Tùy chọn hiển thị */}
          <div className="flex items-center gap-4 flex-wrap text-zinc-600 dark:text-zinc-300 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Hiển thị Giá bán</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showBranch}
                onChange={(e) => setShowBranch(e.target.checked)}
                className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Hiển thị Kho Tổng Yến Sen</span>
            </label>
          </div>

          {/* Vùng xem trước tem in (Preview Label) */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Bản xem trước mẫu tem ({labelSize} mm):
            </div>

            <div className="flex justify-center p-6 bg-zinc-100 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div
                id="barcode-print-sample"
                className={`bg-white text-black p-3 rounded-xl border border-zinc-300 shadow-md flex flex-col justify-between items-center transition-all ${
                  labelSize === "40x30"
                    ? "w-[230px] min-h-[170px]"
                    : labelSize === "75x50"
                    ? "w-[320px] min-h-[220px]"
                    : "w-[270px] min-h-[190px]"
                }`}
              >
                {/* Header tem */}
                <div className="w-full flex items-center justify-between border-b border-black/15 pb-1 mb-1">
                  <span className="font-extrabold text-[10px] tracking-wider uppercase text-zinc-900">
                    BAO BÌ YẾN SEN
                  </span>
                  {showBranch && (
                    <span className="text-[9px] font-semibold text-zinc-600">
                      Kho Tổng
                    </span>
                  )}
                </div>

                {/* Tên sản phẩm */}
                <div className="w-full font-bold text-center text-xs line-clamp-2 leading-tight px-1 mb-1 text-zinc-900">
                  {product.name}
                </div>

                {/* Mã QR Code Trung Tâm */}
                <div className="flex flex-col items-center justify-center my-0.5">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className={
                        labelSize === "40x30"
                          ? "w-20 h-20"
                          : labelSize === "75x50"
                          ? "w-28 h-28"
                          : "w-24 h-24"
                      }
                    />
                  ) : (
                    <div className="w-20 h-20 bg-zinc-100 animate-pulse rounded" />
                  )}
                  <span className="font-mono text-[10px] font-bold tracking-wider text-zinc-900 mt-0.5">
                    {skuCode}
                  </span>
                </div>

                {/* Footer tem */}
                <div className="w-full flex items-center justify-between border-t border-black/15 pt-1 mt-1 text-[10px]">
                  <span className="font-mono font-semibold text-zinc-600">
                    ID: #{product.item_id}
                  </span>
                  {showPrice && (
                    <span className="font-bold font-mono text-zinc-900">
                      {priceDisplay}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <div className="text-[11px] text-zinc-500">
            Sẽ in: <strong>{copyCount}</strong> tem mã QR
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="py-2 px-5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>🖨️</span>
              <span>In {copyCount} Tem QR Ngay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Print Container for window.print() */}
      <div id="barcode-print-area" className="hidden print:block print:w-full print:m-0 print:p-0">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #barcode-print-area, #barcode-print-area * {
                visibility: visible !important;
              }
              #barcode-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 3mm !important;
              }
              .print-label-item {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin-bottom: 2mm !important;
              }
            }
          `
        }} />

        {Array.from({ length: copyCount }).map((_, idx) => (
          <div
            key={idx}
            className={`print-label-item bg-white text-black p-2 border border-black/30 flex flex-col justify-between items-center ${
              labelSize === "40x30"
                ? "w-[40mm] h-[30mm]"
                : labelSize === "75x50"
                ? "w-[75mm] h-[50mm]"
                : "w-[50mm] h-[30mm]"
            }`}
          >
            <div className="w-full flex items-center justify-between text-[7pt] font-extrabold uppercase border-b border-black pb-0.5 mb-0.5">
              <span>BAO BÌ YẾN SEN</span>
              {showBranch && <span>Kho Tổng</span>}
            </div>

            <div className="w-full font-bold text-center text-[7pt] leading-tight line-clamp-2 px-0.5">
              {product.name}
            </div>

            <div className="w-full flex flex-col items-center justify-center my-0.5">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt=""
                  className={
                    labelSize === "40x30"
                      ? "w-[17mm] h-[17mm]"
                      : labelSize === "75x50"
                      ? "w-[28mm] h-[28mm]"
                      : "w-[20mm] h-[20mm]"
                  }
                />
              )}
              <span className="font-mono text-[6pt] font-bold mt-0.5">{skuCode}</span>
            </div>

            <div className="w-full flex items-center justify-between border-t border-black pt-0.5 text-[6pt]">
              <span className="font-mono">ID: #{product.item_id}</span>
              {showPrice && <span className="font-bold">{priceDisplay}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

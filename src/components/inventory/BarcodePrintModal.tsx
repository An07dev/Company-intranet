"use client";

import React, { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { ShopeeProduct } from "@/types";
import { useToast } from "@/context/ToastContext";

interface BarcodePrintModalProps {
  product: ShopeeProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodePrintModal({ product, isOpen, onClose }: BarcodePrintModalProps) {
  const { toast } = useToast();

  const [labelSize, setLabelSize] = useState<"50x30" | "40x30" | "75x50">("50x30");
  const [codeType, setCodeType] = useState<"both" | "barcode" | "qr">("both");
  const [copyCount, setCopyCount] = useState<number>(1);
  const [showPrice, setShowPrice] = useState(true);
  const [showBranch, setShowBranch] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  const skuCode = product?.parent_sku || (product?.item_id ? `SKU-${product.item_id}` : "UNKNOWN");
  const priceDisplay =
    product?.price_display && product?.price_display !== "₫0" && product?.price_display !== "₫"
      ? product.price_display
      : product?.price_min
      ? `₫${product.price_min.toLocaleString("vi-VN")}`
      : "--";

  // Generate QR Code and Barcode
  useEffect(() => {
    if (!isOpen || !product) return;

    // 1. Generate QR Code
    QRCode.toDataURL(skuCode, {
      margin: 1,
      width: 120,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Lỗi tạo mã QR:", err));

    // 2. Generate Barcode (Code 128)
    if (barcodeSvgRef.current) {
      try {
        JsBarcode(barcodeSvgRef.current, skuCode, {
          format: "CODE128",
          width: labelSize === "40x30" ? 1.3 : 1.6,
          height: labelSize === "40x30" ? 34 : 44,
          displayValue: true,
          fontSize: 10,
          font: "monospace",
          margin: 4,
          textMargin: 2,
        });
      } catch (err) {
        console.error("Lỗi tạo Barcode:", err);
      }
    }
  }, [isOpen, product, skuCode, labelSize]);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              🖨️
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base">
                In Mã Định Danh Sản Phẩm (Barcode / QR)
              </h2>
              <p className="text-[11px] text-zinc-500">
                In tem dán nhãn bao bì, thùng hàng phục vụ quét mã kiểm kho và xuất nhập
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
        <div className="overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
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
                <option value="50x30">50 x 30 mm (Chuẩn nhiệt)</option>
                <option value="40x30">40 x 30 mm (Nhỏ gọn)</option>
                <option value="75x50">75 x 50 mm (Thùng carton)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Định dạng mã
              </label>
              <select
                value={codeType}
                onChange={(e: any) => setCodeType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="both">Mã vạch 1D + QR 2D</option>
                <option value="barcode">Chỉ Mã vạch (Code 128)</option>
                <option value="qr">Chỉ Mã QR (2D)</option>
              </select>
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
                  title="In bằng đúng số lượng tồn hiện có"
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
                className={`bg-white text-black p-3.5 rounded-xl border border-zinc-300 shadow-md flex flex-col justify-between items-center transition-all ${
                  labelSize === "40x30"
                    ? "w-[240px] min-h-[170px]"
                    : labelSize === "75x50"
                    ? "w-[340px] min-h-[220px]"
                    : "w-[290px] min-h-[190px]"
                }`}
              >
                {/* Header tem */}
                <div className="w-full flex items-center justify-between border-b border-black/10 pb-1 mb-1">
                  <span className="font-extrabold text-[10px] tracking-wider uppercase">
                    BAO BÌ YẾN SEN
                  </span>
                  {showBranch && (
                    <span className="text-[9px] font-medium text-zinc-600">
                      Kho Tổng
                    </span>
                  )}
                </div>

                {/* Tên sản phẩm */}
                <div className="w-full font-bold text-center text-xs line-clamp-2 leading-tight px-1 mb-1 text-zinc-900">
                  {product.name}
                </div>

                {/* Barcode & QR Code */}
                <div className="w-full flex items-center justify-center gap-2 py-1">
                  {(codeType === "both" || codeType === "barcode") && (
                    <div className="flex flex-col items-center">
                      <svg ref={barcodeSvgRef} className="max-w-full" />
                    </div>
                  )}

                  {(codeType === "both" || codeType === "qr") && qrDataUrl && (
                    <div className="flex flex-col items-center">
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className={codeType === "qr" ? "w-24 h-24" : "w-14 h-14"}
                      />
                      {codeType === "qr" && (
                        <span className="font-mono text-[9px] font-bold mt-0.5">{skuCode}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer tem */}
                <div className="w-full flex items-center justify-between border-t border-black/10 pt-1 mt-1 text-[10px]">
                  <span className="font-mono font-semibold text-zinc-700">
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
            Sẽ in: <strong>{copyCount}</strong> con tem
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
              <span>In {copyCount} Tem Ngay</span>
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
                gap: 4mm !important;
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
            className={`print-label-item bg-white text-black p-2 border border-black/20 flex flex-col justify-between items-center ${
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

            <div className="w-full font-bold text-center text-[7pt] leading-tight line-clamp-2">
              {product.name}
            </div>

            <div className="w-full flex items-center justify-center gap-1 my-0.5">
              {(codeType === "both" || codeType === "barcode") && (
                <div className="flex flex-col items-center">
                  <svg
                    ref={(el) => {
                      if (el) {
                        try {
                          JsBarcode(el, skuCode, {
                            format: "CODE128",
                            width: labelSize === "40x30" ? 1.0 : 1.3,
                            height: labelSize === "40x30" ? 24 : 32,
                            displayValue: true,
                            fontSize: 8,
                            margin: 1,
                          });
                        } catch {}
                      }
                    }}
                  />
                </div>
              )}

              {(codeType === "both" || codeType === "qr") && qrDataUrl && (
                <div className="flex flex-col items-center">
                  <img
                    src={qrDataUrl}
                    alt=""
                    className={codeType === "qr" ? "w-16 h-16" : "w-10 h-10"}
                  />
                  {codeType === "qr" && (
                    <span className="font-mono text-[6pt] font-bold">{skuCode}</span>
                  )}
                </div>
              )}
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

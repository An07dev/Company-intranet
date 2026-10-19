"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Package } from "@/types";

interface PackageQRPrintModalProps {
  packageData: Package | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PackageQRPrintModal({
  packageData,
  isOpen,
  onClose,
}: PackageQRPrintModalProps) {
  const [labelSize, setLabelSize] = useState<"100x150" | "75x50" | "50x30" | "a4">("100x150");
  const [copyCount, setCopyCount] = useState<number>(1);
  const [showItemList, setShowItemList] = useState(true);
  const [showDestination, setShowDestination] = useState(true);
  const [showPacker, setShowPacker] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const printAreaRef = useRef<HTMLDivElement | null>(null);

  // Generate QR Code data URL when package changes
  useEffect(() => {
    if (!isOpen || !packageData) return;

    // QR Data encodes the package code
    const qrText = packageData.code;

    QRCode.toDataURL(qrText, {
      margin: 1,
      width: 240,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Lỗi tạo mã QR:", err));
  }, [isOpen, packageData]);

  if (!isOpen || !packageData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
              🖨️
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base sm:text-lg">
                In Tem Mã QR Kiện Hàng
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tem dán thùng carton, nhãn định danh kiện hàng phục vụ quét mã kiểm kho và xuất vận
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1 text-xs">
          {/* Cấu hình thông số in */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Khổ tem nhãn
              </label>
              <select
                value={labelSize}
                onChange={(e: any) => setLabelSize(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="100x150">100 x 150 mm (Chuẩn vận đơn A6 dán thùng)</option>
                <option value="75x50">75 x 50 mm (Tem thùng vừa)</option>
                <option value="50x30">50 x 30 mm (Tem nhiệt mini dán hộp)</option>
                <option value="a4">Khổ A4 / A5 (Phiếu bàn giao kiện)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Số lượng bản in
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={copyCount}
                onChange={(e) => setCopyCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col justify-end">
              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Tùy chọn hiển thị
              </span>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showItemList}
                    onChange={(e) => setShowItemList(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Ds sản phẩm</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDestination}
                    onChange={(e) => setShowDestination(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Điểm đến</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPacker}
                    onChange={(e) => setShowPacker(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Người đóng</span>
                </label>
              </div>
            </div>
          </div>

          {/* Khu vực xem trước tem in (Live Preview) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Bản xem trước tem nhãn dán ({labelSize}mm)
              </span>
              <span className="text-[10px] text-zinc-400">Hỗ trợ máy in nhiệt HPRT, Xprinter, Gprinter, Canon...</span>
            </div>

            <div className="p-3 sm:p-6 bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex justify-center items-center overflow-x-auto min-h-[300px]">
              <div
                ref={printAreaRef}
                id="package-print-area"
                className="bg-white text-zinc-900 border-2 border-zinc-800 rounded-xl shadow-xl p-3.5 sm:p-5 select-none print:shadow-none print:border-none w-full max-w-full"
                style={{
                  width:
                    labelSize === "100x150"
                      ? "380px"
                      : labelSize === "75x50"
                      ? "320px"
                      : labelSize === "50x30"
                      ? "240px"
                      : "500px",
                  maxWidth: "100%",
                  minHeight: labelSize === "50x30" ? "140px" : "auto",
                }}
              >
                {/* 1. Header tem */}
                <div className="border-b-2 border-zinc-900 pb-2 text-center">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                      YEN SEN LOGISTICS • TEM KIỆN HÀNG
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 font-bold">
                      {packageData.package_type}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold tracking-tight mt-1 text-zinc-950 uppercase line-clamp-1">
                    {packageData.title}
                  </h3>
                </div>

                {/* 2. QR Code và thông tin chính */}
                <div className="flex items-center gap-3 py-3 border-b border-zinc-300">
                  <div className="shrink-0 text-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="w-24 h-24 object-contain mx-auto border border-zinc-200 rounded p-1"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-zinc-100 flex items-center justify-center font-mono text-[10px]">
                        Tạo QR...
                      </div>
                    )}
                    <span className="text-[8px] text-zinc-500 font-semibold block mt-0.5">QUÉT ĐỂ KIỂM KHO</span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div>
                      <span className="text-[9px] text-zinc-500 block uppercase font-medium">MÃ KIỆN:</span>
                      <span className="font-mono text-base font-black tracking-wider text-zinc-950 block">
                        {packageData.code}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                      <div>
                        <span className="text-[9px] text-zinc-500 block">TỔNG SẢN PHẨM:</span>
                        <strong className="text-zinc-900 font-bold text-sm">
                          {packageData.total_items}{" "}
                          <span className="text-[10px] font-normal text-zinc-600">sp</span>
                        </strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500 block">SỐ MẶT HÀNG:</span>
                        <strong className="text-zinc-900 font-bold text-sm">
                          {packageData.total_sku_count || packageData.items.length}{" "}
                          <span className="text-[10px] font-normal text-zinc-600">loại</span>
                        </strong>
                      </div>
                    </div>

                    {packageData.weight_kg ? (
                      <div className="text-[10px]">
                        <span className="text-zinc-500">Khối lượng:</span>{" "}
                        <strong className="font-semibold">{packageData.weight_kg} kg</strong>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 3. Điểm đến & Vị trí kho */}
                {showDestination && (packageData.destination || packageData.warehouse_location) && (
                  <div className="py-2 border-b border-zinc-300 text-[11px] space-y-0.5">
                    {packageData.destination && (
                      <div className="flex items-start gap-1">
                        <span className="text-zinc-500 shrink-0 font-medium">Điểm đến:</span>
                        <strong className="text-zinc-900 break-words">{packageData.destination}</strong>
                      </div>
                    )}
                    {packageData.warehouse_location && (
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500 shrink-0 font-medium">Vị trí kho:</span>
                        <strong className="text-zinc-900 font-mono">{packageData.warehouse_location}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Danh sách sản phẩm bên trong (nếu chọn hiển thị và khổ tem đủ lớn) */}
                {showItemList && labelSize !== "50x30" && packageData.items.length > 0 && (
                  <div className="py-2 border-b border-zinc-300">
                    <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      <span>DANH MỤC HÀNG TRONG KIỆN</span>
                      <span>S.LƯỢNG</span>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {packageData.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] leading-tight">
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-zinc-900 line-clamp-1">
                              {idx + 1}. {it.product_name}
                            </span>
                            {it.variation_name && (
                              <span className="text-[9px] text-zinc-500 block">
                                Phân loại: {it.variation_name}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-zinc-950 shrink-0">
                            x{it.quantity} {it.unit || "Cái"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Ghi chú & Footer */}
                <div className="pt-2 text-[9px] text-zinc-500 flex items-center justify-between">
                  <div>
                    {showPacker && (
                      <div>
                        <span>Đóng gói: </span>
                        <strong>{packageData.packed_by || packageData.created_by?.name || "Kho vận"}</strong>
                      </div>
                    )}
                    <div>
                      <span>Ngày tạo: </span>
                      <span>{new Date(packageData.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[8px] text-zinc-400 block">{packageData.id}</span>
                    <span className="font-bold text-zinc-800 text-[10px]">ĐÃ KIỂM ĐỦ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>🖨️ In {copyCount > 1 ? `${copyCount} bản tem` : "Tem ngay"}</span>
          </button>
        </div>
      </div>

      {/* Global Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #package-print-area,
          #package-print-area * {
            visibility: visible;
          }
          #package-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0;
            padding: 10px;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

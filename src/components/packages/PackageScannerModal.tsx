"use client";

import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useToast } from "@/context/ToastContext";
import { Package } from "@/types";

interface PackageScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPackage?: (pkg: Package) => void;
  onOpenPrint?: (pkg: Package) => void;
}

// Hàm phát tiếng beep thông báo quét mã thành công
function playBeepSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // Note C6
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch {}
}

export function PackageScannerModal({
  isOpen,
  onClose,
  onSelectPackage,
  onOpenPrint,
}: PackageScannerModalProps) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"camera" | "gun" | "image">("camera");
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Scanned result
  const [scannedPackage, setScannedPackage] = useState<Package | null>(null);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Look up package by code
  const lookupPackage = async (code: string) => {
    if (!code || !code.trim()) return;

    playBeepSound();
    setIsLoadingPackage(true);
    setNotFoundCode(null);

    try {
      const res = await fetch(`/api/packages/lookup?code=${encodeURIComponent(code.trim())}`);
      const json = await res.json();

      if (json.success && json.data) {
        setScannedPackage(json.data);
        toast.success(`Đã tìm thấy kiện hàng: ${json.data.code}`);
      } else {
        setScannedPackage(null);
        setNotFoundCode(code.trim());
        toast.error(json.message || `Không tìm thấy kiện hàng mã "${code}"`);
      }
    } catch (err: any) {
      console.error("Lỗi tra cứu kiện hàng:", err);
      toast.error("Lỗi khi kết nối đến máy chủ tra cứu kiện hàng");
    } finally {
      setIsLoadingPackage(false);
    }
  };

  // Khởi động Camera khi mở Modal
  useEffect(() => {
    if (!isOpen || activeTab !== "camera" || scannedPackage) {
      stopCamera();
      return;
    }

    let isMounted = true;
    const scannerElementId = "html5-package-scanner";

    const startScanner = async () => {
      setCameraError(null);
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!devices || devices.length === 0) {
          setCameraError("Không tìm thấy camera trên thiết bị này");
          return;
        }

        setCameras(devices);
        const preferredCam =
          devices.find((d) => /back|rear|environment/i.test(d.label)) || devices[devices.length - 1];
        const chosenId = preferredCam.id;
        setSelectedCameraId(chosenId);

        const qrScanner = new Html5Qrcode(scannerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
          ],
          verbose: false,
        });
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 15,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        };

        await qrScanner.start(
          chosenId,
          config,
          (decodedText) => {
            // Khi quét thành công mã QR
            lookupPackage(decodedText);
          },
          () => {
            // Frame callback (ignore errors between frames)
          }
        );

        if (isMounted) setIsScanning(true);
      } catch (err: any) {
        console.error("Lỗi khởi động camera:", err);
        if (isMounted) {
          setCameraError(
            err.message?.includes("NotAllowedError")
              ? "Trình duyệt chưa được cấp quyền sử dụng camera. Vui lòng bật quyền truy cập camera trong cài đặt trình duyệt."
              : "Không thể mở camera. Bạn có thể sử dụng tab 'Máy quét mã vạch' hoặc 'Tải ảnh QR'."
          );
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, activeTab, scannedPackage]);

  // Focus ô nhập khi ở tab máy quét
  useEffect(() => {
    if (activeTab === "gun" && manualInputRef.current) {
      manualInputRef.current.focus();
    }
  }, [activeTab]);

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {
        // ignore
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
      setTorchOn(false);
    }
  };

  const handleSwitchCamera = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    await stopCamera();
    // useEffect will trigger restart
  };

  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    try {
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch {
      toast.info("Thiết bị hoặc camera không hỗ trợ đèn Flash");
    }
  };

  // Quét từ file ảnh
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("html5-file-reader-package");
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      lookupPackage(decodedText);
    } catch (err) {
      toast.error("Không tìm thấy mã QR hợp lệ trong bức ảnh này");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Cập nhật trạng thái nhanh cho kiện hàng
  const handleQuickStatusUpdate = async (status: Package["status"]) => {
    if (!scannedPackage) return;

    try {
      const res = await fetch(`/api/packages/${scannedPackage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setScannedPackage(json.data);
        toast.success(`Đã cập nhật trạng thái kiện hàng sang: ${status}`);
      } else {
        toast.error(json.message || "Không thể cập nhật trạng thái");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối khi cập nhật trạng thái");
    }
  };

  // Reset để quét tiếp kiện khác
  const handleResetScan = () => {
    setScannedPackage(null);
    setNotFoundCode(null);
    setManualCode("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
              📷
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base sm:text-lg">
                Quét Mã QR Tra Cứu Kiện Hàng
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sử dụng Camera, súng bắn mã hoặc tải ảnh để tra cứu và xuất nhập kiện hàng tức thì
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

        {/* Tab Selection (Chỉ hiện khi chưa có kết quả) */}
        {!scannedPackage && (
          <div className="grid grid-cols-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/20 text-center text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("camera")}
              className={`py-2.5 px-2 font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "camera"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <span>📸</span>
              <span className="truncate">Camera</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("gun")}
              className={`py-2.5 px-2 font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "gun"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <span>🔫</span>
              <span className="truncate">Súng quét</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("image")}
              className={`py-2.5 px-2 font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "image"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <span>🖼️</span>
              <span className="truncate">Tải ảnh</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 text-xs">
          {/* Loading indicator */}
          {isLoadingPackage && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">Đang tra cứu kiện hàng trong hệ thống...</p>
            </div>
          )}

          {/* HIỂN THỊ KẾT QUẢ KIỆN HÀNG VỪA QUÉT */}
          {!isLoadingPackage && scannedPackage && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <span className="font-mono text-base font-extrabold text-emerald-900 dark:text-emerald-200">
                      {scannedPackage.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        scannedPackage.status === "delivered"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                          : scannedPackage.status === "in_transit"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                          : scannedPackage.status === "packed"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                          : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {scannedPackage.status === "delivered"
                        ? "Đã giao / Hoàn thành"
                        : scannedPackage.status === "in_transit"
                        ? "Đang vận chuyển"
                        : scannedPackage.status === "packed"
                        ? "Đã đóng gói"
                        : "Bản nháp"}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    {scannedPackage.title}
                  </h3>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Loại: <strong>{scannedPackage.package_type}</strong>
                    {scannedPackage.destination && (
                      <span> • Điểm đến: <strong>{scannedPackage.destination}</strong></span>
                    )}
                    {scannedPackage.warehouse_location && (
                      <span> • Vị trí: <strong>{scannedPackage.warehouse_location}</strong></span>
                    )}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-zinc-500 block">Tổng số lượng</span>
                  <span className="font-mono font-black text-xl text-emerald-600 dark:text-emerald-400">
                    {scannedPackage.total_items}{" "}
                    <span className="text-xs font-normal text-zinc-500">sp</span>
                  </span>
                </div>
              </div>

              {/* Danh sách các sản phẩm và số lượng trong kiện */}
              <div>
                <h4 className="font-bold text-xs text-zinc-700 dark:text-zinc-300 mb-2 flex items-center justify-between">
                  <span>Chi tiết hàng hóa trong kiện ({scannedPackage.items.length} mặt hàng):</span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Tổng: {scannedPackage.total_items} sản phẩm
                  </span>
                </h4>

                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-[11px] font-semibold text-zinc-500">
                        <th className="py-2 px-3">Sản phẩm</th>
                        <th className="py-2 px-3 text-right">Số lượng</th>
                        <th className="py-2 px-3 text-right">Đơn giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {scannedPackage.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {it.image ? (
                                <img
                                  src={it.image}
                                  alt={it.product_name}
                                  className="w-8 h-8 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-800"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs shrink-0">
                                  🏷️
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-xs">
                                  {it.product_name}
                                </p>
                                {it.variation_name && (
                                  <span className="text-[10px] text-zinc-500 block">
                                    Phân loại: {it.variation_name}
                                  </span>
                                )}
                                {it.sku && (
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    SKU: {it.sku}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            x{it.quantity} {it.unit || "Cái"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                            {it.unit_price ? `₫${it.unit_price.toLocaleString("vi-VN")}` : "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Các thao tác nhanh 1-chạm */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block">
                  Thao tác cập nhật trạng thái nhanh:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickStatusUpdate("packed")}
                    className={`py-2 px-3 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                      scannedPackage.status === "packed"
                        ? "bg-amber-600 text-white"
                        : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    }`}
                  >
                    <span>📦 Đã đóng gói</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStatusUpdate("in_transit")}
                    className={`py-2 px-3 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                      scannedPackage.status === "in_transit"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    }`}
                  >
                    <span>🚚 Đang vận chuyển</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStatusUpdate("delivered")}
                    className={`py-2 px-3 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                      scannedPackage.status === "delivered"
                        ? "bg-emerald-600 text-white"
                        : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    }`}
                  >
                    <span>✅ Đã giao / Hoàn tất</span>
                  </button>
                </div>
              </div>

              {/* Nút hành động bổ sung */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetScan}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5"
                >
                  <span>🔄 Quét tiếp kiện khác</span>
                </button>

                <div className="flex items-center gap-2">
                  {onOpenPrint && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenPrint(scannedPackage);
                        onClose();
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <span>🖨️ In tem QR</span>
                    </button>
                  )}

                  {onSelectPackage && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPackage(scannedPackage);
                        onClose();
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <span>👁️ Xem chi tiết</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* THÔNG BÁO KHÔNG TÌM THẤY KIỆN HÀNG */}
          {!isLoadingPackage && !scannedPackage && notFoundCode && (
            <div className="py-6 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-center space-y-3">
              <div className="text-3xl">⚠️</div>
              <h4 className="font-bold text-rose-800 dark:text-rose-200 text-sm">
                Không tìm thấy kiện hàng nào khớp với mã:
              </h4>
              <p className="font-mono text-base font-bold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 py-1.5 px-3 rounded-lg inline-block border border-rose-300 dark:border-rose-800">
                {notFoundCode}
              </p>
              <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                Kiểm tra lại xem mã QR có thuộc hệ thống quản lý kiện hàng nội bộ hay không, hoặc tạo kiện hàng mới với mã này.
              </p>
              <div>
                <button
                  type="button"
                  onClick={handleResetScan}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors"
                >
                  Thử quét lại
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: CAMERA */}
          {!isLoadingPackage && !scannedPackage && !notFoundCode && activeTab === "camera" && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-[340px] mx-auto border-2 border-emerald-500/50 shadow-inner">
                <div id="html5-package-scanner" className="w-full h-full" />

                {/* Laser scan animation overlay */}
                <div className="absolute inset-x-6 top-0 bottom-0 pointer-events-none flex flex-col justify-center">
                  <div className="w-full h-0.5 bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse" />
                </div>
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800">
                  {cameraError}
                </div>
              )}

              {/* Controls bar */}
              <div className="flex items-center justify-between gap-3 max-w-[340px] mx-auto">
                {cameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleSwitchCamera(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${c.id.substring(0, 4)}`}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    torchOn
                      ? "bg-amber-500 text-white border-amber-600"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  <span>💡 {torchOn ? "Tắt đèn" : "Bật đèn Flash"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MÁY QUÉT MÃ / NHẬP TAY */}
          {!isLoadingPackage && !scannedPackage && !notFoundCode && activeTab === "gun" && (
            <div className="space-y-4 max-w-md mx-auto py-6">
              <div className="text-center space-y-1">
                <div className="text-3xl">🔫</div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                  Chế độ Máy quét mã vạch / Bàn phím
                </h3>
                <p className="text-zinc-500 text-xs">
                  Cắm súng quét mã vạch USB/Bluetooth và bắn trực tiếp vào tem QR, hoặc nhập mã kiện và ấn Enter
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  lookupPackage(manualCode);
                }}
                className="space-y-3"
              >
                <div>
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Mã kiện hàng (VD: PKG-20261019-1234)..."
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-emerald-500/80 rounded-2xl font-mono text-center text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all"
                >
                  Tra cứu kiện hàng ngay
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: TẢI FILE ẢNH MÃ QR */}
          {!isLoadingPackage && !scannedPackage && !notFoundCode && activeTab === "image" && (
            <div className="space-y-4 max-w-md mx-auto py-8 text-center">
              <div className="p-8 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
                <div className="text-4xl">📸</div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                  Tải ảnh chứa mã QR
                </h3>
                <p className="text-zinc-500 text-xs">
                  Chọn ảnh chụp mã QR trên thùng hàng để hệ thống tự động nhận diện và đọc mã
                </p>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="package-qr-file-input"
                  />
                  <label
                    htmlFor="package-qr-file-input"
                    className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-md transition-all"
                  >
                    Chọn tệp hình ảnh
                  </label>
                </div>
              </div>
              <div id="html5-file-reader-package" className="hidden" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useToast } from "@/context/ToastContext";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

// Hàm phát tiếng beep thông báo quét thành công
function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 Note
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch {}
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: BarcodeScannerModalProps) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"camera" | "gun" | "image">("camera");
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Khởi động Camera khi mở Modal
  useEffect(() => {
    if (!isOpen || activeTab !== "camera") {
      stopCamera();
      return;
    }

    let isMounted = true;
    const scannerElementId = "html5-barcode-scanner";

    const startScanner = async () => {
      setCameraError(null);
      try {
        // Lấy danh sách camera
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

        // Khởi tạo instance
        const qrScanner = new Html5Qrcode(scannerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
          verbose: false,
        });
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.333,
        };

        await qrScanner.start(
          chosenId,
          config,
          (decodedText) => {
            // Callback quét thành công
            playBeep();
            toast.success(`Đã quét mã: ${decodedText}`);
            stopCamera();
            onScanSuccess(decodedText.trim());
          },
          () => {
            // Frame không nhận diện được mã -> bỏ qua
          }
        );

        if (isMounted) setIsScanning(true);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Camera scanner error:", err);
        setCameraError(
          err.message ||
            "Không thể truy cập camera. Vui lòng cấp quyền truy cập camera trong trình duyệt hoặc sử dụng chế độ Nhập mã / Máy quét cầm tay."
        );
      }
    };

    const timeout = setTimeout(startScanner, 200);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  // Tự động focus input ở Tab Máy quét cầm tay
  useEffect(() => {
    if (isOpen && activeTab === "gun" && manualInputRef.current) {
      manualInputRef.current.focus();
    }
  }, [isOpen, activeTab]);

  // Quét từ tệp ảnh tải lên
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("html5-file-reader");
      const decodedText = await html5QrCode.scanFile(file, true);
      playBeep();
      toast.success(`Đã quét mã từ ảnh: ${decodedText}`);
      onScanSuccess(decodedText.trim());
    } catch {
      toast.error("Không tìm thấy mã vạch hoặc mã QR hợp lệ trong ảnh này");
    }
  };

  // Xử lý gửi mã thủ công hoặc từ máy quét cầm tay
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) {
      toast.warning("Vui lòng nhập hoặc quét mã SKU / Barcode");
      return;
    }
    playBeep();
    onScanSuccess(clean);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              📷
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base">
                Quét Mã Barcode / QR Tồn Kho
              </h2>
              <p className="text-[11px] text-zinc-500">
                Nhận diện ngay mã sản phẩm và tra cứu số lượng tồn kho khả dụng tức thì
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-4 pt-2 bg-zinc-50/30 dark:bg-zinc-800/20 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("camera")}
            className={`py-2 px-3.5 font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "camera"
                ? "border-amber-600 text-amber-600 dark:text-amber-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <span>📹</span>
            <span>Camera Trực Tiếp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gun")}
            className={`py-2 px-3.5 font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "gun"
                ? "border-amber-600 text-amber-600 dark:text-amber-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <span>🔫</span>
            <span>Máy Quét / Nhập SKU</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("image")}
            className={`py-2 px-3.5 font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "image"
                ? "border-amber-600 text-amber-600 dark:text-amber-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <span>🖼️</span>
            <span>Tải Ảnh Mã</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* 1. Camera Tab */}
          {activeTab === "camera" && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Không thể khởi động Camera</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{cameraError}</p>
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("gun")}
                      className="py-1.5 px-3 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700"
                    >
                      Dùng Chế độ Máy quét / Nhập tay
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border border-zinc-800">
                  {/* HTML5 QR Container */}
                  <div id="html5-barcode-scanner" className="w-full h-full" />

                  {/* Scanning Laser Line Overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                      <div className="relative w-64 h-40 border-2 border-emerald-400/80 rounded-xl shadow-lg">
                        {/* 4 Góc ngắm */}
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                        {/* Tia Laser đỏ quét lên xuống */}
                        <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse absolute top-1/2 -translate-y-1/2" />
                      </div>
                      <span className="text-[11px] text-white/80 bg-black/50 px-2.5 py-1 rounded-full mt-3 font-medium backdrop-blur-xs">
                        Đưa mã vạch Barcode hoặc QR Code vào khung ngắm
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Camera Selector */}
              {cameras.length > 1 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Đổi camera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="py-1 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs focus:outline-hidden"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${c.id.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 2. Gun / Manual Tab */}
          {activeTab === "gun" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-2">
                <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <span>🔫</span>
                  <span>Hỗ trợ Máy quét mã vạch cầm tay (USB / Bluetooth)</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Bấm cò máy quét trực tiếp vào tem nhãn sản phẩm, mã SKU sẽ tự động được điền và tra cứu số lượng tồn tức thì. Hoặc bạn có thể tự nhập tay mã SKU bên dưới.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Nhập mã SKU hoặc Mã vạch sản phẩm:
                  </label>
                  <div className="relative">
                    <input
                      ref={manualInputRef}
                      type="text"
                      required
                      placeholder="Ví dụ: 107, SKU-337020111 hoặc quét bằng máy..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-mono font-bold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                    {manualCode && (
                      <button
                        type="button"
                        onClick={() => setManualCode("")}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🔍</span>
                  <span>Tra Cứu Tồn Kho Ngay</span>
                </button>
              </form>
            </div>
          )}

          {/* 3. Image Tab */}
          {activeTab === "image" && (
            <div className="space-y-4 text-center py-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl p-8 cursor-pointer transition-colors space-y-2 bg-zinc-50/50 dark:bg-zinc-800/20"
              >
                <div className="text-3xl">🖼️</div>
                <div className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                  Chọn ảnh chụp tem mã vạch hoặc mã QR
                </div>
                <div className="text-[11px] text-zinc-500">
                  Hỗ trợ định dạng JPG, PNG, WEBP từ thiết bị hoặc ảnh chụp màn hình
                </div>
              </div>

              {/* Dummy element for file scan */}
              <div id="html5-file-reader" className="hidden" />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="py-2 px-4 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

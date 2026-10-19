"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { useToast } from "@/context/ToastContext";
import { Package, PackageStatus } from "@/types";

interface PackageDetailModalProps {
  packageData: Package | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (pkg: Package) => void;
  onPrint: (pkg: Package) => void;
  onPackageUpdated: (updated: Package) => void;
  onPackageDeleted: (id: string) => void;
}

export function PackageDetailModal({
  packageData,
  isOpen,
  onClose,
  onEdit,
  onPrint,
  onPackageUpdated,
  onPackageDeleted,
}: PackageDetailModalProps) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Generate QR code
  useEffect(() => {
    if (!isOpen || !packageData) return;

    QRCode.toDataURL(packageData.code, {
      margin: 1,
      width: 200,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Lỗi tạo QR:", err));
  }, [isOpen, packageData]);

  if (!isOpen || !packageData) return null;

  // Handle status update
  const handleUpdateStatus = async (status: PackageStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/packages/${packageData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        toast.success(`Đã cập nhật trạng thái sang: ${status}`);
        onPackageUpdated(json.data);
      } else {
        toast.error(json.message || "Không thể cập nhật trạng thái");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối khi cập nhật trạng thái");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle delete package
  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa kiện hàng "${packageData.code}" không?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/packages/${packageData.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Đã xóa kiện hàng thành công");
        onPackageDeleted(packageData.id);
        onClose();
      } else {
        toast.error(json.message || "Không thể xóa kiện hàng");
      }
    } catch (err) {
      toast.error("Lỗi kết nối khi xóa kiện hàng");
    } finally {
      setIsDeleting(false);
    }
  };

  const statusBadge = {
    draft: { label: "Bản nháp", class: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300" },
    packed: { label: "Đã đóng gói", class: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200" },
    in_transit: { label: "Đang vận chuyển", class: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200" },
    delivered: { label: "Đã giao / Hoàn thành", class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200" },
    cancelled: { label: "Đã hủy", class: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200" },
  }[packageData.status] || { label: packageData.status, class: "bg-zinc-100 text-zinc-800" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
              📦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-zinc-900 dark:text-white text-base sm:text-lg">
                  Chi Tiết Kiện Hàng
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge.class}`}>
                  {statusBadge.label}
                </span>
              </div>
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                Mã: {packageData.code} • ID: {packageData.id}
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

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 text-xs">
          {/* Card thông tin cơ bản & QR Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-3">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Tên / Mô tả kiện hàng</span>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                    {packageData.title}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Loại kiện:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{packageData.package_type}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Điểm đến:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{packageData.destination || "--"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Vị trí kho / Kệ:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{packageData.warehouse_location || "--"}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Khối lượng:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {packageData.weight_kg ? `${packageData.weight_kg} kg` : "--"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Kích thước (DxRxC):</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {packageData.dimensions?.length || packageData.dimensions?.width || packageData.dimensions?.height
                        ? `${packageData.dimensions.length || 0} x ${packageData.dimensions.width || 0} x ${packageData.dimensions.height || 0} cm`
                        : "--"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Người tạo:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{packageData.created_by?.name || "Hệ thống"}</strong>
                  </div>
                </div>

                {packageData.notes && (
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Ghi chú:</span>
                    <p className="text-zinc-700 dark:text-zinc-300 italic">{packageData.notes}</p>
                  </div>
                )}
              </div>

              {/* Lịch sử trạng thái */}
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                <span>Tạo: {new Date(packageData.createdAt).toLocaleString("vi-VN")}</span>
                {packageData.packed_at && (
                  <span>• Đóng gói: {new Date(packageData.packed_at).toLocaleString("vi-VN")}</span>
                )}
                {packageData.shipped_at && (
                  <span>• Xuất vận: {new Date(packageData.shipped_at).toLocaleString("vi-VN")}</span>
                )}
                {packageData.delivered_at && (
                  <span>• Đã giao: {new Date(packageData.delivered_at).toLocaleString("vi-VN")}</span>
                )}
              </div>
            </div>

            {/* QR Code card */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Mã QR Định Danh</span>
              <div className="bg-white p-2.5 rounded-xl border border-zinc-200 shadow-xs">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={packageData.code} className="w-36 h-36 object-contain" />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center bg-zinc-100 font-mono text-[10px]">
                    Đang tạo...
                  </div>
                )}
              </div>
              <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                {packageData.code}
              </span>
              <button
                type="button"
                onClick={() => onPrint(packageData)}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>🖨️ In Tem QR Kiện</span>
              </button>
            </div>
          </div>

          {/* Danh sách sản phẩm trong kiện */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 flex-1">
                <span>Danh mục sản phẩm ({packageData.items.length} mặt hàng)</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              </h3>
              <div className="flex items-center gap-3 font-semibold text-xs">
                <span>Tổng: <strong className="text-indigo-600 dark:text-indigo-400">{packageData.total_items}</strong> sản phẩm</span>
                {packageData.total_value ? (
                  <span>• Trị giá: <strong className="text-emerald-600 dark:text-emerald-400">₫{packageData.total_value.toLocaleString("vi-VN")}</strong></span>
                ) : null}
              </div>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-[11px] font-semibold text-zinc-500">
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Sản phẩm</th>
                    <th className="py-2.5 px-3">Mã SKU</th>
                    <th className="py-2.5 px-3 text-right">Số lượng</th>
                    <th className="py-2.5 px-3 text-right">Đơn giá</th>
                    <th className="py-2.5 px-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {packageData.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-3 text-zinc-400 font-mono w-10">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {it.image ? (
                            <img
                              src={it.image}
                              alt={it.product_name}
                              className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-800"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm shrink-0">
                              📦
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                              {it.product_name}
                            </p>
                            {it.variation_name && (
                              <span className="text-[10px] text-zinc-500 block">
                                Phân loại: {it.variation_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                        {it.sku || "--"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {it.quantity} {it.unit || "Cái"}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-600 dark:text-zinc-400">
                        {it.unit_price ? `₫${it.unit_price.toLocaleString("vi-VN")}` : "--"}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                        {it.unit_price ? `₫${(it.quantity * it.unit_price).toLocaleString("vi-VN")}` : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chuyển đổi trạng thái nhanh */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block">
              Cập nhật trạng thái kiện hàng:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isUpdatingStatus || packageData.status === "draft"}
                onClick={() => handleUpdateStatus("draft")}
                className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-colors ${
                  packageData.status === "draft"
                    ? "bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 font-bold"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                }`}
              >
                Bản nháp
              </button>

              <button
                type="button"
                disabled={isUpdatingStatus || packageData.status === "packed"}
                onClick={() => handleUpdateStatus("packed")}
                className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-colors ${
                  packageData.status === "packed"
                    ? "bg-amber-600 text-white font-bold"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                }`}
              >
                📦 Đã đóng gói
              </button>

              <button
                type="button"
                disabled={isUpdatingStatus || packageData.status === "in_transit"}
                onClick={() => handleUpdateStatus("in_transit")}
                className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-colors ${
                  packageData.status === "in_transit"
                    ? "bg-blue-600 text-white font-bold"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                }`}
              >
                🚚 Đang vận chuyển
              </button>

              <button
                type="button"
                disabled={isUpdatingStatus || packageData.status === "delivered"}
                onClick={() => handleUpdateStatus("delivered")}
                className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-colors ${
                  packageData.status === "delivered"
                    ? "bg-emerald-600 text-white font-bold"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                }`}
              >
                ✅ Đã giao / Hoàn thành
              </button>

              <button
                type="button"
                disabled={isUpdatingStatus || packageData.status === "cancelled"}
                onClick={() => handleUpdateStatus("cancelled")}
                className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-colors ${
                  packageData.status === "cancelled"
                    ? "bg-rose-600 text-white font-bold"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
              >
                ❌ Đã hủy
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 font-semibold text-xs transition-colors"
          >
            {isDeleting ? "Đang xóa..." : "🗑️ Xóa kiện"}
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(packageData);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all"
            >
              ✏️ Chỉnh sửa kiện
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Spinner } from "@/components/ui/Loading";
import { useToast } from "@/context/ToastContext";
import {
  ProductCatalogPicker,
  ProductCatalogItem,
  ProductVariationOption,
} from "./ProductCatalogPicker";

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Array<{ id: number; name: string; code: string }>;
  onOrderCreated: () => void;
}

interface NewLineItem {
  product_id?: number | string;
  variant_id?: number | string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  current_stock?: number;
  image?: string;
}

export function CreatePurchaseOrderModal({
  isOpen,
  onClose,
  suppliers,
  onOrderCreated,
}: CreatePurchaseOrderModalProps) {
  const { toast } = useToast();

  const [selectedSupplierId, setSelectedSupplierId] = useState<number | string>(
    suppliers[0]?.id || ""
  );
  const [customSupplierName, setCustomSupplierName] = useState("");
  const [isCustomSupplier, setIsCustomSupplier] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<"paid" | "pending" | "partially">(
    "pending"
  );
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState("");
  const [syncInventory, setSyncInventory] = useState(true);

  const [lineItems, setLineItems] = useState<NewLineItem[]>([
    { name: "", sku: "", quantity: 50, price: 10000 },
  ]);

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setLineItems((prev) => [
      ...prev,
      { name: "", sku: "", quantity: 20, price: 15000 },
    ]);
  };

  const handleSelectCatalogProduct = (
    prod: ProductCatalogItem,
    variant?: ProductVariationOption
  ) => {
    const varModelId = variant ? variant.model_id : (prod.all_variations?.[0]?.model_id || prod.product_id);
    const itemName = variant && variant.name && variant.name !== "Default Title"
      ? `${prod.product_name} - ${variant.name}`
      : prod.product_name;
    const itemSku = variant ? variant.sku : prod.sku;
    const itemPrice = variant?.price || prod.price || 0;
    const itemStock = variant ? variant.stock : prod.stock;

    const existingIndex = lineItems.findIndex(
      (li) => (li.variant_id && String(li.variant_id) === String(varModelId)) || (li.sku && li.sku === itemSku)
    );

    if (existingIndex >= 0) {
      setLineItems((prev) => {
        const clone = [...prev];
        const newQty = (Number(clone[existingIndex].quantity) || 0) + 1;
        clone[existingIndex] = { ...clone[existingIndex], quantity: newQty };
        return clone;
      });
      toast.info(`Đã tăng số lượng "${itemName}" thêm +1`);
    } else {
      setLineItems((prev) => {
        if (prev.length === 1 && !prev[0].name.trim() && !prev[0].sku.trim()) {
          return [
            {
              product_id: prod.product_id,
              variant_id: varModelId,
              name: itemName,
              sku: itemSku,
              quantity: 1,
              price: itemPrice,
              current_stock: itemStock,
              image: variant?.image || prod.image,
            },
          ];
        }
        return [
          ...prev,
          {
            product_id: prod.product_id,
            variant_id: varModelId,
            name: itemName,
            sku: itemSku,
            quantity: 1,
            price: itemPrice,
            current_stock: itemStock,
            image: variant?.image || prod.image,
          },
        ];
      });
      toast.success(`Đã thêm "${itemName}" vào đơn nhập`);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof NewLineItem, value: any) => {
    setLineItems((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  };

  const totalCalculated = lineItems.reduce((acc, it) => {
    return acc + Number(it.quantity || 0) * Number(it.price || 0);
  }, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let supplierName = "";
    let supplierId = 0;
    let supplierCode = "";

    if (isCustomSupplier) {
      if (!customSupplierName.trim()) {
        toast.error("Vui lòng nhập tên nhà cung cấp");
        return;
      }
      supplierName = customSupplierName.trim();
    } else {
      const found = suppliers.find((s) => String(s.id) === String(selectedSupplierId));
      if (!found) {
        toast.error("Vui lòng chọn nhà cung cấp");
        return;
      }
      supplierName = found.name;
      supplierId = found.id;
      supplierCode = found.code;
    }

    // Kiểm tra các dòng sản phẩm
    const validItems = lineItems.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) {
      toast.error("Vui lòng nhập tên cho ít nhất 1 sản phẩm");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          supplier_name: supplierName,
          supplier_code: supplierCode,
          transaction_status: transactionStatus,
          received_on: `${receivedDate}T09:00:00Z`,
          note,
          sync_inventory: syncInventory,
          line_items: validItems,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tạo đơn nhập hàng");
      }

      toast.success(json.message || "Tạo đơn nhập hàng thành công!");
      onOrderCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo đơn nhập hàng");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-lg shadow-2xs">
              📝
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Tạo Đơn Nhập Hàng / Mua Hàng
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Ghi nhận chi phí mua sắm vật tư, hàng hóa từ nhà cung cấp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Form Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* Hàng 1: Nhà cung cấp & Ngày nhập */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Nhà cung cấp <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomSupplier(!isCustomSupplier)}
                    className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {isCustomSupplier ? "Chọn NCC có sẵn" : "Nhập NCC mới"}
                  </button>
                </div>

                {isCustomSupplier ? (
                  <input
                    type="text"
                    required
                    placeholder="VD: Công ty TNHH Bao Bì Hà Nội"
                    value={customSupplierName}
                    onChange={(e) => setCustomSupplierName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
                  />
                ) : (
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Ngày nhập hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
                />
              </div>
            </div>

            {/* Hàng 2: Trạng thái thanh toán & Ghi chú */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Trạng thái thanh toán
                </label>
                <select
                  value={transactionStatus}
                  onChange={(e) => setTransactionStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
                >
                  <option value="pending">Chưa thanh toán (Ghi nhận công nợ)</option>
                  <option value="paid">Đã thanh toán đủ ngay khi nhập</option>
                  <option value="partially">Đã thanh toán một phần</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Ghi chú đơn nhập
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú thêm về lô hàng, số hóa đơn..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
                />
              </div>
            </div>

            {/* Hàng 3: Danh sách sản phẩm nhập */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    Mặt hàng nhập ({lineItems.length})
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {lineItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0).toLocaleString("vi-VN")} cái
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                  <span className="text-sm font-bold text-blue-600">+</span>
                  <span>Thêm dòng thủ công</span>
                </button>
              </div>

              {/* Thanh chọn nhanh sản phẩm có sẵn trong kho Sapo */}
              <ProductCatalogPicker onSelectProduct={handleSelectCatalogProduct} accentColor="blue" />

              {/* Bảng danh sách mặt hàng chuẩn ERP cân đối */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-zinc-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs table-fixed min-w-[720px]">
                    <colgroup>
                      <col style={{ width: "40px" }} />
                      <col style={{ width: "38%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "17%" }} />
                      <col style={{ width: "42px" }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-1 text-center">#</th>
                        <th className="py-2.5 px-3 text-left">
                          Tên sản phẩm <span className="text-rose-500">*</span>
                        </th>
                        <th className="py-2.5 px-2 text-left">Mã SKU</th>
                        <th className="py-2.5 px-2 text-center">Số lượng</th>
                        <th className="py-2.5 px-2 text-right">Đơn giá (₫)</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                        <th className="py-2.5 px-1 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                      {lineItems.map((item, idx) => {
                        const lineTotal = Number(item.quantity || 0) * Number(item.price || 0);
                        return (
                          <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="py-3 px-1 text-center align-top">
                              <div className="h-8 flex items-center justify-center font-mono text-zinc-400 text-xs font-semibold">
                                {idx + 1}
                              </div>
                              <div className="h-4"></div>
                            </td>
                            <td className="py-3 px-3 align-top">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt=""
                                      className="w-8 h-8 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs shrink-0 border border-zinc-200 dark:border-zinc-700">
                                      📦
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    required
                                    placeholder="Nhập tên sản phẩm..."
                                    value={item.name}
                                    onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                                    className="flex-1 min-w-0 w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                  />
                                </div>

                                {item.product_id ? (
                                  <div className="flex items-center gap-2 pl-10 text-[10.5px]">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      Kho: <strong>{item.current_stock ?? 0}</strong> cái
                                    </span>
                                    {item.variant_id && (
                                      <span className="text-zinc-400 font-mono text-[10px]">
                                        ID: {item.variant_id}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleItemChange(idx, "product_id", undefined);
                                        handleItemChange(idx, "variant_id", undefined);
                                        handleItemChange(idx, "current_stock", undefined);
                                        handleItemChange(idx, "image", undefined);
                                      }}
                                      className="text-zinc-400 hover:text-rose-500 text-[10px] cursor-pointer ml-auto"
                                      title="Hủy liên kết với sản phẩm kho"
                                    >
                                      ✕ Gỡ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-zinc-400 italic pl-10">
                                    Mặt hàng tự do (chưa liên kết kho)
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 align-top">
                              <input
                                type="text"
                                placeholder="Mã SKU..."
                                value={item.sku}
                                onChange={(e) => handleItemChange(idx, "sku", e.target.value)}
                                className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                              />
                              <div className="text-[10px] text-zinc-400 font-mono mt-1 px-0.5 truncate">
                                {item.variant_id ? "SKU Sapo" : "Mã định danh"}
                              </div>
                            </td>
                            <td className="py-3 px-2 align-top">
                              <input
                                type="number"
                                min="1"
                                required
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(idx, "quantity", parseInt(e.target.value, 10) || 1)
                                }
                                className="w-full h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono font-bold text-center text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                              />
                              {item.current_stock !== undefined ? (
                                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono text-center mt-1 font-semibold whitespace-nowrap">
                                  Sau: {(Number(item.current_stock) || 0) + (Number(item.quantity) || 0)} cái
                                </div>
                              ) : (
                                <div className="text-[10px] text-zinc-400 text-center mt-1">Đơn vị: cái</div>
                              )}
                            </td>
                            <td className="py-3 px-2 align-top">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                required
                                value={item.price}
                                onChange={(e) =>
                                  handleItemChange(idx, "price", parseInt(e.target.value, 10) || 0)
                                }
                                className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono text-right text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                              />
                              <div className="text-[10px] text-zinc-400 text-right mt-1 font-mono pr-0.5">
                                ₫ / cái
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top">
                              <div className="h-8 flex items-center justify-end font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm whitespace-nowrap">
                                {formatCurrency(lineTotal)}
                              </div>
                              <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 text-right mt-1 font-mono pr-0.5">
                                Thành tiền
                              </div>
                            </td>
                            <td className="py-3 px-1 text-center align-top">
                              <div className="h-8 flex items-center justify-center">
                                <button
                                  type="button"
                                  disabled={lineItems.length === 1}
                                  onClick={() => handleRemoveItem(idx)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
                                    lineItems.length === 1
                                      ? "opacity-20 cursor-not-allowed text-zinc-300 dark:text-zinc-600"
                                      : "text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                  }`}
                                  title={lineItems.length === 1 ? "Đơn hàng phải có ít nhất 1 mặt hàng" : "Xóa mặt hàng này"}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              <div className="h-4"></div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 font-semibold">
                        <td></td>
                        <td colSpan={2} className="py-3 px-3 text-right text-zinc-500 dark:text-zinc-400 text-xs">
                          Tổng cộng ({lineItems.length} mặt hàng):
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                          {lineItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0).toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-2 text-right text-zinc-400 text-[10px] font-mono">
                          {/* Cột đơn giá */}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(totalCalculated)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Sapo Sync Toggle Card */}
              <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-indigo-50/60 dark:from-blue-950/40 dark:via-blue-950/20 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-between gap-3 shadow-2xs">
                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={syncInventory}
                    onChange={(e) => setSyncInventory(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span className="text-amber-500">⚡</span>
                        <span>Tự động cộng tồn kho vào hệ thống & đồng bộ lên Sapo</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                        Khuyên dùng
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                      {lineItems.some((it) => it.product_id || it.variant_id)
                        ? "Chỉ tự động tăng tồn kho & đồng bộ Sapo với các sản phẩm được chọn từ kho. Mặt hàng tự do sẽ không làm thay đổi tồn kho."
                        : "Chỉ đồng bộ khi có chọn sản phẩm từ kho. Các mặt hàng nhập tay tự do sẽ không đồng bộ vào Sapo và không thay đổi tồn kho."}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer with Total and Submit */}
          <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
            <div className="flex flex-col">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Tổng dự kiến chi phí đơn:
              </span>
              <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
                {formatCurrency(totalCalculated)}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Tạo đơn nhập</span>
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

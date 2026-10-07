"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AttributeItem {
  id: string;
  name: string;
  values: string[];
  inputValue: string;
}

interface VariantItem {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock: number;
  option1?: string;
  option2?: string;
  option3?: string;
}

const QUICK_ATTR_SUGGESTIONS = [
  "Kích thước",
  "Màu sắc",
  "Dung tích",
  "Hương vị",
  "Quy cách",
];

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProductModalProps) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<string>("0");
  const [stock, setStock] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [imageInputType, setImageInputType] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  // Thuộc tính & Biến thể (Sapo Options & Variants)
  const [enableAttributes, setEnableAttributes] = useState(false);
  const [attributes, setAttributes] = useState<AttributeItem[]>([
    { id: "attr_1", name: "Kích thước", values: [], inputValue: "" },
  ]);
  const [variants, setVariants] = useState<VariantItem[]>([]);

  // Tự sinh mã SKU gốc
  const handleGenerateSku = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    setSku(`YS-${randomCode}`);
  };

  // Xử lý tệp hình ảnh
  const handleFileChange = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh (PNG, JPG, WEBP, GIF)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh tối đa 5MB");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImage("");
    setFileName("");
    setUrlInput("");
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    if (!urlInput.trim().startsWith("http://") && !urlInput.trim().startsWith("https://")) {
      toast.error("Vui lòng nhập đường dẫn URL hợp lệ (bắt đầu bằng http:// hoặc https://)");
      return;
    }
    setImage(urlInput.trim());
    setFileName("");
  };

  // Thêm thuộc tính mới (tối đa 3 theo chuẩn Sapo)
  const handleAddAttribute = () => {
    if (attributes.length >= 3) {
      toast.error("Sapo hỗ trợ tối đa 3 thuộc tính phân loại");
      return;
    }
    const newId = `attr_${Date.now()}`;
    const nextName = attributes.length === 1 ? "Màu sắc" : "Dung tích";
    setAttributes((prev) => [...prev, { id: newId, name: nextName, values: [], inputValue: "" }]);
  };

  const handleRemoveAttribute = (id: string) => {
    setAttributes((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateAttrName = (id: string, newName: string) => {
    setAttributes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, name: newName } : a))
    );
  };

  // Thêm giá trị cho thuộc tính (khi bấm Enter hoặc dấu phẩy)
  const handleAddValue = (attrId: string) => {
    setAttributes((prev) =>
      prev.map((attr) => {
        if (attr.id !== attrId) return attr;
        const val = attr.inputValue.trim();
        if (!val) return attr;
        if (attr.values.includes(val)) {
          return { ...attr, inputValue: "" };
        }
        return {
          ...attr,
          values: [...attr.values, val],
          inputValue: "",
        };
      })
    );
  };

  const handleRemoveValue = (attrId: string, valToRemove: string) => {
    setAttributes((prev) =>
      prev.map((attr) => {
        if (attr.id !== attrId) return attr;
        return {
          ...attr,
          values: attr.values.filter((v) => v !== valToRemove),
        };
      })
    );
  };

  // Tự động sinh tổ hợp biến thể (Cartesian product) khi thuộc tính thay đổi
  useEffect(() => {
    if (!enableAttributes) {
      setVariants([]);
      return;
    }

    const validAttrs = attributes.filter((a) => a.name.trim() && a.values.length > 0);
    if (validAttrs.length === 0) {
      setVariants([]);
      return;
    }

    const combos = validAttrs.reduce<
      Array<{ name: string; option1?: string; option2?: string; option3?: string }>
    >((acc, attr, idx) => {
      const optKey = `option${idx + 1}` as "option1" | "option2" | "option3";
      if (acc.length === 0) {
        return attr.values.map((v) => ({ name: v, [optKey]: v }));
      }
      const next: Array<{ name: string; option1?: string; option2?: string; option3?: string }> = [];
      for (const prev of acc) {
        for (const v of attr.values) {
          next.push({
            ...prev,
            [optKey]: v,
            name: `${prev.name} / ${v}`,
          });
        }
      }
      return next;
    }, []);

    const baseSkuClean = (sku.trim() || "YS").toUpperCase();
    const numPrice = Number(price.replace(/[^0-9]/g, "")) || 0;
    const numStock = Math.max(0, Number(stock) || 0);

    setVariants((prevVariants) => {
      return combos.map((combo, idx) => {
        const existing = prevVariants.find(
          (pv) =>
            pv.option1 === combo.option1 &&
            pv.option2 === combo.option2 &&
            pv.option3 === combo.option3
        );

        if (existing) {
          return existing;
        }

        const suffix = slugify(combo.name);
        return {
          id: `var_${idx}_${Date.now()}`,
          name: combo.name,
          sku: `${baseSkuClean}-${suffix}`,
          price: numPrice > 0 ? numPrice.toLocaleString("vi-VN") : "0",
          stock: numStock > 0 ? numStock : 0,
          option1: combo.option1,
          option2: combo.option2,
          option3: combo.option3,
        };
      });
    });
  }, [enableAttributes, attributes, sku]);

  // Cập nhật giá & tồn nhanh cho tất cả biến thể
  const handleApplyGlobalPrice = () => {
    const numPrice = Number(price.replace(/[^0-9]/g, "")) || 0;
    const formatted = numPrice > 0 ? numPrice.toLocaleString("vi-VN") : "0";
    setVariants((prev) => prev.map((v) => ({ ...v, price: formatted })));
    toast.success(`Đã áp dụng đơn giá ${formatted}₫ cho tất cả biến thể`);
  };

  const handleApplyGlobalStock = () => {
    const numStock = Math.max(0, Number(stock) || 0);
    setVariants((prev) => prev.map((v) => ({ ...v, stock: numStock })));
    toast.success(`Đã áp dụng số lượng tồn ${numStock} cho tất cả biến thể`);
  };

  // Tính tổng số lượng tồn kho của các biến thể
  const totalVariantStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Vui lòng nhập tên hàng hóa");
      return;
    }

    setLoading(true);
    try {
      const numPrice = Number(price.replace(/[^0-9]/g, "")) || 0;
      const numStock = Math.max(0, Number(stock) || 0);

      const hasValidAttributes =
        enableAttributes &&
        attributes.some((a) => a.name.trim() && a.values.length > 0) &&
        variants.length > 0;

      const payload: any = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        price: numPrice,
        stock: hasValidAttributes ? totalVariantStock : numStock,
        description: description.trim(),
        branch: "Kho Tổng Yến Sen",
        image: image.trim() || undefined,
      };

      if (hasValidAttributes) {
        payload.options = attributes
          .filter((a) => a.name.trim() && a.values.length > 0)
          .map((a, idx) => ({
            name: a.name.trim(),
            values: a.values,
            position: idx + 1,
          }));

        payload.variants = variants.map((v) => ({
          name: v.name,
          sku: v.sku.trim(),
          price: Number(v.price.replace(/[^0-9]/g, "")) || 0,
          stock: Math.max(0, Number(v.stock) || 0),
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
        }));
      }

      const res = await fetch("/api/sapo/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tạo hàng hóa mới lên Sapo");
      }

      toast.success(
        `Đã tạo mã hàng mới ${json.data?.parent_sku || sku} ${
          hasValidAttributes ? `(${variants.length} phân loại)` : ""
        } lên Sapo thành công!`
      );

      // Reset form
      setName("");
      setSku("");
      setPrice("0");
      setStock(0);
      setDescription("");
      setImage("");
      setUrlInput("");
      setFileName("");
      setEnableAttributes(false);
      setAttributes([{ id: "attr_1", name: "Kích thước", values: [], inputValue: "" }]);
      setVariants([]);

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo hàng hóa");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50/60 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              ➕
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base">
                Nhập Hàng / Thêm SKU Mới Vào Kho
              </h2>
              <div className="text-[11px] text-zinc-500">
                Tạo sản phẩm, thuộc tính phân loại & đồng bộ số lượng tồn trực tiếp lên Sapo
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Tên hàng hóa */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Tên hàng hóa / sản phẩm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Yến Chưng Đông Trùng Hạ Thảo..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Mã SKU & Tự sinh SKU */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Mã SKU hàng hóa gốc:
              </label>
              <button
                type="button"
                onClick={handleGenerateSku}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>🎲</span>
                <span>Tự sinh mã SKU</span>
              </button>
            </div>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="VD: YS-DONGTRUNG (để trống hệ thống sẽ tự sinh)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Hình ảnh sản phẩm */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Hình ảnh sản phẩm (tùy chọn):
              </label>
              {!image && (
                <div className="inline-flex rounded-lg p-0.5 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium">
                  <button
                    type="button"
                    onClick={() => setImageInputType("file")}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      imageInputType === "file"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    Tải từ máy
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputType("url")}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      imageInputType === "url"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    Dán URL ảnh
                  </button>
                </div>
              )}
            </div>

            {image ? (
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40">
                <img
                  src={image}
                  alt="Ảnh xem trước"
                  className="w-14 h-14 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 bg-white dark:bg-zinc-800"
                  onError={() => {
                    toast.error("Không thể tải ảnh từ đường dẫn này");
                    handleClearImage();
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate text-[11px]">
                    {fileName || (image.length > 50 ? `${image.slice(0, 45)}...` : image)}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    ✓ Đã đính kèm ảnh thành công
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition shrink-0 cursor-pointer"
                >
                  ✕ Xóa ảnh
                </button>
              </div>
            ) : imageInputType === "file" ? (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed cursor-pointer transition text-center ${
                  isDragging
                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                    : "border-zinc-300 dark:border-zinc-700 hover:border-amber-400 dark:hover:border-amber-500 bg-zinc-50/40 dark:bg-zinc-800/30"
                }`}
              >
                <div className="text-xl mb-1">📷</div>
                <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold underline">
                    Nhấp để chọn ảnh
                  </span>{" "}
                  hoặc kéo thả vào đây
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Hỗ trợ PNG, JPG, WEBP, GIF (Tối đa 5MB)
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
              </label>
            ) : (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyUrl();
                    }
                  }}
                  placeholder="Dán link ảnh (VD: https://example.com/san-pham.jpg)..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MỤC THUỘC TÍNH (SAPO ATTRIBUTES & OPTIONS)                */}
          {/* ======================================================== */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🏷️</span>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-xs">
                    Thuộc tính sản phẩm
                  </h3>
                  <p className="text-[10px] text-zinc-500">
                    Phân loại hàng hóa theo Kích thước, Màu sắc, Dung tích... (Đồng bộ chuẩn Sapo)
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAttributes}
                  onChange={(e) => setEnableAttributes(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {enableAttributes && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/60 space-y-3 animate-in fade-in duration-200">
                {/* Danh sách các thuộc tính */}
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 px-1">
                    <div className="col-span-4">Tên thuộc tính</div>
                    <div className="col-span-7">Giá trị (nhập ký tự và ấn enter)</div>
                    <div className="col-span-1 text-center">Xóa</div>
                  </div>

                  {attributes.map((attr, idx) => (
                    <div
                      key={attr.id}
                      className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 space-y-2"
                    >
                      <div className="grid grid-cols-12 gap-2 items-start">
                        {/* Tên thuộc tính */}
                        <div className="col-span-4 space-y-1">
                          <input
                            type="text"
                            value={attr.name}
                            onChange={(e) => handleUpdateAttrName(attr.id, e.target.value)}
                            placeholder="VD: Kích thước..."
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                          />
                          {/* Gợi ý nhanh */}
                          <div className="flex flex-wrap gap-1">
                            {QUICK_ATTR_SUGGESTIONS.map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => handleUpdateAttrName(attr.id, sug)}
                                className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition ${
                                  attr.name === sug
                                    ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold"
                                    : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                }`}
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Giá trị thuộc tính (Tags / Chips) */}
                        <div className="col-span-7 space-y-1">
                          <div className="min-h-[34px] p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex flex-wrap items-center gap-1.5">
                            {attr.values.map((val) => (
                              <span
                                key={val}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40"
                              >
                                <span>{val}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveValue(attr.id, val)}
                                  className="hover:text-rose-600 transition-colors ml-0.5 font-bold cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            ))}

                            <div className="flex-1 min-w-[120px] flex items-center gap-1">
                              <input
                                type="text"
                                value={attr.inputValue}
                                onChange={(e) =>
                                  setAttributes((prev) =>
                                    prev.map((a) =>
                                      a.id === attr.id ? { ...a, inputValue: e.target.value } : a
                                    )
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === ",") {
                                    e.preventDefault();
                                    handleAddValue(attr.id);
                                  } else if (
                                    e.key === "Backspace" &&
                                    !attr.inputValue &&
                                    attr.values.length > 0
                                  ) {
                                    e.preventDefault();
                                    handleRemoveValue(attr.id, attr.values[attr.values.length - 1]);
                                  }
                                }}
                                placeholder={
                                  attr.values.length === 0
                                    ? "Nhập ký tự và ấn enter (VD: 70ml, 100ml)..."
                                    : "Thêm giá trị..."
                                }
                                className="w-full text-xs bg-transparent border-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden px-1"
                              />
                              {attr.inputValue.trim() && (
                                <button
                                  type="button"
                                  onClick={() => handleAddValue(attr.id)}
                                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-600 text-white cursor-pointer"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            Ấn <strong>Enter</strong> hoặc gõ dấu phẩy (<strong>,</strong>) để thêm giá trị
                          </div>
                        </div>

                        {/* Nút xóa thuộc tính */}
                        <div className="col-span-1 flex justify-center pt-1.5">
                          {attributes.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveAttribute(attr.id)}
                              className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Xóa thuộc tính này"
                            >
                              🗑️
                            </button>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-600 text-sm">--</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Thêm thuộc tính khác */}
                {attributes.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddAttribute}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition cursor-pointer"
                  >
                    <span>⊕</span>
                    <span>Thêm thuộc tính khác ({attributes.length}/3)</span>
                  </button>
                )}

                {/* =================================================== */}
                {/* BẢNG BIẾN THỂ TỰ SINH                                */}
                {/* =================================================== */}
                {variants.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="font-bold text-zinc-900 dark:text-white text-xs flex items-center gap-1.5">
                        <span>📦</span>
                        <span>Danh sách biến thể phân loại ({variants.length}):</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleApplyGlobalPrice}
                          className="px-2 py-0.8 text-[10px] font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                          title="Gán đơn giá niêm yết ở trên cho toàn bộ biến thể"
                        >
                          Áp dụng giá chung ({price}₫)
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyGlobalStock}
                          className="px-2 py-0.8 text-[10px] font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                          title="Gán số lượng tồn ở trên cho toàn bộ biến thể"
                        >
                          Áp dụng tồn chung ({stock})
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xs">
                      <table className="w-full text-left text-[11px] divide-y divide-zinc-200 dark:divide-zinc-800">
                        <thead className="bg-zinc-100/70 dark:bg-zinc-800/80 font-semibold text-zinc-700 dark:text-zinc-300 sticky top-0 z-10">
                          <tr>
                            <th className="py-2 px-2.5">Phân loại</th>
                            <th className="py-2 px-2.5">Mã SKU</th>
                            <th className="py-2 px-2.5 w-28">Đơn giá (₫)</th>
                            <th className="py-2 px-2.5 w-20 text-center">Tồn kho</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                          {variants.map((v, vIdx) => (
                            <tr key={v.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                              <td className="py-1.5 px-2.5 font-sans font-semibold text-zinc-800 dark:text-zinc-200">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-[10px]">
                                  {v.name}
                                </span>
                              </td>
                              <td className="py-1.5 px-2.5">
                                <input
                                  type="text"
                                  value={v.sku}
                                  onChange={(e) =>
                                    setVariants((prev) =>
                                      prev.map((item, i) =>
                                        i === vIdx ? { ...item, sku: e.target.value.toUpperCase() } : item
                                      )
                                    )
                                  }
                                  className="w-full px-2 py-1 text-[11px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
                                />
                              </td>
                              <td className="py-1.5 px-2.5">
                                <input
                                  type="text"
                                  value={v.price}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    const num = Number(val) || 0;
                                    setVariants((prev) =>
                                      prev.map((item, i) =>
                                        i === vIdx
                                          ? {
                                              ...item,
                                              price: num > 0 ? num.toLocaleString("vi-VN") : "0",
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  className="w-full px-2 py-1 text-[11px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-right"
                                />
                              </td>
                              <td className="py-1.5 px-2.5 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={v.stock}
                                  onChange={(e) => {
                                    const num = Math.max(0, parseInt(e.target.value) || 0);
                                    setVariants((prev) =>
                                      prev.map((item, i) =>
                                        i === vIdx ? { ...item, stock: num } : item
                                      )
                                    );
                                  }}
                                  className="w-full px-2 py-1 text-[11px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-center"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 px-1 pt-1">
                      <span>
                        Tổng tồn kho:{" "}
                        <strong className="text-amber-600 dark:text-amber-400 font-mono text-xs">
                          {totalVariantStock.toLocaleString("vi-VN")}
                        </strong>{" "}
                        sản phẩm
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {variants.length} phân loại sẽ được đồng bộ lên Sapo
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Đơn giá & Số lượng tồn ban đầu (Đơn giá chung / đơn lẻ) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                {enableAttributes && variants.length > 0
                  ? "Đơn giá niêm yết mặc định (₫):"
                  : "Đơn giá bán niêm yết (₫):"}
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  const num = Number(val) || 0;
                  setPrice(num > 0 ? num.toLocaleString("vi-VN") : "0");
                }}
                placeholder="VD: 150.000"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                {enableAttributes && variants.length > 0
                  ? "Tồn kho mặc định mỗi biến thể:"
                  : "Số lượng tồn ban đầu:"}
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Chi nhánh kho */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Chi nhánh nhập kho:
            </label>
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <span>🏬</span>
              <span className="font-semibold">Kho Tổng Yến Sen (Mặc định)</span>
            </div>
          </div>

          {/* Mô tả / Ghi chú */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Mô tả ngắn / Ghi chú (tùy chọn):
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Hàng lô mới sản xuất tháng này, hạn dùng 12 tháng..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition shadow-sm flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? "⏳" : "➕"}</span>
              <span>
                {loading
                  ? "Đang tạo lên Sapo..."
                  : enableAttributes && variants.length > 0
                  ? `Tạo mới (${variants.length} phân loại) & Đồng bộ Sapo`
                  : "Tạo mới & Đồng bộ Sapo"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

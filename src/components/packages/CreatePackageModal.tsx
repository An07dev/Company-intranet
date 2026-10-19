"use client";

import React, { useState, useEffect, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import { Package, PackageItem } from "@/types";

interface ProductSuggestion {
  product_id: string;
  product_name: string;
  sku: string;
  image: string;
  stock: number;
  price: number;
  price_display: string;
  has_variations: boolean;
  all_variations?: Array<{
    model_id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    image: string;
  }>;
}

interface CreatePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedPackage: Package) => void;
  packageToEdit?: Package | null;
}

export function CreatePackageModal({
  isOpen,
  onClose,
  onSuccess,
  packageToEdit,
}: CreatePackageModalProps) {
  const { toast } = useToast();

  const isEdit = Boolean(packageToEdit);

  // Form states
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [packageType, setPackageType] = useState("Đóng hàng xuất");
  const [destination, setDestination] = useState("");
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [dimLength, setDimLength] = useState<string>("");
  const [dimWidth, setDimWidth] = useState<string>("");
  const [dimHeight, setDimHeight] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "packed" | "in_transit" | "delivered" | "cancelled">("draft");

  // Items in package
  const [items, setItems] = useState<PackageItem[]>([]);

  // Product Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ProductSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<ProductSuggestion | null>(null);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search input ref
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (packageToEdit) {
      setCode(packageToEdit.code);
      setTitle(packageToEdit.title);
      setPackageType(packageToEdit.package_type || "Đóng hàng xuất");
      setDestination(packageToEdit.destination || "");
      setWarehouseLocation(packageToEdit.warehouse_location || "");
      setWeightKg(packageToEdit.weight_kg ? String(packageToEdit.weight_kg) : "");
      setDimLength(packageToEdit.dimensions?.length ? String(packageToEdit.dimensions.length) : "");
      setDimWidth(packageToEdit.dimensions?.width ? String(packageToEdit.dimensions.width) : "");
      setDimHeight(packageToEdit.dimensions?.height ? String(packageToEdit.dimensions.height) : "");
      setNotes(packageToEdit.notes || "");
      setStatus(packageToEdit.status || "draft");
      setItems(packageToEdit.items || []);
    } else {
      // Auto-generate suggested code
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const rand = Math.floor(1000 + Math.random() * 9000);
      setCode(`PKG-${yyyy}${mm}${dd}-${rand}`);
      setTitle("");
      setPackageType("Đóng hàng xuất");
      setDestination("");
      setWarehouseLocation("");
      setWeightKg("");
      setDimLength("");
      setDimWidth("");
      setDimHeight("");
      setNotes("");
      setStatus("draft");
      setItems([]);
    }

    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedProductForVariation(null);
  }, [isOpen, packageToEdit]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Product Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/packages/search-products?q=${encodeURIComponent(searchQuery.trim())}&limit=15`);
        const json = await res.json();
        if (json.success && json.data?.products) {
          setSearchResults(json.data.products);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Lỗi tìm sản phẩm:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle adding a product without variations
  const handleAddDirectProduct = (prod: ProductSuggestion) => {
    const existingIdx = items.findIndex(
      (it) => it.product_id === prod.product_id && !it.model_id
    );

    if (existingIdx >= 0) {
      const newQty = items[existingIdx].quantity + 1;
      setItems((prev) => {
        const updated = [...prev];
        if (updated[existingIdx]) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: newQty,
          };
        }
        return updated;
      });
      toast.info(`Đã tăng số lượng "${prod.product_name}" lên ${newQty}`);
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          product_id: prod.product_id,
          product_name: prod.product_name,
          sku: prod.sku,
          image: prod.image,
          quantity: 1,
          unit_price: prod.price || 0,
          unit: "Cái",
        },
      ]);
      toast.success(`Đã thêm "${prod.product_name}" vào kiện hàng`);
    }

    setSearchQuery("");
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  // Handle adding a variation
  const handleAddVariation = (
    parentProd: ProductSuggestion,
    variation: { model_id: string; name: string; sku: string; price: number; image: string }
  ) => {
    const existingIdx = items.findIndex(
      (it) => it.product_id === parentProd.product_id && it.model_id === variation.model_id
    );

    if (existingIdx >= 0) {
      const newQty = items[existingIdx].quantity + 1;
      setItems((prev) => {
        const updated = [...prev];
        if (updated[existingIdx]) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: newQty,
          };
        }
        return updated;
      });
      toast.info(`Đã tăng số lượng "${parentProd.product_name} - ${variation.name}" lên ${newQty}`);
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          product_id: parentProd.product_id,
          model_id: variation.model_id,
          product_name: parentProd.product_name,
          variation_name: variation.name,
          sku: variation.sku || parentProd.sku,
          image: variation.image || parentProd.image,
          quantity: 1,
          unit_price: variation.price || parentProd.price || 0,
          unit: "Cái",
        },
      ]);
      toast.success(`Đã thêm "${parentProd.product_name} - ${variation.name}" vào kiện hàng`);
    }

    setSelectedProductForVariation(null);
    setSearchQuery("");
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  // Update item quantity
  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  // Update item unit
  const handleUpdateUnit = (index: number, newUnit: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unit: newUnit };
      return updated;
    });
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Calculate live summary
  const totalItemCount = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const totalValue = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (it.unit_price || 0), 0);

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tên hoặc mô tả kiện hàng");
      return;
    }

    if (items.length === 0) {
      toast.error("Kiện hàng phải có ít nhất 1 sản phẩm. Hãy tìm kiếm và thêm sản phẩm bên dưới.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: code.trim(),
        title: title.trim(),
        status,
        package_type: packageType,
        destination: destination.trim(),
        warehouse_location: warehouseLocation.trim(),
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        dimensions: {
          length: dimLength ? parseFloat(dimLength) : undefined,
          width: dimWidth ? parseFloat(dimWidth) : undefined,
          height: dimHeight ? parseFloat(dimHeight) : undefined,
        },
        items: items.map((it) => ({
          product_id: it.product_id,
          model_id: it.model_id,
          product_name: it.product_name,
          variation_name: it.variation_name,
          sku: it.sku,
          image: it.image,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          unit: it.unit || "Cái",
          note: it.note || "",
        })),
        notes: notes.trim(),
      };

      const url = isEdit ? `/api/packages/${packageToEdit?.id}` : "/api/packages";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể lưu kiện hàng");
      }

      toast.success(isEdit ? "Đã cập nhật kiện hàng!" : "Đã tạo kiện hàng mới thành công!");
      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      console.error("Lỗi lưu kiện hàng:", err);
      toast.error(err.message || "Đã xảy ra lỗi khi lưu kiện hàng");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0 font-bold">
              📦
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base sm:text-lg">
                {isEdit ? "Chỉnh Sửa Kiện Hàng" : "Tạo Kiện Hàng Mới"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Thêm sản phẩm, điều chỉnh số lượng và thông tin điểm đến để in mã QR định danh
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 text-xs">
            {/* 1. Thông tin chung của kiện hàng */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                <span>1. Thông tin chung kiện hàng</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Mã kiện hàng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="VD: PKG-20261019-01"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Dùng để tạo mã QR định danh dán lên thùng</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tên / Mô tả kiện hàng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="VD: Thùng hàng phụ kiện 01 - Đơn đại lý miền Bắc"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Loại kiện hàng
                  </label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Đóng hàng xuất">Đóng hàng xuất</option>
                    <option value="Đóng hàng sỉ / Đại lý">Đóng hàng sỉ / Đại lý</option>
                    <option value="Chuyển kho nội bộ">Chuyển kho nội bộ</option>
                    <option value="Đơn sàn TMĐT">Đơn sàn TMĐT</option>
                    <option value="Lưu kho / Gom kiện">Lưu kho / Gom kiện</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="draft">Bản nháp / Đang chuẩn bị</option>
                    <option value="packed">Đã đóng gói</option>
                    <option value="in_transit">Đang vận chuyển / Xuất kho</option>
                    <option value="delivered">Đã giao / Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Điểm đến / Khách nhận
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="VD: Kho Cần Thơ, KH Nguyễn Văn A..."
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Vị trí lưu kho / Kệ
                  </label>
                  <input
                    type="text"
                    value={warehouseLocation}
                    onChange={(e) => setWarehouseLocation(e.target.value)}
                    placeholder="VD: Kệ A1-03, Dãy B..."
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Thông số kỹ thuật (Kích thước & Khối lượng) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">
                    Trọng lượng (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="VD: 5.5"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">
                    Dài (cm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={dimLength}
                    onChange={(e) => setDimLength(e.target.value)}
                    placeholder="Dài"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">
                    Rộng (cm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={dimWidth}
                    onChange={(e) => setDimWidth(e.target.value)}
                    placeholder="Rộng"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">
                    Cao (cm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={dimHeight}
                    onChange={(e) => setDimHeight(e.target.value)}
                    placeholder="Cao"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Thêm sản phẩm vào kiện hàng */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 flex-1">
                  <span>2. Danh sách sản phẩm trong kiện</span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                </h3>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {items.length} mặt hàng / {totalItemCount} sản phẩm
                </span>
              </div>

              {/* Ô tìm kiếm sản phẩm kho */}
              <div className="relative">
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-zinc-400 flex items-center pointer-events-none">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    placeholder="Tìm kiếm sản phẩm theo tên, SKU, mã vạch để thêm vào kiện..."
                    className="w-full pl-10 pr-24 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs shadow-xs"
                  />
                  {isSearching && (
                    <div className="absolute right-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span>Đang tìm...</span>
                    </div>
                  )}
                </div>

                {/* Dropdown danh sách kết quả tìm kiếm */}
                {showDropdown && searchResults.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-20 top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800"
                  >
                    {searchResults.map((prod) => (
                      <div key={prod.product_id} className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.product_name}
                                className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base shrink-0">
                                📦
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-xs">
                                {prod.product_name}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                <span>SKU: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{prod.sku}</strong></span>
                                <span>•</span>
                                <span>Tồn kho: <strong className={prod.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>{prod.stock}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div>
                            {prod.has_variations && prod.all_variations && prod.all_variations.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setSelectedProductForVariation(prod)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-medium text-xs flex items-center gap-1 transition-colors"
                              >
                                <span>Chọn phân loại</span>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddDirectProduct(prod)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1 transition-colors shadow-xs"
                              >
                                <span>+ Thêm</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Nếu đang mở rộng chọn phân loại của sản phẩm này */}
                        {selectedProductForVariation?.product_id === prod.product_id && (
                          <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5 pl-12">
                            <p className="text-[10px] font-semibold text-zinc-500">Chọn biến thể / phân loại:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {prod.all_variations?.map((v) => (
                                <button
                                  key={v.model_id}
                                  type="button"
                                  onClick={() => handleAddVariation(prod, v)}
                                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 text-left text-xs transition-colors"
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{v.name}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono">SKU: {v.sku}</div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">Tồn: {v.stock}</span>
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">+ Chọn</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bảng danh sách sản phẩm trong kiện */}
              {items.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2 bg-zinc-50/50 dark:bg-zinc-900/40">
                  <div className="text-3xl">📦</div>
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">Chưa có sản phẩm nào trong kiện hàng</p>
                  <p className="text-zinc-400 text-[11px] max-w-sm mx-auto">
                    Hãy dùng thanh tìm kiếm ở trên để tìm và thêm các sản phẩm, phân loại và số lượng cần đóng kiện
                  </p>
                </div>
              ) : (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50 text-[11px] font-semibold text-zinc-500">
                        <th className="py-2.5 px-3">Sản phẩm</th>
                        <th className="py-2.5 px-3 w-28 text-center">Đơn vị</th>
                        <th className="py-2.5 px-3 w-36 text-center">Số lượng</th>
                        <th className="py-2.5 px-3 w-32 text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 w-12 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                      {items.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.product_name}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm shrink-0">
                                  🏷️
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-xs">
                                  {item.product_name}
                                </p>
                                {item.variation_name && (
                                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-medium">
                                    Phân loại: {item.variation_name}
                                  </span>
                                )}
                                {item.sku && (
                                  <p className="text-[10px] text-zinc-400 font-mono">SKU: {item.sku}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Đơn vị tính */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="text"
                              value={item.unit || "Cái"}
                              onChange={(e) => handleUpdateUnit(index, e.target.value)}
                              placeholder="Cái"
                              className="w-20 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center font-medium text-xs focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Số lượng */}
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  handleUpdateQuantity(index, isNaN(val) ? 1 : val);
                                }}
                                className="w-14 px-1.5 py-1 text-center font-bold text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                                className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Đơn giá */}
                          <td className="py-3 px-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                            {item.unit_price ? `₫${item.unit_price.toLocaleString("vi-VN")}` : "--"}
                          </td>

                          {/* Xóa */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Xóa sản phẩm khỏi kiện"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Ghi chú kiện hàng */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Ghi chú cho kiện hàng
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú đặc biệt khi vận chuyển, lưu kho hoặc kiểm đếm..."
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs"
                />
              </div>
            </div>
          </div>

          {/* Footer Summary & Buttons */}
          <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px]">Tổng số lượng:</span>
                <span className="font-bold text-zinc-900 dark:text-white text-sm">
                  {totalItemCount} <span className="text-xs font-normal text-zinc-500">sản phẩm</span>
                </span>
              </div>
              <div className="h-7 w-px bg-zinc-200 dark:bg-zinc-700" />
              <div>
                <span className="text-zinc-400 block text-[10px]">Tổng giá trị ước tính:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  ₫{totalValue.toLocaleString("vi-VN")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <span>💾 {isEdit ? "Cập nhật Kiện hàng" : "Lưu Kiện hàng"}</span>
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

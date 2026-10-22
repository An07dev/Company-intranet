"use client";

import React, { useState, useEffect, useRef } from "react";

export interface ProductVariationOption {
  model_id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  image?: string;
}

export interface ProductCatalogItem {
  product_id: string;
  model_id?: string;
  product_name: string;
  variation_name?: string;
  sku: string;
  image?: string;
  stock: number;
  price: number;
  price_display?: string;
  has_variations: boolean;
  all_variations?: ProductVariationOption[];
}

interface ProductCatalogPickerProps {
  onSelectProduct: (product: ProductCatalogItem, variation?: ProductVariationOption) => void;
  accentColor?: "blue" | "amber";
}

export function ProductCatalogPicker({
  onSelectProduct,
  accentColor = "blue",
}: ProductCatalogPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ProductCatalogItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Xử lý click ra ngoài để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tìm kiếm sản phẩm (debounce 250ms)
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const queryParam = searchQuery.trim() ? `q=${encodeURIComponent(searchQuery.trim())}&` : "";
        const res = await fetch(`/api/packages/search-products?${queryParam}limit=20`);
        const json = await res.json();
        if (json.success && json.data?.products) {
          setResults(json.data.products);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm sản phẩm:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  const handleSelect = (prod: ProductCatalogItem, variation?: ProductVariationOption) => {
    onSelectProduct(prod, variation);
    setSearchQuery("");
    setIsOpen(false);
    setExpandedProductId(null);
  };

  const ringFocusClass =
    accentColor === "amber"
      ? "focus:ring-amber-500 focus:border-amber-500"
      : "focus:ring-blue-500 focus:border-blue-500";

  const btnAddClass =
    accentColor === "amber"
      ? "bg-amber-600 hover:bg-amber-700 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-zinc-400 pointer-events-none flex items-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Tìm & chọn sản phẩm có sẵn trong kho (theo Tên, SKU, Barcode, ID) để thêm vào đơn..."
          className={`w-full pl-10 pr-24 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 ${ringFocusClass} shadow-2xs transition`}
        />

        <div className="absolute right-3 flex items-center gap-2">
          {isSearching && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Đang tìm...</span>
            </div>
          )}
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                inputRef.current?.focus();
              }}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs px-1 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Dropdown danh sách kết quả */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2.5 bg-zinc-50/80 dark:bg-zinc-800/50 flex items-center justify-between text-[11px] text-zinc-500 px-3">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {results.length > 0 ? `Sản phẩm trong kho (${results.length})` : "Kết quả tìm kiếm"}
            </span>
            <span className="text-[10px] text-zinc-400">
              Nhấp để thêm vào danh sách mặt hàng
            </span>
          </div>

          {results.length === 0 && !isSearching ? (
            <div className="p-6 text-center text-xs text-zinc-400">
              Không tìm thấy sản phẩm nào khớp với từ khóa &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            results.map((prod) => {
              const isExpanded = expandedProductId === prod.product_id;
              const hasVars = prod.has_variations && prod.all_variations && prod.all_variations.length > 0;

              return (
                <div
                  key={prod.product_id}
                  className="p-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.product_name}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base shrink-0 border border-zinc-200 dark:border-zinc-800">
                          📦
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-xs">
                          {prod.product_name}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5 flex-wrap">
                          <span>
                            SKU:{" "}
                            <strong className="font-mono text-zinc-700 dark:text-zinc-300">
                              {prod.sku}
                            </strong>
                          </span>
                          <span>•</span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              prod.stock > 0
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            Tồn kho: {prod.stock} cái
                          </span>
                          {prod.price > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-zinc-600 dark:text-zinc-400">
                                {formatPrice(prod.price)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {hasVars ? (
                        <button
                          type="button"
                          onClick={() => setExpandedProductId(isExpanded ? null : prod.product_id)}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>{isExpanded ? "Đóng" : `Chọn phân loại (${prod.all_variations?.length})`}</span>
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelect(prod)}
                          className={`px-3 py-1.5 rounded-xl font-medium text-xs flex items-center gap-1 transition shadow-2xs active:scale-95 cursor-pointer ${btnAddClass}`}
                        >
                          <span className="font-bold">+</span>
                          <span>Thêm</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Danh sách phân loại mở rộng */}
                  {isExpanded && hasVars && (
                    <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5 pl-3 sm:pl-12">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Chọn biến thể để thêm vào đơn nhập:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {prod.all_variations?.map((v) => (
                          <button
                            key={v.model_id}
                            type="button"
                            onClick={() => handleSelect(prod, v)}
                            className="flex items-center justify-between p-2 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 text-left text-xs transition cursor-pointer group"
                          >
                            <div className="min-w-0 pr-2 flex-1">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {v.name}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                SKU: {v.sku}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                                Tồn: {v.stock}
                              </span>
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                                + Chọn
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

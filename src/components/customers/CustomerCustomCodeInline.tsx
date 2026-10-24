"use client";

import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { CUSTOMER_GROUPS, CUSTOMER_GROUP_CATEGORIES, getCustomerGroupConfig } from "@/types/customer-group";

interface CustomerCustomCodeInlineProps {
  customerId: number;
  customId?: string | null;
  customerGroup?: string | null;
  customerName: string;
  onSaved: (newCustomId: string | null, newCustomerGroup: string | null) => void;
  size?: "sm" | "md";
}

export function CustomerCustomCodeInline({
  customerId,
  customId: initialCustomId,
  customerGroup: initialGroup,
  customerName,
  onSaved,
  size = "md",
}: CustomerCustomCodeInlineProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [customId, setCustomId] = useState(initialCustomId || "");
  const [customerGroup, setCustomerGroup] = useState(initialGroup || "");
  const [saving, setSaving] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state when props change
  useEffect(() => {
    setCustomId(initialCustomId || "");
    setCustomerGroup(initialGroup || "");
  }, [initialCustomId, initialGroup]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Reset to initial values on cancel
        setCustomId(initialCustomId || "");
        setCustomerGroup(initialGroup || "");
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setCustomId(initialCustomId || "");
        setCustomerGroup(initialGroup || "");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, initialCustomId, initialGroup]);

  const handleGenerateCode = (groupKeyToUse?: string) => {
    const activeGroupKey = groupKeyToUse || customerGroup || "wholesale";
    const groupCfg = CUSTOMER_GROUPS.find((g) => g.key === activeGroupKey) || CUSTOMER_GROUPS[0];
    const prefix = groupCfg.prefix || "KH";
    // Lấy 4 số cuối của customerId hoặc random 3 số
    const suffix = String(customerId).slice(-4).padStart(4, "0");
    setCustomId(`${prefix}-${suffix}`);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const cleanCustomId = customId.trim() ? customId.trim().toUpperCase() : null;
      const cleanGroup = customerGroup.trim() ? customerGroup.trim() : null;

      const res = await fetch("/api/sapo/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customerId,
          custom_id: cleanCustomId,
          customer_group: cleanGroup,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể cập nhật mã khách hàng");
      }

      toast.success(
        cleanCustomId
          ? `Đã gán mã [${cleanCustomId}] cho ${customerName}`
          : `Đã xóa mã nội bộ của ${customerName}`
      );
      onSaved(cleanCustomId, cleanGroup);
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu mã khách hàng");
    } finally {
      setSaving(false);
    }
  };

  const groupConfig = getCustomerGroupConfig(initialGroup);

  return (
    <div
      className="relative inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. NÚT HIỂN THỊ BADGE HOẶC NÚT GÁN MÃ */}
      {!isOpen && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {initialCustomId ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/60 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
              title="Nhấp để sửa mã khách hàng riêng"
            >
              <span>🏷️</span>
              <span>{initialCustomId}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-blue-500">
                ✏️
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                if (!customId) handleGenerateCode("wholesale");
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600 bg-transparent hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all cursor-pointer"
              title="Gán mã định danh nội bộ riêng cho khách hàng này"
            >
              <span>+</span>
              <span>Gán mã ID</span>
            </button>
          )}

          {/* Group Tag */}
          {groupConfig && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-semibold border ${groupConfig.badgeClass}`}
            >
              <span>{groupConfig.icon}</span>
              <span>{groupConfig.label}</span>
            </span>
          )}
        </div>
      )}

      {/* 2. POPOVER FORM INLINE EDIT */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 left-0 top-full mt-1.5 w-72 sm:w-80 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>🏷️</span>
              <span>Mã & Nhóm khách hàng nội bộ</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 text-xs rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-2.5">
            {/* Input Mã KH */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                <span>Mã riêng (Custom ID):</span>
                <button
                  type="button"
                  onClick={() => handleGenerateCode()}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] font-normal cursor-pointer flex items-center gap-0.5"
                >
                  <span>⚡</span>
                  <span>Tự sinh mã</span>
                </button>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value.toUpperCase())}
                placeholder="VD: SI-001, DL-02, B2B-09..."
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold uppercase rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Chọn Nhóm phân loại (20+ Nhóm) */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Nhóm phân loại (20+ nhóm):
              </label>

              {/* Dropdown 20+ nhóm theo danh mục */}
              <select
                value={customerGroup}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerGroup(val);
                  if (val) handleGenerateCode(val);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">-- Chưa phân nhóm --</option>
                {CUSTOMER_GROUP_CATEGORIES.map((cat) => (
                  <optgroup key={cat} label={`── ${cat} ──`}>
                    {CUSTOMER_GROUPS.filter((g) => g.category === cat).map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.icon} {g.label} ({g.prefix}-)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Quick chips chọn nhanh */}
              <div className="flex items-center gap-1 flex-wrap pt-1.5">
                <span className="text-[10px] text-zinc-400">Chọn nhanh:</span>
                {[
                  { key: "wholesale", label: "Sỉ", icon: "📦" },
                  { key: "agent_1", label: "Đại lý 1", icon: "🏬" },
                  { key: "b2b", label: "B2B", icon: "🏢" },
                  { key: "ctv", label: "CTV", icon: "🤝" },
                  { key: "vip_diamond", label: "Kim Cương", icon: "💎" },
                  { key: "debt_watch", label: "Công nợ", icon: "⚠️" },
                ].map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => {
                      setCustomerGroup(chip.key);
                      handleGenerateCode(chip.key);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer border ${
                      customerGroup === chip.key
                        ? "bg-blue-600 text-white border-blue-600 font-bold"
                        : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span>{chip.icon}</span> <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Save / Clear / Cancel */}
            <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
              {initialCustomId ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setCustomId("");
                    setCustomerGroup("");
                    // Submit directly to clear
                    setTimeout(() => handleSave(), 10);
                  }}
                  className="px-2 py-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                >
                  Xóa mã
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={saving}
                  className="px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <span className="animate-spin text-xs">⏳</span>
                  ) : (
                    <span>✓</span>
                  )}
                  <span>{saving ? "Đang lưu..." : "Lưu"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Asset, User } from "@/types";

interface HandoverAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  availableAssets?: Asset[];
  onHandedOver: (updatedAsset: Asset) => void;
}

export function HandoverAssetModal({
  isOpen,
  onClose,
  asset,
  availableAssets = [],
  onHandedOver,
}: HandoverAssetModalProps) {
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fetchedAvailable, setFetchedAvailable] = useState<Asset[]>([]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setNote("");

      if (asset) {
        setSelectedAssetId(asset.id);
      } else {
        // Tải các sản phẩm còn trong kho để bàn giao
        const fetchAvailable = async () => {
          try {
            const res = await fetch("/api/assets?status=available&limit=100");
            const data = await res.json();
            if (data.success && data.data?.items) {
              setFetchedAvailable(data.data.items);
              if (data.data.items.length > 0) {
                setSelectedAssetId(data.data.items[0].id);
              }
            }
          } catch (err) {
            console.error("Failed to load available assets:", err);
          }
        };
        fetchAvailable();
      }

      // Tải danh sách nhân viên
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const res = await fetch("/api/users?limit=100");
          const data = await res.json();
          if (data.success && data.data?.items) {
            const activeUsers = data.data.items.filter((u: User) => u.status === "active");
            setUsers(activeUsers);
            if (activeUsers.length > 0) {
              setSelectedUserId(activeUsers[0].id);
            }
          }
        } catch (err) {
          console.error("Failed to load users:", err);
        } finally {
          setLoadingUsers(false);
        }
      };

      fetchUsers();
    }
  }, [isOpen, asset]);

  if (!isOpen) return null;

  const effectiveAvailable = fetchedAvailable.length > 0 ? fetchedAvailable : availableAssets;
  const currentAsset = asset || effectiveAvailable.find((a) => a.id === selectedAssetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetAssetId = asset?.id || selectedAssetId;

    if (!targetAssetId) {
      setError("Vui lòng chọn sản phẩm cần bàn giao");
      return;
    }

    if (!selectedUserId) {
      setError("Vui lòng chọn nhân viên tiếp nhận bàn giao");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/assets/${targetAssetId}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigneeId: selectedUserId,
          date: new Date().toISOString().slice(0, 10),
          condition: currentAsset?.condition || "Tốt",
          note: note.trim() || "Bàn giao thiết bị làm việc",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Không thể bàn giao");
      }

      onHandedOver(data.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi bàn giao");
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤝</span>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Bàn Giao Sản Phẩm
              </h2>
              <p className="text-xs text-zinc-500">Cấp phát thiết bị cho nhân sự sử dụng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Chọn hoặc hiển thị sản phẩm */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Sản phẩm / Thiết bị bàn giao <span className="text-rose-500">*</span>
            </label>
            {asset ? (
              <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-white">{asset.name}</div>
                  <div className="text-[11px] text-zinc-500 font-mono">Mã: {asset.code}</div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-medium">
                  Sẵn sàng
                </span>
              </div>
            ) : effectiveAvailable.length === 0 ? (
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-center">
                Hiện không có sản phẩm nào sẵn sàng trong kho
              </div>
            ) : (
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                {effectiveAvailable.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Chọn nhân viên */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nhân viên tiếp nhận <span className="text-rose-500">*</span>
            </label>
            {loadingUsers ? (
              <div className="text-zinc-400 py-1">Đang tải danh sách nhân sự...</div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.employeeCode}) - {u.department || "Nhân viên"}
                  </option>
                ))}
              </select>
            )}

            {selectedUser && (
              <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-600 dark:text-blue-300 flex-shrink-0">
                  {selectedUser.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-zinc-900 dark:text-white">{selectedUser.name}</span>
                  <span className="text-[11px] text-zinc-500 ml-1.5">({selectedUser.email})</span>
                </div>
              </div>
            )}
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Ghi chú bàn giao <span className="text-zinc-400 font-normal">(tùy chọn)</span>
            </label>
            <input
              type="text"
              placeholder="VD: Đầy đủ sạc cáp, phục vụ làm việc tại văn phòng..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || (!asset && availableAssets.length === 0)}
              className="px-4 py-2 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Xác nhận bàn giao</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

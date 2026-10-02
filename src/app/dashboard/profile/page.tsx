"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui/Loading";
import { USER_ROLE_LABELS } from "@/lib/constants";

// Bộ sưu tập avatar mẫu phong cách công sở / doanh nghiệp hiện đại
const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
];

export default function UserProfileSettingsPage() {
  const { user, updateUser, refreshSession } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");

  // Form Thông tin cá nhân
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Form Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Modal / Preset Picker
  const [showPresetModal, setShowPresetModal] = useState(false);

  // Loading & Thông báo
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ dữ liệu người dùng vào form khi user thay đổi
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  // Xóa thông báo sau 5 giây
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Hàm nén ảnh sang định dạng Base64 Data URL tối ưu lưu trực tiếp vào DB (~30KB - 80KB)
  const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Chuẩn hóa kích thước avatar tối đa 400x400 px để tối ưu tốc độ và dung lượng DB
          const MAX_DIMENSION = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIMENSION) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            }
          } else {
            if (height > MAX_DIMENSION) {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          // Xuất ra chuỗi Base64 Data URL định dạng JPEG chất lượng cao 85%
          const base64Data = canvas.toDataURL("image/jpeg", 0.85);
          resolve(base64Data);
        };
        img.onerror = () => reject(new Error("Không thể đọc dữ liệu tệp ảnh"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Lỗi khi đọc file ảnh"));
      reader.readAsDataURL(file);
    });
  };

  // Xử lý upload ảnh đại diện từ máy tính và lưu trực tiếp dạng Base64 vào DB
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setMessage(null);

      // 1. Chuyển đổi và nén ảnh thành chuỗi Base64 Data URL (~30KB - 80KB)
      const base64String = await compressImageToBase64(file);

      // 2. Gửi Base64 lên Server để lưu trực tiếp vào Database (MongoDB)
      const res = await fetch("/api/users/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: base64String }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Tải ảnh đại diện thất bại");
      }

      const newAvatar = json.data?.avatarUrl || base64String;
      setAvatarUrl(newAvatar);

      if (json.data?.user) {
        updateUser(json.data.user);
      } else {
        await refreshSession();
      }

      setMessage({
        type: "success",
        text: "Ảnh đại diện đã được lưu trực tiếp vào Cơ sở dữ liệu (định dạng Base64) thành công!",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi khi tải ảnh đại diện",
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Chọn ảnh mẫu có sẵn
  const handleSelectPresetAvatar = async (presetUrl: string) => {
    try {
      setUploadingAvatar(true);
      setMessage(null);

      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: presetUrl }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Cập nhật ảnh đại diện thất bại");
      }

      setAvatarUrl(presetUrl);
      if (json.data) {
        updateUser(json.data);
      } else {
        await refreshSession();
      }

      setShowPresetModal(false);
      setMessage({ type: "success", text: "Đã áp dụng ảnh đại diện mẫu thành công!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi cập nhật ảnh đại diện",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Xử lý lưu thông tin cá nhân
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: "error", text: "Họ và tên không được để trống" });
      return;
    }

    try {
      setSavingInfo(true);
      setMessage(null);

      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          avatarUrl: avatarUrl.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Cập nhật thông tin thất bại");
      }

      if (json.data) {
        updateUser(json.data);
      } else {
        await refreshSession();
      }

      setMessage({ type: "success", text: "Đã lưu thay đổi thông tin cá nhân thành công!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu thông tin",
      });
    } finally {
      setSavingInfo(false);
    }
  };

  // Xử lý đổi mật khẩu
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setMessage({ type: "error", text: "Vui lòng nhập mật khẩu hiện tại" });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: "error", text: "Mật khẩu mới phải có tối thiểu 6 ký tự" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Mật khẩu xác nhận không trùng khớp với mật khẩu mới" });
      return;
    }

    try {
      setSavingPassword(true);
      setMessage(null);

      const res = await fetch("/api/users/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Đổi mật khẩu thất bại");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage({
        type: "success",
        text: "Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới để đăng nhập các lần sau.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Có lỗi xảy ra khi đổi mật khẩu",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Đánh giá độ mạnh mật khẩu mới
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "", color: "" };
    if (pass.length < 6) return { score: 1, text: "Yếu (tối thiểu 6 ký tự)", color: "bg-red-500" };
    const hasNum = /\d/.test(pass);
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pass);

    const matches = [hasNum, hasLetter, hasSpecial].filter(Boolean).length;
    if (pass.length >= 8 && matches >= 3) {
      return { score: 3, text: "Rất mạnh & an toàn", color: "bg-emerald-500" };
    }
    if (pass.length >= 6 && matches >= 2) {
      return { score: 2, text: "Trung bình", color: "bg-amber-500" };
    }
    return { score: 1, text: "Yếu", color: "bg-red-500" };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Ẩn file input chung để cả mobile và desktop đều kích hoạt được */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      {/* 1. Header Trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pb-3 sm:pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 sm:gap-2.5">
            <span>⚙️</span>
            <span>Cài Đặt Tài Khoản & Thông Tin Cá Nhân</span>
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Quản lý thông tin hồ sơ của bạn, cập nhật ảnh đại diện và thiết lập mật khẩu bảo mật tài khoản.
          </p>
          <p className="sm:hidden text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Quản lý thông tin hồ sơ và bảo mật tài khoản.
          </p>
        </div>
      </div>

      {/* Thông báo toàn cục */}
      {message && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="text-base">{message.type === "success" ? "✅" : "⚠️"}</span>
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          MOBILE ONLY: COMPACT PROFILE HEADER (lg:hidden)
          Tối ưu không gian dọc, tránh trùng lặp thông tin với form bên dưới
         ========================================================================= */}
      <div className="lg:hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-3.5 relative">
          {/* Avatar thu nhỏ với nút chụp ảnh */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full ring-3 ring-zinc-100 dark:ring-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl font-extrabold text-zinc-600 dark:text-zinc-300 shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.slice(0, 2).toUpperCase()
              )}
            </div>

            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white">
                <Spinner size="sm" className="text-white" />
              </div>
            )}

            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              title="Đổi ảnh đại diện"
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Thông tin chính & nút thao tác ảnh */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</h2>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                {user.employeeCode || "NV-CHƯA ĐẶT"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  user.role === "admin"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                    : user.role === "director"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    : user.role === "manager"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {USER_ROLE_LABELS[user.role] || user.role}
              </span>

              {user.contractType === "probation" ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Thử việc
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Chính thức
                </span>
              )}

              {avatarUrl && avatarUrl.startsWith("data:image/") && (
                <span className="text-[9px] font-medium font-mono px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-0.5">
                  <span>💾</span>
                  <span>DB (Base64)</span>
                </span>
              )}
            </div>

            {/* Nút thao tác ảnh trên mobile */}
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer"
              >
                Tải ảnh
              </button>
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => setShowPresetModal(true)}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer"
              >
                Chọn ảnh mẫu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Grid Bố cục 2 cột (Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            CỘT TRÁI: PROFILE CARD & ẢNH ĐẠI DIỆN (CHỈ HIỂN THỊ TRÊN DESKTOP: hidden lg:flex)
           ========================================================================= */}
        <div className="hidden lg:flex lg:col-span-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs flex-col items-center text-center relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

          {/* Khung Avatar */}
          <div className="relative group mt-2 mb-4">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-zinc-100 dark:ring-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl font-extrabold text-zinc-600 dark:text-zinc-300 shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.slice(0, 2).toUpperCase()
              )}
            </div>

            {/* Overlay icon khi tải ảnh */}
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white">
                <Spinner size="md" className="text-white" />
              </div>
            )}

            {/* Nút bấm tải ảnh */}
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              title="Tải ảnh mới từ máy tính"
              className="absolute bottom-1 right-1 p-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Nút thao tác ảnh */}
          <div className="flex items-center gap-2 mb-5">
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Tải ảnh lên
            </button>
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => setShowPresetModal(true)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Chọn ảnh mẫu
            </button>
          </div>

          {/* Họ tên & Mã nhân viên */}
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{user.name}</h2>
          <div className="text-xs font-mono text-zinc-400 mt-0.5">{user.employeeCode || "NV-CHƯA ĐẶT"}</div>

          {/* Badges Role & Hợp đồng */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                user.role === "admin"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                  : user.role === "director"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : user.role === "manager"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {USER_ROLE_LABELS[user.role] || user.role}
            </span>

            {user.contractType === "probation" ? (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Thử việc
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Chính thức
              </span>
            )}

            {avatarUrl && avatarUrl.startsWith("data:image/") && (
              <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-1">
                <span>💾</span>
                <span>Lưu trong DB (Base64)</span>
              </span>
            )}
          </div>

          {/* Chi tiết tài khoản */}
          <div className="w-full mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">🏢 Phòng ban:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">
                {user.department || "Chưa phân bổ"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">✉️ Email:</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]" title={user.email}>
                {user.email}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">📞 Điện thoại:</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                {user.phone || "Chưa cập nhật"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">📅 Ngày gia nhập:</span>
              <span className="text-zinc-800 dark:text-zinc-200 font-mono">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "---"}
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CỘT PHẢI: FORM CHỈNH SỬA & ĐỔI MẬT KHẨU (8 CỘT)
           ========================================================================= */}
        <div className="lg:col-span-8 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          {/* Header Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`flex-1 sm:flex-none px-3.5 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
                activeTab === "info"
                  ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span>👤</span>
              <span className="sm:hidden">Thông Tin</span>
              <span className="hidden sm:inline">Thông Tin Cá Nhân</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("password")}
              className={`flex-1 sm:flex-none px-3.5 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
                activeTab === "password"
                  ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span>🔒</span>
              <span className="sm:hidden">Đổi Mật Khẩu</span>
              <span className="hidden sm:inline">Đổi Mật Khẩu Bảo Mật</span>
            </button>
          </div>

          <div className="p-4 sm:p-8">
            {/* =====================================================================
                TAB 1: THÔNG TIN CÁ NHÂN
               ===================================================================== */}
            {activeTab === "info" && (
              <form onSubmit={handleSaveInfo} className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Cập nhật thông tin cơ bản
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Thay đổi họ tên và số điện thoại liên hệ của bạn trong hệ thống.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {/* Họ và tên */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Số điện thoại di động
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                  </div>

                  {/* =================================================================
                      CÁC TRƯỜNG CỐ ĐỊNH TRÊN DESKTOP (giữ nguyên bố cục PC ban đầu)
                     ================================================================= */}
                  {/* Email (Read-only) */}
                  <div className="hidden sm:block">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>Địa chỉ Email công vụ</span>
                      <span className="text-[10px] text-zinc-400 font-normal">Cố định</span>
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-zinc-100/80 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Email đăng nhập do Quản trị viên cấp. Liên hệ bộ phận IT để thay đổi.
                    </p>
                  </div>

                  {/* Mã nhân viên (Read-only) */}
                  <div className="hidden sm:block">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>Mã định danh nhân sự</span>
                      <span className="text-[10px] text-zinc-400 font-normal">Cố định</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user.employeeCode || "Chưa cấp"}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-zinc-100/80 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono cursor-not-allowed"
                    />
                  </div>

                  {/* Phòng ban (Read-only) */}
                  <div className="hidden sm:block">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Phòng ban trực thuộc
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user.department || "Chưa phân bổ"}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-zinc-100/80 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                    />
                  </div>

                  {/* Vai trò / Quyền hạn (Read-only) */}
                  <div className="hidden sm:block">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Chức danh & Vai trò hệ thống
                    </label>
                    <input
                      type="text"
                      disabled
                      value={USER_ROLE_LABELS[user.role] || user.role}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-zinc-100/80 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                {/* =================================================================
                    MOBILE ONLY: THÔNG TIN HỆ THỐNG GỌN GÀNG (sm:hidden)
                    Tối ưu không chiếm cuộn trang trên điện thoại
                   ================================================================= */}
                <div className="sm:hidden rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 p-3.5 space-y-2.5 text-xs">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Thông tin cố định hệ thống</span>
                    <span className="text-[10px] lowercase text-zinc-400">chỉ xem</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                    <div className="min-w-0">
                      <span className="text-zinc-400 block text-[10px]">Email công vụ</span>
                      <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 truncate block" title={user.email}>
                        {user.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Mã nhân viên</span>
                      <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                        {user.employeeCode || "Chưa cấp"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-zinc-400 block text-[10px]">Phòng ban</span>
                      <span className="text-xs text-zinc-800 dark:text-zinc-200 truncate block">
                        {user.department || "Chưa phân bổ"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Chức vụ</span>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                        {USER_ROLE_LABELS[user.role] || user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hàng nút submit */}
                <div className="pt-3 sm:pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={savingInfo}
                    className="w-full sm:w-auto px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold text-xs sm:text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.99] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingInfo && <Spinner size="sm" className="text-white dark:text-zinc-900" />}
                    <span>Lưu Thay Đổi Thông Tin</span>
                  </button>
                </div>
              </form>
            )}

            {/* =====================================================================
                TAB 2: ĐỔI MẬT KHẨU
               ===================================================================== */}
            {activeTab === "password" && (
              <form onSubmit={handleChangePassword} className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Đổi mật khẩu tài khoản
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Để đảm bảo an toàn, hãy đặt mật khẩu có ít nhất 6 ký tự kết hợp chữ cái và số.
                  </p>
                </div>

                <div className="space-y-3.5 sm:space-y-4 max-w-lg">
                  {/* Mật khẩu hiện tại */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Mật khẩu hiện tại <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Nhập mật khẩu bạn đang dùng"
                        className="w-full px-3.5 py-2.5 pr-10 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        {showCurrentPass ? "👁️" : "🙈"}
                      </button>
                    </div>
                  </div>

                  {/* Mật khẩu mới */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full px-3.5 py-2.5 pr-10 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        {showNewPass ? "👁️" : "🙈"}
                      </button>
                    </div>

                    {/* Thanh đo độ mạnh mật khẩu */}
                    {newPassword && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-1.5 flex-1 rounded-full ${strength.score >= 1 ? strength.color : "bg-zinc-200 dark:bg-zinc-700"}`} />
                          <div className={`h-1.5 flex-1 rounded-full ${strength.score >= 2 ? strength.color : "bg-zinc-200 dark:bg-zinc-700"}`} />
                          <div className={`h-1.5 flex-1 rounded-full ${strength.score >= 3 ? strength.color : "bg-zinc-200 dark:bg-zinc-700"}`} />
                        </div>
                        <span className="text-[11px] text-zinc-400 block font-medium">
                          Độ mạnh: <span className="text-zinc-700 dark:text-zinc-300">{strength.text}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Xác nhận mật khẩu mới */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full px-3.5 py-2.5 pr-10 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        {showConfirmPass ? "👁️" : "🙈"}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[11px] text-rose-500 mt-1">Mật khẩu xác nhận không khớp!</p>
                    )}
                  </div>
                </div>

                {/* Hàng nút submit đổi mật khẩu */}
                <div className="pt-3 sm:pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword || (confirmPassword ? newPassword !== confirmPassword : false)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold text-xs sm:text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.99] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingPassword && <Spinner size="sm" className="text-white dark:text-zinc-900" />}
                    <span>Cập Nhật Mật Khẩu Mới</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL CHỌN ẢNH ĐẠI DIỆN MẪU
         ========================================================================= */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Chọn ảnh đại diện mẫu
              </h3>
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Nhấp vào một hình ảnh bên dưới để áp dụng ngay làm ảnh đại diện hồ sơ của bạn:
            </p>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-3 py-1">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPresetAvatar(url)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 transition hover:scale-105 active:scale-95 cursor-pointer ${
                    avatarUrl === url
                      ? "border-zinc-900 dark:border-zinc-100 ring-2 ring-blue-500"
                      : "border-transparent hover:border-zinc-400"
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

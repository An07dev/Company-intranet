"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import { Spinner, LoadingSection, LoadingOverlay } from "@/components/ui/Loading";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface DemoAccount {
  role: UserRole;
  label: string;
  name: string;
  email: string;
  pass: string;
  dept: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "admin",
    label: "Admin",
    name: "Nguyễn Văn Admin",
    email: "admin@company.internal",
    pass: "admin123",
    dept: "IT & Quản Trị Hệ Thống",
  },
  {
    role: "director",
    label: "Giám Đốc",
    name: "Trịnh Gia Giám Đốc",
    email: "director@company.internal",
    pass: "director123",
    dept: "Ban Giám Đốc",
  },
  {
    role: "manager",
    label: "Quản lý",
    name: "Trần Thị Quản Lý",
    email: "manager@company.internal",
    pass: "manager123",
    dept: "Kỹ Thuật & Vận Hành",
  },
  {
    role: "employee",
    label: "Nhân viên",
    name: "Lê Hoàng Nhân Viên",
    email: "employee@company.internal",
    pass: "employee123",
    dept: "Phát Triển Sản Phẩm",
  },
];

export default function LoginPage() {
  const { user, isLoading, login, logout } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFillDemo = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    setSubmitting(true);
    const result = await login({ email, password, rememberMe });
    setSubmitting(false);

    if (result.success) {
      const isStaff = result.user?.role === "manager" || result.user?.role === "employee";
      const targetPath = isStaff ? "/dashboard/attendance" : "/dashboard";

      setSuccessMessage(
        isStaff
          ? "Đăng nhập thành công! Đang chuyển đến trang Điểm Danh & Chấm Công..."
          : "Đăng nhập thành công! Đang chuyển hướng vào Dashboard..."
      );
      setTimeout(() => {
        router.push(targetPath);
      }, 350);
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors relative">
      {/* Lớp phủ loading khi gọi API đăng nhập */}
      {submitting && <LoadingOverlay text="Đang xác thực tài khoản..." />}

      {/* Header tối giản */}
      <header className="w-full px-4 sm:px-8 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs tracking-wider">
            IN
          </div>
          <span className="font-semibold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100">
            Hệ Thống Nội Bộ
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Hệ thống sẵn sàng</span>
          </div>
        </div>
      </header>

      {/* Main Content: Form căn giữa, tối ưu trên cả Mobile & Desktop */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[420px]">
          {isLoading ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <LoadingSection text="Đang kiểm tra phiên làm việc..." size="md" />
            </div>
          ) : user ? (
            /* Trạng thái đã đăng nhập */
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                    Phiên hoạt động
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {user.role}
                </span>
              </div>

              <div className="py-5 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-zinc-800 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {user.name}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {user.email}
                  </p>
                  {user.department && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                      {user.department}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                {user.role === "manager" || user.role === "employee" ? (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/attendance")}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>⏰</span>
                    <span>Đi tới Điểm Danh & Chấm Công →</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    Đi tới Bảng Điều Khiển (Dashboard) →
                  </button>
                )}
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={async () => {
                    setIsLoggingOut(true);
                    try {
                      await logout();
                    } finally {
                      setIsLoggingOut(false);
                    }
                  }}
                  className="w-full py-2 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLoggingOut && <Spinner size="xs" color="muted" />}
                  <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Form Đăng nhập tinh gọn */
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Đăng nhập
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Nhập tài khoản được cấp để vào hệ thống nội bộ
                </p>
              </div>

              {/* Thông báo lỗi / thành công */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Email công việc
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten@company.internal"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => alert("Gợi ý mật khẩu mẫu:\n- admin123\n- manager123\n- employee123")}
                      className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Ghi nhớ đăng nhập */}
                <div className="pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-600 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900"
                    />
                    <span>Ghi nhớ đăng nhập (30 ngày)</span>
                  </label>
                </div>

                {/* Nút Đăng nhập */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Spinner size="xs" color="white" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>
              </form>

              {/* Tài khoản mẫu test nhanh: thiết kế dạng pill tối giản */}
              <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
                <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Tài khoản dùng thử (bấm để điền):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleFillDemo(acc)}
                      className="py-1.5 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-center transition-colors cursor-pointer"
                    >
                      <span className="block text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {acc.label}
                      </span>
                      <span className="block text-[10px] text-zinc-400 truncate mt-0.5">
                        {acc.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer tối giản */}
      <footer className="w-full py-4 px-4 text-center border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400 dark:text-zinc-500">
        © 2026 Cổng thông tin nội bộ doanh nghiệp.
      </footer>
    </div>
  );
}

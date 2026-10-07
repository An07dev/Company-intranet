"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";

interface PingResult {
  status: number;
  message: string;
  latencyMs: number;
  timestamp: string;
}

interface WebhookLog {
  id?: string;
  level: string;
  message: string;
  source: string;
  shop_username?: string;
  createdAt: string;
  details?: Record<string, any>;
}

export default function WebhooksPage() {
  const { toast } = useToast();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);

  // Test Simulation State
  const [simulating, setSimulating] = useState(false);
  const [testShop, setTestShop] = useState("Shopee");
  const [testOrderNumber, setTestOrderNumber] = useState(`TEST-${Date.now().toString().slice(-4)}`);
  const [testCustomer, setTestCustomer] = useState("Nguyễn Văn An");
  const [testAmount, setTestAmount] = useState("250000");
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  // Recent Logs State
  const [recentLogs, setRecentLogs] = useState<WebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const webhookEndpoint = "https://company-intranet-bigman.vercel.app/api/webhooks/sapo";
  const sapoStore = "cua-hang-yen-sen.mysapo.net";
  const webhookId = "2662417";

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopiedUrl(true);
    toast.success("Đã sao chép Webhook URL vào clipboard");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Test Ping Endpoint
  const handlePing = async () => {
    setPinging(true);
    const start = performance.now();
    try {
      const res = await fetch("/api/webhooks/sapo");
      const data = await res.json();
      const latency = Math.round(performance.now() - start);

      setPingResult({
        status: res.status,
        message: data.message || "Endpoint hoạt động bình thường",
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      });

      if (res.ok) {
        toast.success(`Ping thành công! Độ trễ: ${latency}ms`);
      } else {
        toast.error(`Endpoint trả về mã ${res.status}`);
      }
    } catch (err: any) {
      setPingResult({
        status: 500,
        message: err.message || "Không thể kết nối tới endpoint",
        latencyMs: Math.round(performance.now() - start),
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      });
      toast.error("Lỗi kết nối khi ping endpoint");
    } finally {
      setPinging(false);
    }
  };

  // Fetch recent webhook logs
  const fetchRecentLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/shopee/logs?type=order_sync&limit=10");
      const json = await res.json();
      if (json.success && json.data) {
        setRecentLogs(json.data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentLogs();
  }, [fetchRecentLogs]);

  // Simulate incoming Sapo Webhook Order
  const handleSimulateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSimulationResult(null);

    const mockPayload = {
      id: Math.floor(Math.random() * 900000000) + 100000000,
      order_number: testOrderNumber,
      source_name: testShop.toLowerCase(),
      total_price: Number(testAmount) || 0,
      gateway: "COD",
      financial_status: "paid",
      fulfillment_status: "unfulfilled",
      customer: {
        first_name: testCustomer.split(" ").slice(-1)[0] || "A",
        last_name: testCustomer.split(" ").slice(0, -1).join(" ") || "Nguyễn",
      },
      shipping_address: {
        name: testCustomer,
      },
      line_items: [
        {
          name: `Hộp đóng gói carton ${testShop}`,
          variant_title: "Size 20x15x10 (Mẫu test)",
          quantity: 2,
          price: (Number(testAmount) || 0) / 2,
        },
      ],
    };

    try {
      const res = await fetch("/api/webhooks/sapo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPayload),
      });

      const data = await res.json();
      setSimulationResult(data);

      if (res.ok && data.success) {
        toast.success(`Đã bắn đơn test #${testOrderNumber} thành công!`);
        setTestOrderNumber(`TEST-${Date.now().toString().slice(-4)}`);
        fetchRecentLogs();
      } else {
        toast.error("Bắn đơn test thất bại");
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* 1. Header Card */}
      <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg sm:text-xl shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 mb-0.5">
                <span>Nghiệp vụ bán hàng</span>
                <span>/</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">Cấu hình Webhook</span>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white leading-tight truncate">
                  Cấu hình Webhook & Đồng bộ Sapo
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Live
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Lắng nghe sự kiện đơn hàng thời gian thực từ Sapo (Shopee, TikTok, POS...)
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={handlePing}
              disabled={pinging}
              className="py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <span className={`text-emerald-500 ${pinging ? "animate-spin" : ""}`}>🔄</span>
              <span className="truncate">{pinging ? "Đang ping..." : "Kiểm tra Ping"}</span>
            </button>

            <Link
              href="/dashboard/orders"
              className="py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 text-center"
            >
              <span>📦</span>
              <span className="truncate">Xem đơn hàng</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Grid: Status Card & Ping Result */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5">
        {/* Card 1: Trạng thái Webhook trên Sapo */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 sm:p-5 shadow-2xs sm:shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Webhook Đang Hoạt Động (Live)
              </h2>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
              ID: {webhookId}
            </span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Endpoint URL nhận dữ liệu (Vercel)
              </label>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookEndpoint}
                  className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition shrink-0 cursor-pointer active:scale-95"
                >
                  {copiedUrl ? "Đã chép ✓" : "Sao chép"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 pt-1">
              <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80">
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Cửa hàng Sapo</p>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate" title={sapoStore}>
                  {sapoStore}
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80">
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Phương thức</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  POST (JSON)
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80">
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Sự kiện kích hoạt</p>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  orders/create
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80">
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Lưu trữ tự động</p>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                  MongoDB Atlas
                </p>
              </div>
            </div>

            {/* Supported channels tags */}
            <div className="pt-1">
              <p className="text-[11px] text-zinc-500 mb-1.5 font-medium">Các kênh Sapo hỗ trợ đẩy đơn qua webhook này:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Shopee", color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800" },
                  { name: "TikTok Shop", color: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800" },
                  { name: "Lazada", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
                  { name: "Sapo POS", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
                  { name: "Website Sapo", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800" },
                  { name: "Tiki", color: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800" },
                ].map((tag) => (
                  <span
                    key={tag.name}
                    className={`text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full border ${tag.color}`}
                  >
                    ✓ {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Kết quả kiểm tra (Liveness) */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 sm:p-5 shadow-2xs sm:shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              Kiểm tra trạng thái máy chủ
            </h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Gửi tín hiệu HTTP request kiểm tra độ trễ kết nối tới endpoint trên Vercel.
            </p>

            {pingResult ? (
              <div className="mt-3 p-3 rounded-xl border bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 text-[11px]">Mã phản hồi:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      pingResult.status === 200
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
                    }`}
                  >
                    HTTP {pingResult.status} OK
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 text-[11px]">Độ trễ phản hồi:</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{pingResult.latencyMs} ms</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 text-[11px]">Thời gian kiểm tra:</span>
                  <span className="font-mono text-zinc-500">{pingResult.timestamp}</span>
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-200/60 dark:border-zinc-700/60 pt-2 truncate">
                  {pingResult.message}
                </div>
              </div>
            ) : (
              <div className="mt-3 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                <p className="text-xs text-zinc-400">Chưa kiểm tra. Hãy nhấn nút &quot;Ping ngay&quot;.</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handlePing}
            disabled={pinging}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <span className={`text-sm ${pinging ? "animate-spin" : ""}`}>⚡</span>
            <span>{pinging ? "Đang gửi tín hiệu..." : "Ping kiểm tra ngay"}</span>
          </button>
        </div>
      </div>

      {/* 3. Grid: Playground Test Order & Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5">
        {/* Playground: Gửi đơn test */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 sm:p-5 shadow-2xs sm:shadow-sm space-y-3.5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-sm">
                🧪
              </span>
              Bắn đơn hàng giả lập (Simulator)
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1">
              Mô phỏng 1 đơn hàng từ Sapo bắn sang Webhook để kiểm tra lưu database tức thì.
            </p>
          </div>

          <form onSubmit={handleSimulateOrder} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Kênh / Sàn
                </label>
                <select
                  value={testShop}
                  onChange={(e) => setTestShop(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                >
                  <option value="Shopee">Shopee</option>
                  <option value="TikTok">TikTok Shop</option>
                  <option value="Lazada">Lazada</option>
                  <option value="POS">Sapo POS (Tại quầy)</option>
                  <option value="Website">Sapo Website</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mã đơn hàng
                </label>
                <input
                  type="text"
                  value={testOrderNumber}
                  onChange={(e) => setTestOrderNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tên người mua
                </label>
                <input
                  type="text"
                  value={testCustomer}
                  onChange={(e) => setTestCustomer(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tổng tiền (VNĐ)
                </label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <span>{simulating ? "⏳" : "🚀"}</span>
              <span>{simulating ? "Đang gửi dữ liệu..." : "Bắn đơn test sang Webhook"}</span>
            </button>
          </form>

          {simulationResult && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Phản hồi từ Webhook ({simulationResult.success ? "Thành công" : "Lỗi"}):
                </span>
                <button
                  type="button"
                  onClick={() => setSimulationResult(null)}
                  className="text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  ✕
                </button>
              </div>
              <pre className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto max-h-36 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                {JSON.stringify(simulationResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Bảng sự kiện Webhook gần đây */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 sm:p-5 shadow-2xs sm:shadow-sm space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="p-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-sm">
                  📋
                </span>
                Nhật ký sự kiện đồng bộ gần đây
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                Các sự kiện webhook và tiến trình đồng bộ đơn ghi nhận mới nhất.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchRecentLogs}
              disabled={loadingLogs}
              className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
              title="Tải lại nhật ký"
            >
              <span className={`inline-block ${loadingLogs ? "animate-spin" : ""}`}>🔄</span>
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-10 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <span className="animate-spin text-sm">⏳</span>
              <span>Đang tải nhật ký sự kiện...</span>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
              <div className="text-xl">📭</div>
              <div>Chưa có sự kiện nào được ghi nhận. Hãy thử bắn 1 đơn test!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* =========================================================================
                  GIAO DIỆN MOBILE: DANH SÁCH THẺ LOG (CARD VIEW - md:hidden)
                 ========================================================================= */}
              <div className="md:hidden space-y-2">
                {recentLogs.map((log, idx) => {
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <div
                      key={log.id || idx}
                      className="p-2.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-zinc-500">
                          {new Date(log.createdAt).toLocaleTimeString("vi-VN")}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase font-mono ${
                            log.level === "success"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : log.level === "error"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                          }`}
                        >
                          {log.level}
                        </span>
                      </div>

                      <div className="font-medium text-zinc-800 dark:text-zinc-200 leading-snug break-words">
                        {log.message}
                      </div>

                      {log.details && (
                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(isSelected ? null : log)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                          >
                            {isSelected ? "Đóng JSON ▲" : "Xem Payload ▼"}
                          </button>
                        </div>
                      )}

                      {isSelected && log.details && (
                        <div className="mt-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 animate-in fade-in duration-150">
                          <pre className="text-[10px] font-mono text-zinc-800 dark:text-zinc-200 overflow-x-auto max-h-40">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* =========================================================================
                  GIAO DIỆN DESKTOP: BẢNG TABLE (hidden md:block)
                 ========================================================================= */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 font-medium">Thời gian</th>
                      <th className="py-2.5 font-medium">Trạng thái</th>
                      <th className="py-2.5 font-medium">Nội dung sự kiện</th>
                      <th className="py-2.5 font-medium text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {recentLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2.5 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleTimeString("vi-VN")}
                        </td>
                        <td className="py-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              log.level === "success"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : log.level === "error"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                            }`}
                          >
                            {log.level}
                          </span>
                        </td>
                        <td className="py-2.5 text-zinc-800 dark:text-zinc-200 max-w-xs truncate font-medium">
                          {log.message}
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          {log.details && (
                            <button
                              type="button"
                              onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                            >
                              {selectedLog?.id === log.id ? "Đóng" : "Xem"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {selectedLog?.details && (
                  <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between mb-1.5 font-semibold text-zinc-700 dark:text-zinc-200">
                      <span>Chi tiết Payload JSON:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedLog(null)}
                        className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-zinc-800 dark:text-zinc-200 overflow-x-auto max-h-48 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

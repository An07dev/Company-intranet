"use client";

import React, { useState, useEffect, useCallback } from "react";
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <span>Nghiệp vụ bán hàng</span>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">Cấu hình Webhook</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            Cấu hình Webhook & Đồng bộ Sapo
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Theo dõi trạng thái kết nối, lắng nghe sự kiện đơn hàng thời gian thực từ Sapo (Shopee, TikTok, Lazada, POS...)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePing}
            disabled={pinging}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg className={`w-4 h-4 text-emerald-500 ${pinging ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {pinging ? "Đang ping..." : "Kiểm tra kết nối (Ping)"}
          </button>

          <a
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Xem danh sách đơn
          </a>
        </div>
      </div>

      {/* Grid: Status Card & Ping Result */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Trạng thái Webhook trên Sapo */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Webhook Đang Hoạt Động (Live)
              </h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              ID: {webhookId}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Endpoint URL nhận dữ liệu (Vercel)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookEndpoint}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 select-all"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shrink-0"
                >
                  {copiedUrl ? "Đã chép ✓" : "Sao chép"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                <p className="text-[11px] text-zinc-500 uppercase font-medium">Cửa hàng Sapo</p>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate" title={sapoStore}>
                  {sapoStore}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                <p className="text-[11px] text-zinc-500 uppercase font-medium">Phương thức</p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  POST (JSON)
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                <p className="text-[11px] text-zinc-500 uppercase font-medium">Sự kiện kích hoạt</p>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                  orders/create
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                <p className="text-[11px] text-zinc-500 uppercase font-medium">Lưu trữ tự động</p>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
                  MongoDB Atlas
                </p>
              </div>
            </div>

            {/* Supported channels tags */}
            <div className="pt-2">
              <p className="text-xs text-zinc-500 mb-2">Các kênh/sàn Sapo hỗ trợ đẩy đơn về qua webhook này:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Shopee", color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800" },
                  { name: "TikTok Shop", color: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800" },
                  { name: "Lazada", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
                  { name: "Sapo POS (Tại quầy)", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
                  { name: "Website Sapo", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800" },
                  { name: "Tiki", color: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800" },
                ].map((tag) => (
                  <span
                    key={tag.name}
                    className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${tag.color}`}
                  >
                    ✓ {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Kết quả kiểm tra (Liveness) */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Kiểm tra trạng thái máy chủ
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Nhấn nút bên dưới để gửi HTTP request kiểm tra thời gian thực tới endpoint trên Vercel.
            </p>

            {pingResult ? (
              <div className="mt-4 p-3.5 rounded-lg border bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Mã phản hồi:</span>
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
                  <span className="text-zinc-500">Độ trễ:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{pingResult.latencyMs} ms</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Thời gian:</span>
                  <span className="font-mono text-zinc-500">{pingResult.timestamp}</span>
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-200/60 dark:border-zinc-700/60 pt-2 truncate">
                  {pingResult.message}
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                <p className="text-xs text-zinc-400">Chưa kiểm tra. Hãy nhấn nút &quot;Ping ngay&quot;.</p>
              </div>
            )}
          </div>

          <button
            onClick={handlePing}
            disabled={pinging}
            className="mt-4 w-full py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${pinging ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {pinging ? "Đang gửi tín hiệu..." : "Ping ngay"}
          </button>
        </div>
      </div>

      {/* Grid: Playground Test Order & Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Playground: Gửi đơn test */}
        <div className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </span>
              Bắn đơn hàng giả lập (Test Simulator)
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Mô phỏng 1 đơn hàng từ Sapo bắn sang Webhook để kiểm tra lưu database ngay lập tức.
            </p>
          </div>

          <form onSubmit={handleSimulateOrder} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Kênh / Sàn
                </label>
                <select
                  value={testShop}
                  onChange={(e) => setTestShop(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                >
                  <option value="Shopee">Shopee</option>
                  <option value="TikTok">TikTok Shop</option>
                  <option value="Lazada">Lazada</option>
                  <option value="POS">Sapo POS (Tại quầy)</option>
                  <option value="Website">Sapo Website</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Mã đơn hàng
                </label>
                <input
                  type="text"
                  value={testOrderNumber}
                  onChange={(e) => setTestOrderNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Tên người mua
                </label>
                <input
                  type="text"
                  value={testCustomer}
                  onChange={(e) => setTestCustomer(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Tổng tiền (VNĐ)
                </label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${simulating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {simulating ? "Đang gửi dữ liệu..." : "Bắn đơn hàng test sang Webhook"}
            </button>
          </form>

          {simulationResult && (
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                ✓ Phản hồi từ Webhook ({simulationResult.success ? "Thành công" : "Lỗi"}):
              </p>
              <pre className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto max-h-36">
                {JSON.stringify(simulationResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Bảng sự kiện Webhook gần đây */}
        <div className="lg:col-span-7 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </span>
                Nhật ký sự kiện đồng bộ gần đây
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Các sự kiện webhook và tiến trình đồng bộ đơn hàng ghi nhận gần nhất.
              </p>
            </div>

            <button
              onClick={fetchRecentLogs}
              disabled={loadingLogs}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              title="Tải lại nhật ký"
            >
              <svg className={`w-4 h-4 ${loadingLogs ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-12 text-center text-xs text-zinc-400">Đang tải nhật ký...</div>
          ) : recentLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
              Chưa có sự kiện nào được ghi nhận. Hãy thử bắn 1 đơn test ở bên trái!
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
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
                <div className="mt-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs">
                  <div className="flex items-center justify-between mb-1.5 font-semibold text-zinc-700 dark:text-zinc-200">
                    <span>Chi tiết Payload JSON:</span>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      ✕
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-zinc-800 dark:text-zinc-200 overflow-x-auto max-h-48 p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

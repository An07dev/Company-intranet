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

interface SapoWebhookItem {
  id: number;
  topic: string;
  topic_name: string;
  address: string;
  format: string;
  created_on: string;
  status: string;
  is_valid_target: boolean;
}

interface SapoRequiredTopic {
  topic: string;
  label: string;
  registered: boolean;
  webhook_id: number | null;
  address: string | null;
}

interface SapoPingResult {
  success: boolean;
  connected: boolean;
  latency_ms: number;
  store_domain: string;
  total_webhooks: number;
  webhooks: SapoWebhookItem[];
  required_topics: SapoRequiredTopic[];
  all_active: boolean;
  timestamp: string;
  message: string;
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

  // Ping Sapo Webhook State
  const [pingingSapo, setPingingSapo] = useState(false);
  const [sapoPingResult, setSapoPingResult] = useState<SapoPingResult | null>(null);

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

  // Ping kiểm tra kết nối trực tiếp tới Sapo Omnichannel API (chỉ chạy khi người dùng chủ động bấm nút)
  const handlePingSapo = async () => {
    if (pingingSapo) return;
    setPingingSapo(true);
    try {
      const res = await fetch("/api/sapo/webhooks/ping");
      const data: SapoPingResult = await res.json();
      setSapoPingResult(data);

      if (res.ok && data.success && data.connected) {
        toast.success(`Ping Sapo thành công! Độ trễ: ${data.latency_ms}ms (${data.total_webhooks}/5 webhook đang Live)`);
      } else {
        toast.error(data.message || `Lỗi kết nối tới Sapo (Mã ${res.status})`);
      }
    } catch (err: any) {
      toast.error(`Lỗi kết nối khi ping tới Sapo: ${err?.message || "Không phản hồi"}`);
    } finally {
      setPingingSapo(false);
    }
  };

  // Test Ping Endpoint nội bộ (Vercel)
  const handlePing = async () => {
    if (pinging) return;
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
        toast.success(`Ping máy chủ thành công! Độ trễ: ${latency}ms`);
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
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={handlePingSapo}
              disabled={pingingSapo}
              className="py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95 whitespace-nowrap"
              title="Gửi tín hiệu kiểm tra kết nối tới Sapo Omnichannel API"
            >
              <span className={`text-sm ${pingingSapo ? "animate-spin" : ""}`}>⚡</span>
              <span>{pingingSapo ? "Đang ping Sapo..." : "Ping kết nối Sapo"}</span>
            </button>

            <Link
              href="/dashboard/orders"
              className="py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 text-center whitespace-nowrap"
            >
              <span>📦</span>
              <span>Xem đơn hàng</span>
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
              {sapoPingResult ? `${sapoPingResult.total_webhooks} Webhook Live` : `ID: ${webhookId}`}
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
                  {sapoPingResult ? `${sapoPingResult.total_webhooks} sự kiện Live` : "5 sự kiện"}
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

        {/* Card 2: Kết quả kiểm tra kết nối tới Sapo (Live) */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 sm:p-5 shadow-2xs sm:shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sapoPingResult?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span>Kiểm tra kết nối Sapo</span>
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                sapoPingResult?.connected 
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
              }`}>
                {sapoPingResult?.connected ? "Sapo Live" : "Chưa kiểm tra"}
              </span>
            </div>
            
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Gửi tín hiệu tới Sapo Admin REST API để kiểm tra kết nối và xác thực 5 sự kiện Webhook đang hoạt động.
            </p>

            {sapoPingResult ? (
              <div className="mt-3 p-3 rounded-xl border bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 text-[11px]">Trạng thái kết nối:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    sapoPingResult.connected 
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
                  }`}>
                    {sapoPingResult.connected ? "HTTP 200 • Đã kết nối" : "Lỗi kết nối"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 text-[11px]">Độ trễ tới Sapo:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ⚡ {sapoPingResult.latency_ms} ms
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 text-[11px]">Webhook đang kích hoạt:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {sapoPingResult.total_webhooks} / 5 sự kiện
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 text-[11px]">Thời gian kiểm tra:</span>
                  <span className="font-mono text-zinc-500">
                    {new Date(sapoPingResult.timestamp).toLocaleTimeString("vi-VN")}
                  </span>
                </div>

                {/* 5 sự kiện webhook */}
                {Array.isArray(sapoPingResult?.required_topics) && sapoPingResult.required_topics.length > 0 && (
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
                    <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Sự kiện Webhook xác nhận từ Sapo:
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-[11px]">
                      {sapoPingResult.required_topics.map((item) => (
                        <div key={item.topic} className="flex items-center justify-between py-0.5">
                          <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-mono text-[10.5px]">
                            <span className={item.registered ? "text-emerald-500" : "text-zinc-400"}>
                              {item.registered ? "✓" : "○"}
                            </span>
                            <span>{item.topic}</span>
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            item.registered 
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-zinc-100 text-zinc-500"
                          }`}>
                            {item.registered ? `ID: ${item.webhook_id}` : "Chưa đăng ký"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-200/60 dark:border-zinc-700/60 pt-2">
                  {sapoPingResult.message}
                </div>
              </div>
            ) : (
              <div className="mt-3 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                <p className="text-xs text-zinc-400">Chưa kiểm tra. Hãy nhấn nút &quot;Ping kiểm tra kết nối tới Sapo&quot; bên dưới.</p>
              </div>
            )}

            {/* Thông tin phụ ping Vercel nếu đã kiểm tra */}
            {pingResult && (
              <div className="mt-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Máy chủ Vercel:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    HTTP {pingResult.status} ({pingResult.latencyMs}ms)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handlePingSapo}
              disabled={pingingSapo}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <span className={`text-sm ${pingingSapo ? "animate-spin" : ""}`}>⚡</span>
              <span>{pingingSapo ? "Đang gửi tín hiệu tới Sapo..." : "Ping kiểm tra kết nối tới Sapo"}</span>
            </button>

            <button
              type="button"
              onClick={handlePing}
              disabled={pinging}
              className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className={pinging ? "animate-spin" : ""}>🔄</span>
              <span>{pinging ? "Đang ping máy chủ Vercel..." : "Kiểm tra thêm Endpoint Vercel"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Grid: Playground Test Order & Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5">
        {/* Playground: Gửi đơn test */}


        {/* Bảng sự kiện Webhook gần đây */}

      </div>
    </div>
  );
}

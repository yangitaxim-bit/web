"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { Order } from "@/types/models";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Download, Calendar, BarChart3, TrendingUp, TrendingDown } from "lucide-react";

interface DailyStats {
  date: string;
  platformIncome: number;
  driversNet: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "12m">("7d");
  const [data, setData] = useState<DailyStats[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      let startDate = new Date();

      if (period === "7d") startDate.setDate(now.getDate() - 7);
      else if (period === "30d") startDate.setDate(now.getDate() - 30);
      else if (period === "12m") startDate.setFullYear(now.getFullYear() - 1);

      const q = query(
        collection(db, "orders"),
        where("status", "==", "completed"),
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        orderBy("createdAt", "asc")
      );

      const snapshot = await getDocs(q);
      const fetchedOrders = snapshot.docs.map(doc => doc.data() as Order);
      setOrders(fetchedOrders);

      // Aggregate data for chart
      const statsMap: Record<string, DailyStats> = {};

      fetchedOrders.forEach(order => {
        const date = order.createdAt.toDate().toLocaleDateString('uz-UZ', {
          day: period === "12m" ? undefined : '2-digit',
          month: 'short'
        });

        if (!statsMap[date]) {
          statsMap[date] = { date, platformIncome: 0, driversNet: 0 };
        }

        statsMap[date].platformIncome += order.commissionAmount;
        statsMap[date].driversNet += (order.price - order.commissionAmount);
      });

      setData(Object.values(statsMap));
      setLoading(false);
    };

    fetchData();
  }, [period]);

  const totals = useMemo(() => {
    return data.reduce((acc, curr) => ({
      platform: acc.platform + curr.platformIncome,
      drivers: acc.drivers + curr.driversNet
    }), { platform: 0, drivers: 0 });
  }, [data]);

  const exportToCSV = () => {
    const headers = ["ID", "Sana", "Yo'nalish", "Jami Narx (UZS)", "Komissiya (UZS)", "Haydovchi Sof (UZS)"];
    const rows = orders.map(o => [
      o.orderId.slice(-6),
      o.createdAt.toDate().toLocaleString(),
      `"${o.pickupAddress} -> ${o.destinationAddress}"`,
      o.price,
      o.commissionAmount,
      o.price - o.commissionAmount
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sirdaryo_taxi_report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hisobotlar va Analitika</h1>
          <p className="text-gray-500 text-sm">Platforma va haydovchilar daromadini taqqoslash</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
          {(["7d", "30d", "12m"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                period === p ? "bg-amber-500 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p === "7d" ? "7 kun" : p === "30d" ? "30 kun" : "1 yil"}
            </button>
          ))}
          <button
            onClick={exportToCSV}
            className="ml-2 flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-md"
          >
            <Download className="h-4 w-4" /> CSV Eksport
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jami Platforma Foydasi</p>
            <p className="text-3xl font-black text-amber-600 mt-1">{totals.platform.toLocaleString()} UZS</p>
            <div className="flex items-center gap-1 text-green-500 text-xs mt-2 font-bold">
              <TrendingUp className="h-3 w-3" /> +12.5% o'sish
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 text-amber-600">
            <BarChart3 size={120} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Haydovchilar Jami Sof Daromadi</p>
            <p className="text-3xl font-black text-slate-800 mt-1">{totals.drivers.toLocaleString()} UZS</p>
            <div className="flex items-center gap-1 text-blue-500 text-xs mt-2 font-bold">
              <TrendingUp className="h-3 w-3" /> +8.2% faollik
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 text-slate-900">
            <TrendingUp size={120} />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-8 rounded-2xl border shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-gray-800">Daromadlar Dinamikasi</h2>
          <div className="flex items-center gap-6 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-gray-500 italic">Platforma (Komissiya)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-800"></span>
              <span className="text-gray-500 italic">Haydovchilar (Sof)</span>
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-lg animate-pulse">
              Grafik yuklanmoqda...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorPlatform" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB300" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#FFB300" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDrivers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e293b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#94a3b8', fontSize: 10}}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#94a3b8', fontSize: 10}}
                  tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value.toLocaleString()} UZS`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="platformIncome"
                  stroke="#FFB300"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPlatform)"
                />
                <Area
                  type="monotone"
                  dataKey="driversNet"
                  stroke="#1e293b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorDrivers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-widest">Tizim holati</p>
          <p className="text-sm text-slate-400">Hisobotlar oxirgi 1 daqiqa ichida yangilandi. CSV eksport barcha moliya parametrlarini o'z ichiga oladi.</p>
        </div>
        <BarChart3 className="h-10 w-10 text-slate-700" />
      </div>
    </div>
  );
}

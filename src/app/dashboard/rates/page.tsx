"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { Settings } from "@/types/models";
import { Save, History, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SettingsLog {
  id: string;
  adminEmail: string;
  changedAt: Timestamp;
  oldValues: Partial<Settings>;
  newValues: Partial<Settings>;
}

export default function RatesPage() {
  const [settings, setSettings] = useState<Settings>({
    baseFare: 5000,
    pricePerKm: 1500,
    commissionPercent: 10,
    currency: "UZS"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [logs, setLogs] = useState<SettingsLog[]>([]);

  useEffect(() => {
    // 1. Fetch current settings
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, "settings", "global"));
      if (docSnap.exists()) {
        setSettings(docSnap.data() as Settings);
      }
      setLoading(false);
    };

    // 2. Listen to logs
    const logsQuery = query(
      collection(db, "settings_logs"),
      orderBy("changedAt", "desc"),
      limit(10)
    );
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SettingsLog)));
    });

    fetchSettings();
    return () => unsubscribeLogs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const oldDoc = await getDoc(doc(db, "settings", "global"));
      const oldData = oldDoc.exists() ? oldDoc.data() : {};

      // Update settings
      await setDoc(doc(db, "settings", "global"), settings);

      // Create log entry
      await addDoc(collection(db, "settings_logs"), {
        adminEmail: auth.currentUser?.email || "unknown",
        changedAt: Timestamp.now(),
        oldValues: oldData,
        newValues: settings
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Yuklanmoqda...</div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tariflar va Komissiya Sozlamalari</h1>
        <p className="text-gray-500 text-sm mt-1">Ushbu o'zgarishlar barcha foydalanuvchilar uchun real vaqtda amal qiladi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Minimal narx (Base Fare)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.baseFare}
                    onChange={(e) => setSettings({ ...settings, baseFare: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none pr-12"
                    required
                  />
                  <span className="absolute right-3 top-3 text-gray-400 text-sm">UZS</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">1 km uchun narx</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.pricePerKm}
                    onChange={(e) => setSettings({ ...settings, pricePerKm: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none pr-12"
                    required
                  />
                  <span className="absolute right-3 top-3 text-gray-400 text-sm">UZS</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Platforma Komissiyasi (%)</label>
              <div className="relative">
                <input
                  type="number"
                  max="100"
                  min="0"
                  value={settings.commissionPercent}
                  onChange={(e) => setSettings({ ...settings, commissionPercent: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none pr-12"
                  required
                />
                <span className="absolute right-3 top-3 text-gray-400 text-sm">%</span>
              </div>

              {/* Strategic Advice */}
              <div className="mt-4 flex gap-3 rounded-lg bg-amber-50 p-4 border border-amber-100">
                <Info className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Strategik eslatma:</strong> Raqobatchilar (masalan Yandex Go) odatda yuqoriroq komissiya (15-20%) oladi.
                  Sirdaryo hududida haydovchilarni jalb qilish uchun <strong>10% yoki undan past</strong> komissiya belgilash
                  sizning asosiy ustunligingiz hisoblanadi.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-8 py-3 font-bold text-white hover:bg-amber-600 transition-all disabled:opacity-50"
              >
                {saving ? "Saqlanmoqda..." : <><Save className="h-5 w-5" /> Saqlash</>}
              </button>

              {success && (
                <div className="flex items-center gap-2 text-green-600 animate-in fade-in slide-in-from-left-4">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Muvaffaqiyatli saqlandi!</span>
                </div>
              )}
            </div>
          </form>

          {/* Alert Section */}
          <div className="flex gap-4 rounded-xl border border-red-100 bg-red-50 p-6">
            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
            <div>
              <h4 className="font-bold text-red-800 text-sm">Diqqat!</h4>
              <p className="text-xs text-red-700 mt-1">
                Ushbu o'zgarishlar hozirda yo'lda bo'lgan haydovchilarning keyingi buyurtmalarida aks etadi.
                Narxlar oshirilishi buyurtmalar soni kamayishiga, komissiya oshirilishi esa haydovchilar noroziligiga sabab bo'lishi mumkin.
              </p>
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700 font-bold mb-2">
            <History className="h-5 w-5" />
            <h3>O'zgarishlar tarixi</h3>
          </div>

          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg border p-4 shadow-sm text-xs">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">{log.adminEmail.split('@')[0]}</span>
                  <span className="text-gray-400">{log.changedAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="space-y-1 text-gray-600">
                  {log.newValues.baseFare !== log.oldValues.baseFare && (
                    <p>Base: {log.oldValues.baseFare} → {log.newValues.baseFare}</p>
                  )}
                  {log.newValues.pricePerKm !== log.oldValues.pricePerKm && (
                    <p>Km: {log.oldValues.pricePerKm} → {log.newValues.pricePerKm}</p>
                  )}
                  {log.newValues.commissionPercent !== log.oldValues.commissionPercent && (
                    <p>Kom: {log.oldValues.commissionPercent}% → {log.newValues.commissionPercent}%</p>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-gray-400">{log.changedAt.toDate().toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

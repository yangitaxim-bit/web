"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  getDoc
} from "firebase/firestore";
import { Driver, User } from "@/types/models";
import { Search, CheckCircle, XCircle, Eye, ShieldAlert } from "lucide-react";

interface DriverWithUser extends Driver {
  fullName: string;
  phoneNumber: string;
  isBlocked: boolean;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all, pending, approved, blocked
  const [selectedDriver, setSelectedDriver] = useState<DriverWithUser | null>(null);

  useEffect(() => {
    // 1. Listen to drivers
    const unsubscribe = onSnapshot(collection(db, "drivers"), async (snapshot) => {
      const driversList: DriverWithUser[] = [];

      for (const driverDoc of snapshot.docs) {
        const driverData = driverDoc.data() as Driver;
        // Fetch corresponding user data for each driver
        const userDoc = await getDoc(doc(db, "users", driverData.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          driversList.push({
            ...driverData,
            fullName: userData.fullName,
            phoneNumber: userData.phoneNumber,
            isBlocked: userData.isBlocked
          });
        }
      }
      setDrivers(driversList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.fullName.toLowerCase().includes(search.toLowerCase()) ||
                          d.phoneNumber.includes(search);
    const matchesFilter = filter === "all" ||
                          (filter === "pending" && !d.isApproved) ||
                          (filter === "approved" && d.isApproved) ||
                          (filter === "blocked" && d.isBlocked);
    return matchesSearch && matchesFilter;
  });

  const handleApprove = async (uid: string) => {
    try {
      await updateDoc(doc(db, "drivers", uid), { isApproved: true });
      setSelectedDriver(prev => prev ? { ...prev, isApproved: true } : null);
    } catch (err) {
      alert("Xatolik yuz berdi");
    }
  };

  const handleBlockStatus = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", uid), { isBlocked: !currentStatus });
      setSelectedDriver(prev => prev ? { ...prev, isBlocked: !currentStatus } : null);
    } catch (err) {
      alert("Xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Haydovchilarni boshqarish</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Ism yoki telefon..."
              className="rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:border-amber-500 focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-md border border-gray-300 px-4 py-2 focus:border-amber-500 focus:outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Barchasi</option>
            <option value="pending">Kutilmoqda</option>
            <option value="approved">Tasdiqlangan</option>
            <option value="blocked">Bloklangan</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">Yuklanmoqda...</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Haydovchi</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Mashina</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Holat</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reyting</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Safarlar</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredDrivers.map((driver) => (
                <tr key={driver.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{driver.fullName}</div>
                    <div className="text-sm text-gray-500">{driver.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {driver.carModel} <br />
                    <span className="font-mono text-gray-800">{driver.carPlateNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    {driver.isBlocked ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-600">Bloklangan</span>
                    ) : driver.isApproved ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-600">Tasdiqlangan</span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-600">Kutilmoqda</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">⭐ {driver.rating.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{driver.totalTrips}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => setSelectedDriver(driver)}
                      className="text-amber-500 hover:text-amber-700"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8">
            <div className="mb-6 flex items-center justify-between border-b pb-4">
              <h2 className="text-xl font-bold">Haydovchi tafsilotlari</h2>
              <button onClick={() => setSelectedDriver(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Shaxsiy ma'lumotlar</h3>
                <p><strong>Ism:</strong> {selectedDriver.fullName}</p>
                <p><strong>Telefon:</strong> {selectedDriver.phoneNumber}</p>
                <p><strong>Mashina:</strong> {selectedDriver.carModel} ({selectedDriver.carPlateNumber})</p>

                <div className="flex gap-4 pt-4">
                  {!selectedDriver.isApproved && (
                    <button
                      onClick={() => handleApprove(selectedDriver.uid)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-md bg-green-500 py-2 text-white hover:bg-green-600"
                    >
                      <CheckCircle className="h-4 w-4" /> Tasdiqlash
                    </button>
                  )}
                  <button
                    onClick={() => handleBlockStatus(selectedDriver.uid, selectedDriver.isBlocked)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-white ${
                      selectedDriver.isBlocked ? "bg-gray-500 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    {selectedDriver.isBlocked ? "Blokdan chiqarish" : "Bloklash"}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-gray-700">Hujjatlar</h3>

                <div className="space-y-2">
                  <p className="text-sm text-gray-500 font-medium">Haydovchilik guvohnomasi:</p>
                  <img src={selectedDriver.drivingLicensePhotoUrl} alt="Guvohnoma" className="h-40 w-full rounded-md border object-cover cursor-zoom-in" onClick={() => window.open(selectedDriver.drivingLicensePhotoUrl)} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-500 font-medium">Litsenziya varaqasi (Sariq litsenziya):</p>
                  <img src={selectedDriver.taxiLicensePhotoUrl} alt="Litsenziya" className="h-40 w-full rounded-md border object-cover cursor-zoom-in" onClick={() => window.open(selectedDriver.taxiLicensePhotoUrl)} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-500 font-medium">Texpasport:</p>
                  <img src={selectedDriver.techPassportPhotoUrl} alt="Texpasport" className="h-40 w-full rounded-md border object-cover cursor-zoom-in" onClick={() => window.open(selectedDriver.techPassportPhotoUrl)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

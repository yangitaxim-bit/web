"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs
} from "firebase/firestore";
import { User, Order } from "@/types/models";
import { Search, ShieldAlert, ShieldCheck } from "lucide-react";

interface PassengerStats extends User {
  totalTrips: number;
  totalSpent: number;
}

export default function PassengersPage() {
  const [passengers, setPassengers] = useState<PassengerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "passenger"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const passengerList: PassengerStats[] = [];

      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data() as User;

        // Fetch order stats for this passenger
        const ordersQuery = query(collection(db, "orders"), where("passengerId", "==", userData.uid), where("status", "==", "completed"));
        const ordersSnap = await getDocs(ordersQuery);

        let totalSpent = 0;
        ordersSnap.docs.forEach(d => {
          totalSpent += (d.data() as Order).price;
        });

        passengerList.push({
          ...userData,
          totalTrips: ordersSnap.size,
          totalSpent: totalSpent
        });
      }

      setPassengers(passengerList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredPassengers = passengers.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.phoneNumber.includes(search)
  );

  const handleBlockStatus = async (uid: string, currentStatus: boolean) => {
    if (!confirm(`Haqiqatan ham ushbu foydalanuvchini ${currentStatus ? "blokdan chiqarmoqchimisiz?" : "bloklamoqchimisiz?"}`)) return;

    try {
      await updateDoc(doc(db, "users", uid), {
        isBlocked: !currentStatus
      });
    } catch (err) {
      alert("Xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Yo'lovchilar nazorati</h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Ism yoki telefon..."
            className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:border-amber-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">Yuklanmoqda...</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Yo'lovchi</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ro'yxatdan o'tgan</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Safarlar</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Jami sarf</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Holat</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredPassengers.map((p) => (
                <tr key={p.uid} className={`hover:bg-gray-50 ${p.isBlocked ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{p.fullName}</div>
                    <div className="text-sm text-gray-500">{p.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {p.createdAt?.toDate().toLocaleDateString('uz-UZ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{p.totalTrips} ta</td>
                  <td className="px-6 py-4 text-sm text-green-600 font-bold">
                    {p.totalSpent.toLocaleString()} UZS
                  </td>
                  <td className="px-6 py-4">
                    {p.isBlocked ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        Bloklangan
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Faol
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleBlockStatus(p.uid, p.isBlocked)}
                      className={`inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-semibold transition-colors ${
                        p.isBlocked
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {p.isBlocked ? (
                        <><ShieldCheck className="h-3 w-3" /> Blokdan chiqarish</>
                      ) : (
                        <><ShieldAlert className="h-3 w-3" /> Bloklash</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPassengers.length === 0 && (
            <div className="p-8 text-center text-gray-500">Foydalanuvchilar topilmadi.</div>
          )}
        </div>
      )}
    </div>
  );
}

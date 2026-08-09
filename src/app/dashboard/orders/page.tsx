"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  Timestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { Order, User } from "@/types/models";
import {
  Search,
  Filter,
  Calendar,
  Eye,
  MapPin,
  Navigation,
  ArrowRight
} from "lucide-react";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [usersCache, setUsersCache] = useState<Record<string, string>>({});

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyC5zNz0WXECfkBmiIa9N_lOtx-Mty3o4JU"
  });

  useEffect(() => {
    let q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

    if (statusFilter !== "all") {
      q = query(collection(db, "orders"), where("status", "==", statusFilter), orderBy("createdAt", "desc"));
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const ordersList = snapshot.docs.map(doc => doc.data() as Order);
      setOrders(ordersList);

      // Prefetch user names to avoid blank fields
      const newCache = { ...usersCache };
      for (const order of ordersList) {
        if (order.passengerId && !newCache[order.passengerId]) {
          const uDoc = await getDoc(doc(db, "users", order.passengerId));
          if (uDoc.exists()) newCache[order.passengerId] = (uDoc.data() as User).fullName;
        }
        if (order.driverId && !newCache[order.driverId]) {
          const uDoc = await getDoc(doc(db, "users", order.driverId));
          if (uDoc.exists()) newCache[order.driverId] = (uDoc.data() as User).fullName;
        }
      }
      setUsersCache(newCache);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      searching: "bg-blue-100 text-blue-700",
      accepted: "bg-yellow-100 text-yellow-700",
      in_progress: "bg-purple-100 text-purple-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100"}`}>
        {status.toUpperCase().replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Buyurtmalar monitoringi</h1>
        <div className="flex gap-4">
          <select
            className="rounded-md border border-gray-300 px-4 py-2 focus:border-amber-500 focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Barcha holatlar</option>
            <option value="searching">Qidirilmoqda</option>
            <option value="accepted">Qabul qilindi</option>
            <option value="in_progress">Yo'lda</option>
            <option value="completed">Yakunlandi</option>
            <option value="cancelled">Bekor qilindi</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">Yuklanmoqda...</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium uppercase">Vaqt</th>
                <th className="px-6 py-3 text-left font-medium uppercase">Yo'lovchi</th>
                <th className="px-6 py-3 text-left font-medium uppercase">Haydovchi</th>
                <th className="px-6 py-3 text-left font-medium uppercase">Yo'nalish</th>
                <th className="px-6 py-3 text-left font-medium uppercase">Narx / Kom</th>
                <th className="px-6 py-3 text-left font-medium uppercase">Holat</th>
                <th className="px-6 py-3 text-right font-medium uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.orderId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {order.createdAt?.toDate().toLocaleString('uz-UZ', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{usersCache[order.passengerId] || 'Yuklanmoqda...'}</td>
                  <td className="px-6 py-4 text-gray-600">{order.driverId ? (usersCache[order.driverId] || 'Yuklanmoqda...') : '-'}</td>
                  <td className="px-6 py-4 max-w-xs truncate">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-amber-600">A</span> {order.pickupAddress.split(',')[0]}
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-blue-600">B</span> {order.destinationAddress.split(',')[0]}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{order.price.toLocaleString()}</div>
                    <div className="text-[10px] text-red-500">{order.commissionAmount.toLocaleString()} UZS</div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedOrder(order)} className="text-amber-500 hover:text-amber-700">
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-0 shadow-2xl overflow-hidden">
            <div className="flex flex-col lg:flex-row h-[80vh]">
              {/* Left Side: Details */}
              <div className="w-full lg:w-1/3 p-8 overflow-y-auto border-r bg-gray-50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Buyurtma #{selectedOrder.orderId.slice(-6)}</h2>
                  <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
                </div>

                <div className="space-y-6">
                  <div>
                    {getStatusBadge(selectedOrder.status)}
                    <p className="text-xs text-gray-500 mt-2 italic">{selectedOrder.createdAt.toDate().toLocaleString()}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-amber-600 mt-1 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 font-bold">Chiqish manzili</p>
                        <p className="text-sm font-medium">{selectedOrder.pickupAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Navigation className="h-5 w-5 text-blue-600 mt-1 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 font-bold">Borish manzili</p>
                        <p className="text-sm font-medium">{selectedOrder.destinationAddress}</p>
                      </div>
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-2 gap-4">
                    <DetailBox label="Masofa" value={`${selectedOrder.distanceKm} km`} />
                    <DetailBox label="Vaqt" value={`${selectedOrder.durationMin} min`} />
                    <DetailBox label="Narx" value={`${selectedOrder.price.toLocaleString()} UZS`} highlight />
                    <DetailBox label="Komissiya" value={`${selectedOrder.commissionAmount.toLocaleString()} UZS`} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase">Ishtirokchilar</p>
                    <div className="rounded-lg bg-white p-3 border">
                      <p className="text-sm"><strong>Yo'lovchi:</strong> {usersCache[selectedOrder.passengerId]}</p>
                      {selectedOrder.driverId && <p className="text-sm"><strong>Haydovchi:</strong> {usersCache[selectedOrder.driverId]}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Mini Map */}
              <div className="flex-1 relative bg-gray-200">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: selectedOrder.pickupLat, lng: selectedOrder.pickupLng }}
                    zoom={13}
                    options={MAP_OPTIONS}
                  >
                    <Marker position={{ lat: selectedOrder.pickupLat, lng: selectedOrder.pickupLng }} label="A" />
                    <Marker position={{ lat: selectedOrder.destinationLat, lng: selectedOrder.destinationLng }} label="B" />
                    <Polyline
                      path={[
                        { lat: selectedOrder.pickupLat, lng: selectedOrder.pickupLng },
                        { lat: selectedOrder.destinationLat, lng: selectedOrder.destinationLng }
                      ]}
                      options={{ strokeColor: "#FFB300", strokeWeight: 6, strokeOpacity: 0.8 }}
                    />
                  </GoogleMap>
                ) : (
                  <div className="h-full flex items-center justify-center">Xarita yuklanmoqda...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBox({ label, value, highlight = false }: any) {
  return (
    <div className="bg-white p-3 rounded-lg border shadow-sm">
      <p className="text-[10px] text-gray-400 uppercase font-bold">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-amber-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

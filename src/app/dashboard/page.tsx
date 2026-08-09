"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  getCountFromServer
} from "firebase/firestore";
import { Driver, Order } from "@/types/models";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline
} from "@react-google-maps/api";
import { Users, Truck, ShoppingBag, Banknote } from "lucide-react";

const SIRDARYO_CENTER = { lat: 40.5, lng: 68.6 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '500px' };

export default function DashboardPage() {
  const [onlineDrivers, setOnlineDrivers] = useState<Driver[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    todayOrders: 0,
    platformIncome: 0,
    totalPassengers: 0,
    onlineDriversCount: 0
  });

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY_HERE"
  });

  useEffect(() => {
    // 1. Listen to online drivers
    const driversQuery = query(collection(db, "drivers"), where("isOnline", "==", true));
    const unsubscribeDrivers = onSnapshot(driversQuery, (snapshot) => {
      const drivers = snapshot.docs.map(doc => doc.data() as Driver);
      setOnlineDrivers(drivers);
      setStats(prev => ({ ...prev, onlineDriversCount: drivers.length }));
    });

    // 2. Listen to active orders (in_progress)
    const activeOrdersQuery = query(collection(db, "orders"), where("status", "==", "in_progress"));
    const unsubscribeActiveOrders = onSnapshot(activeOrdersQuery, (snapshot) => {
      setActiveOrders(snapshot.docs.map(doc => doc.data() as Order));
    });

    // 3. Stats for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    const todayOrdersQuery = query(
      collection(db, "orders"),
      where("createdAt", ">=", todayTimestamp)
    );

    const unsubscribeTodayStats = onSnapshot(todayOrdersQuery, (snapshot) => {
      let income = 0;
      let count = 0;
      snapshot.docs.forEach(doc => {
        const order = doc.data() as Order;
        count++;
        if (order.status === "completed") {
          income += order.commissionAmount;
        }
      });
      setStats(prev => ({ ...prev, todayOrders: count, platformIncome: income }));
    });

    // 4. Total passengers count (one-time fetch or separate listener)
    const passengersQuery = query(collection(db, "users"), where("role", "==", "passenger"));
    getCountFromServer(passengersQuery).then(snapshot => {
      setStats(prev => ({ ...prev, totalPassengers: snapshot.data().count }));
    });

    return () => {
      unsubscribeDrivers();
      unsubscribeActiveOrders();
      unsubscribeTodayStats();
    };
  }, []);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
  }), []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Platforma Boshqaruv Paneli</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Bugungi Buyurtmalar"
          value={stats.todayOrders}
          icon={ShoppingBag}
          color="bg-blue-500"
        />
        <StatCard
          label="Platforma Daromadi"
          value={`${stats.platformIncome.toLocaleString()} UZS`}
          icon={Banknote}
          color="bg-amber-500"
        />
        <StatCard
          label="Onlayn Haydovchilar"
          value={stats.onlineDriversCount}
          icon={Truck}
          color="bg-green-500"
        />
        <StatCard
          label="Jami Yo'lovchilar"
          value={stats.totalPassengers}
          icon={Users}
          color="bg-purple-500"
        />
      </div>

      {/* Live Map */}
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">Jonli Xarita (Sirdaryo Viloyati)</h2>
          <span className="flex items-center text-sm text-green-500">
            <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
            Real-vaqt rejimida
          </span>
        </div>

        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={SIRDARYO_CENTER}
            zoom={9}
            options={mapOptions}
          >
            {/* Online Drivers Markers */}
            {onlineDrivers.map(driver => (
              driver.currentLat && driver.currentLng && (
                <Marker
                  key={driver.uid}
                  position={{ lat: driver.currentLat, lng: driver.currentLng }}
                  icon={{
                    url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  }}
                  title={driver.carModel}
                />
              )
            ))}

            {/* Active Order Routes */}
            {activeOrders.map(order => (
              <Polyline
                key={order.orderId}
                path={[
                  { lat: order.pickupLat, lng: order.pickupLng },
                  { lat: order.destinationLat, lng: order.destinationLng }
                ]}
                options={{
                  strokeColor: "#FFB300",
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                }}
              />
            ))}
          </GoogleMap>
        ) : (
          <div className="flex h-[500px] items-center justify-center bg-gray-50">
            <p className="text-gray-500">Xarita yuklanmoqda...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-black text-slate-800">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${color} text-white shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className={`absolute -right-4 -bottom-4 opacity-5 ${color} text-white transition-transform group-hover:scale-110`}>
        <Icon size={100} />
      </div>
    </div>
  );
}

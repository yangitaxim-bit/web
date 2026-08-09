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
import { Users, Truck, ShoppingBag, Banknote, Database } from "lucide-react";
import { setDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";

const SIRDARYO_CENTER = { lat: 40.5, lng: 68.6 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '500px' };

export default function DashboardPage() {
  const [onlineDrivers, setOnlineDrivers] = useState<Driver[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [stats, setStats] = useState({
    todayOrders: 0,
    platformIncome: 0,
    totalPassengers: 0,
    onlineDriversCount: 0
  });

  const generateDemoData = async () => {
    setSeeding(true);
    try {
      // 1. Global Settings
      await setDoc(doc(db, "settings", "global"), {
        baseFare: 5000,
        pricePerKm: 1500,
        commissionPercent: 10,
        currency: "UZS"
      });

      // 2. Demo Drivers
      const demoDrivers = [
        { name: "Alijon Valiyev", car: "Chevrolet Gentra", plate: "20 A 777 AA", lat: 40.51, lng: 68.65 },
        { name: "Otabek G'aniyev", car: "Chevrolet Cobalt", plate: "20 B 123 BB", lat: 40.49, lng: 68.60 },
        { name: "Sardor Azimov", car: "Daewoo Nexia 3", plate: "20 C 456 CC", lat: 40.52, lng: 68.68 }
      ];

      for (const d of demoDrivers) {
        const dId = "demo_driver_" + Math.random().toString(36).slice(2, 7);
        await setDoc(doc(db, "users", dId), {
          fullName: d.name,
          phoneNumber: "+998901234567",
          role: "driver",
          isBlocked: false,
          createdAt: serverTimestamp()
        });
        await setDoc(doc(db, "drivers", dId), {
          uid: dId,
          carModel: d.car,
          carPlateNumber: d.plate,
          isApproved: true,
          isOnline: true,
          currentLat: d.lat,
          currentLng: d.lng,
          rating: 4.9,
          totalTrips: 150
        });
      }

      // 3. Demo Orders
      for (let i = 0; i < 5; i++) {
        await addDoc(collection(db, "orders"), {
          orderId: "demo_order_" + i,
          passengerId: "demo_p_" + i,
          driverId: "demo_driver_1",
          pickupLat: 40.5,
          pickupLng: 68.6,
          pickupAddress: "Guliston sh., Markaz",
          destinationLat: 40.55,
          destinationLng: 68.7,
          destinationAddress: "Yangiyer yo'li",
          price: 15000 + (i * 2000),
          commissionAmount: 1500 + (i * 200),
          status: i % 2 === 0 ? "completed" : "in_progress",
          createdAt: serverTimestamp()
        });
      }
      alert("Demo ma'lumotlar muvaffaqiyatli yaratildi!");
    } catch (e) {
      console.error(e);
      alert("Xatolik yuz berdi");
    } finally {
      setSeeding(false);
    }
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyC5zNz0WXECfkBmiIa9N_lOtx-Mty3o4JU"
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Platforma Boshqaruv Paneli</h1>
        <button
          onClick={generateDemoData}
          disabled={seeding}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 transition-all disabled:opacity-50"
        >
          <Database className="h-4 w-4 text-amber-500" />
          {seeding ? "Yaratilmoqda..." : "Demo Ma'lumotlarni Yaratish"}
        </button>
      </div>

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

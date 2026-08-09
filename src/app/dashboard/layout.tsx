"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  LayoutDashboard,
  Users,
  Truck,
  ShoppingBag,
  Settings,
  BarChart3,
  LogOut
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { name: "Asosiy", href: "/dashboard", icon: LayoutDashboard },
    { name: "Haydovchilar", href: "/dashboard/drivers", icon: Truck },
    { name: "Yo'lovchilar", href: "/dashboard/passengers", icon: Users },
    { name: "Buyurtmalar", href: "/dashboard/orders", icon: ShoppingBag },
    { name: "Tariflar", href: "/dashboard/rates", icon: Settings },
    { name: "Hisobotlar", href: "/dashboard/reports", icon: BarChart3 },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-72 bg-slate-900 text-white shadow-2xl z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-slate-900 italic">S</div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white leading-none">Sirdaryo<span className="text-amber-500 italic block text-sm tracking-widest mt-1">TAXI ADMIN</span></h2>
          </div>
        </div>

        <nav className="mt-8 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 transition-colors ${isActive ? "text-slate-900" : "text-slate-500 group-hover:text-amber-500"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-4 rounded-xl text-red-400 font-bold transition-all hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/20"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Tizimdan chiqish
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-10 min-h-screen">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>
    </div>
  );
}

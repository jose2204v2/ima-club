"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/client";
import { useRouter } from "next/navigation";
import { useMemo, useEffect, useState, useRef } from "react";
import TutorialModal from "./TutorialModal";
import ToastContainer from "./components/ToastContainer";

type Notification = {
  id: string;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const channel = supabase
      .channel('notificaciones-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { name: "Inicio", path: "/dashboard", icon: "📊" },
    { name: "Leads (CRM)", path: "/dashboard/leads", icon: "🎯" },
    { name: "Barcos", path: "/dashboard/boats", icon: "🚤" },
    { name: "Calendario", path: "/dashboard/calendar", icon: "📅" },
    { name: "Clientes", path: "/dashboard/clients", icon: "👥" },
    { name: "Propuestas", path: "/dashboard/proposals", icon: "📋" },
    { name: "Reservas", path: "/dashboard/reservations", icon: "✅" },
    { name: "Pagos", path: "/dashboard/payments", icon: "💶" },
    { name: "Extras", path: "/dashboard/extras", icon: "🍾" },
    { name: "Marketing", path: "/dashboard/marketing", icon: "📸" },
    { name: "Reportes", path: "/dashboard/reports", icon: "📈" },
    { name: "Configuración", path: "/dashboard/config", icon: "⚙️" },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
      
      {/* FONDO OSCURO PARA EL MENÚ MÓVIL */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR (Menú Lateral) */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-slate-950 flex flex-col border-r border-slate-800 shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⛵</span>
            <div>
              <h1 className="text-xl font-bold leading-tight">IMA Club</h1>
              <p className="text-xs text-slate-400">Plataforma SaaS</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)} // <-- SE CIERRA AL HACER CLIC
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            <span>🚪</span>
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-50">
          
          <div className="flex items-center gap-4">
            {/* BOTÓN HAMBURGUESA */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-medium text-slate-300 hidden sm:block">Panel de Control</h2>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            {/* CAMPANA DE NOTIFICACIONES */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800 focus:outline-none"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                    <h3 className="font-bold text-white">Notificaciones</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-blue-400 hover:text-blue-300">
                        Marcar leídas
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-sm text-slate-500">No tienes notificaciones.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-4 border-b border-slate-700/50 text-sm ${!n.is_read ? 'bg-slate-800/80' : 'bg-transparent opacity-70'}`}>
                          <p className="text-slate-200">{n.content}</p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
              U
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children} 
        </div>
      </main>

      <TutorialModal />
      <ToastContainer />
    </div>
  );
}
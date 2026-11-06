"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { showToast } from "@/utils/toast"; // <-- IMPORTAMOS EL TOAST

type Boat = { id: string; name: string; };
type Post = {
  id: string;
  title: string;
  platform: string;
  content: string;
  boat_id: string | null;
  status: string;
  scheduled_date: string | null;
  boats: { name: string } | null;
};

const COLUMNS = [
  { id: 'idea', title: '💡 Ideas', color: 'border-slate-600' },
  { id: 'borrador', title: '✍️ Borradores', color: 'border-blue-600' },
  { id: 'programado', title: '📅 Programado', color: 'border-yellow-600' },
  { id: 'publicado', title: '✅ Publicado', color: 'border-green-600' },
];

export default function MarketingPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [content, setContent] = useState("");
  const [boatId, setBoatId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchData = async () => {
    const [postsRes, boatsRes] = await Promise.all([
      supabase.from("marketing_posts").select(`*, boats (name)`).order("created_at", { ascending: false }),
      supabase.from("boats").select("id, name").eq("is_active", true)
    ]);

    if (postsRes.error) {
      setError(postsRes.error.message);
      showToast("Error al cargar el tablero", "error");
    } else {
      setPosts(postsRes.data || []);
    }

    if (boatsRes.data) setBoats(boatsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    const load = async () => { if (active) await fetchData(); };
    const timer = setTimeout(load, 0);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("marketing_posts").insert([{
      title, platform, content,
      boat_id: boatId || null,
      scheduled_date: scheduledDate || null,
      status: 'idea'
    }]);

    if (error) {
      showToast("Error: " + error.message, "error");
    } else {
      setTitle(""); setContent(""); setBoatId(""); setScheduledDate("");
      setIsModalOpen(false);
      await fetchData();
      showToast("Idea añadida al tablero", "success");
    }
    setSaving(false);
  };

  const movePost = async (postId: string, newStatus: string) => {
    await supabase.from("marketing_posts").update({ status: newStatus }).eq("id", postId);
    await fetchData();
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("¿Eliminar esta idea de contenido?")) return;
    await supabase.from("marketing_posts").delete().eq("id", id);
    await fetchData();
    showToast("Idea eliminada", "success");
  };

  const getPlatformIcon = (plat: string) => {
    if (plat === 'Instagram') return '📸';
    if (plat === 'TikTok') return '🎵';
    if (plat === 'Web') return '💻';
    return '📱';
  };

  if (loading) return <div className="text-white p-8">Cargando tablero de marketing...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white">Centro de Marketing</h1>
          <p className="text-slate-400 mt-1">Organiza tus ideas y contenido para redes sociales.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto">
          + Nueva Idea
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg shrink-0">Error: {error}</div>}

      {/* Tablero Kanban (SCROLL HORIZONTAL PARA MOVIL) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-4 md:gap-6 h-full min-w-max pb-4">
          {COLUMNS.map(col => {
            const colPosts = posts.filter(p => p.status === col.id);
            return (
              <div key={col.id} className={`w-[280px] md:w-80 bg-slate-800/50 rounded-xl border-t-4 ${col.color} flex flex-col overflow-hidden`}>
                <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-white text-sm md:text-base">{col.title}</h3>
                  <span className="bg-slate-700 text-xs text-slate-300 px-2 py-0.5 rounded-full">{colPosts.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {colPosts.map(post => (
                    <div key={post.id} className="bg-slate-800 p-3 md:p-4 rounded-lg border border-slate-700 shadow-sm hover:border-slate-500 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] md:text-xs font-bold px-2 py-1 bg-slate-900 rounded-md text-slate-300 flex items-center gap-1">
                          {getPlatformIcon(post.platform)} {post.platform}
                        </span>
                        <button onClick={() => handleDeletePost(post.id)} className="text-slate-500 hover:text-red-500 transition-opacity">🗑️</button>
                      </div>
                      
                      <h4 className="font-bold text-white text-sm md:text-base mb-1">{post.title}</h4>
                      {post.boats && <p className="text-xs text-blue-400 mb-2">⛵ {post.boats.name}</p>}
                      <p className="text-xs md:text-sm text-slate-400 line-clamp-3 mb-3">{post.content}</p>
                      
                      {post.scheduled_date && (
                        <p className="text-[10px] md:text-xs text-yellow-500 mb-2">📅 {post.scheduled_date}</p>
                      )}

                      {/* Botones para mover de estado */}
                      <div className="flex gap-1 mt-auto pt-2 border-t border-slate-700/50">
                        {col.id !== 'idea' && (
                          <button onClick={() => movePost(post.id, COLUMNS[COLUMNS.findIndex(c => c.id === col.id) - 1].id)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded">←</button>
                        )}
                        {col.id !== 'publicado' && (
                          <button onClick={() => movePost(post.id, COLUMNS[COLUMNS.findIndex(c => c.id === col.id) + 1].id)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded ml-auto">→</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {colPosts.length === 0 && (
                    <div className="text-center py-8 text-slate-600 text-xs md:text-sm italic border-2 border-dashed border-slate-700 rounded-lg">
                      Arrastra o crea una idea aquí
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL NUEVA IDEA (Adaptado para móvil) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 shrink-0">
              <h2 className="text-xl font-bold text-white">Nueva Idea de Contenido</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddPost} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Título de la idea</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Reel atardecer en Saxdor" className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Plataforma</label>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500">
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Web">Página Web</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Barco (Opcional)</label>
                  <select value={boatId} onChange={(e) => setBoatId(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500">
                    <option value="">Ninguno</option>
                    {boats.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Contenido / Caption / Idea</label>
                <textarea required rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escribe el texto del post o la idea..." className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Fecha programada (Opcional)</label>
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors disabled:opacity-50 order-1 sm:order-2">
                  {saving ? "Guardando..." : "Guardar Idea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
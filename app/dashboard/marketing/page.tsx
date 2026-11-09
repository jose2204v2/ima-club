"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/utils/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Camera, Video, Globe, Anchor,
  ArrowLeft, ArrowRight, X, Lightbulb, PenTool, Calendar, CheckCircle2 
} from "lucide-react";

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
  { id: 'idea', title: 'Ideas', icon: Lightbulb, color: 'text-amber-400', border: 'border-amber-500/30' },
  { id: 'borrador', title: 'Borradores', icon: PenTool, color: 'text-blue-400', border: 'border-blue-500/30' },
  { id: 'programado', title: 'Programado', icon: Calendar, color: 'text-purple-400', border: 'border-purple-500/30' },
  { id: 'publicado', title: 'Publicado', icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/30' },
];

export default function MarketingPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [content, setContent] = useState("");
  const [boatId, setBoatId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const [postsRes, boatsRes] = await Promise.all([
      supabase.from("marketing_posts").select(`*, boats (name)`).order("created_at", { ascending: false }),
      supabase.from("boats").select("id, name").eq("is_active", true)
    ]);

    if (postsRes.error) {
      setError(postsRes.error.message);
      toast.error("Error al cargar el tablero");
    } else {
      setPosts(postsRes.data || []);
    }

    if (boatsRes.data) setBoats(boatsRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const load = async () => { if (active) await fetchData(); };
    const timer = setTimeout(load, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [fetchData]);

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
      toast.error("Error: " + error.message);
    } else {
      setTitle(""); setContent(""); setBoatId(""); setScheduledDate("");
      setIsModalOpen(false);
      await fetchData();
      toast.success("Idea añadida al tablero");
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
    toast.success("Idea eliminada");
  };

  const getPlatformIcon = (plat: string) => {
    if (plat === 'Instagram') return <Camera size={14} className="text-pink-400" />;
    if (plat === 'TikTok') return <Video size={14} className="text-slate-200" />;
    if (plat === 'Web') return <Globe size={14} className="text-blue-400" />;
    return <Globe size={14} />;
  };

  if (loading) return <div className="text-white p-8">Cargando tablero de marketing...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Centro de Marketing</h1>
          <p className="text-slate-400 mt-1">Organiza tus ideas y contenido para redes sociales.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] w-full sm:w-auto flex items-center justify-center gap-2">
          <Plus size={18} /> Nueva Idea
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg shrink-0">Error: {error}</div>}

      {/* Tablero Kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden -mx-4 px-4 md:mx-0 md:px-0 custom-scrollbar">
        <div className="flex gap-4 md:gap-6 h-full min-w-max pb-4">
          {COLUMNS.map(col => {
            const colPosts = posts.filter(p => p.status === col.id);
            const Icon = col.icon;
            return (
              <div key={col.id} className="w-[280px] md:w-80 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col overflow-hidden">
                <div className={`p-4 border-b border-white/10 flex justify-between items-center shrink-0 bg-white/5`}>
                  <h3 className={`font-bold text-sm md:text-base flex items-center gap-2 ${col.color}`}>
                    <Icon size={16} /> {col.title}
                  </h3>
                  <span className="bg-white/10 text-xs text-slate-300 px-2 py-0.5 rounded-full">{colPosts.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  <AnimatePresence>
                    {colPosts.map(post => (
                      <motion.div 
                        key={post.id} 
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm hover:border-white/20 transition-colors group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] md:text-xs font-bold px-2 py-1 bg-[#0f172a] rounded-md text-slate-300 flex items-center gap-1 border border-white/5">
                            {getPlatformIcon(post.platform)} {post.platform}
                          </span>
                          <button onClick={() => handleDeletePost(post.id)} className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        <h4 className="font-bold text-white text-sm mb-1">{post.title}</h4>
                        {post.boats && <p className="text-xs text-blue-400 mb-2 flex items-center gap-1"><Anchor size={10}/> {post.boats.name}</p>}
                        <p className="text-xs text-slate-400 line-clamp-3 mb-3">{post.content}</p>
                        
                        {post.scheduled_date && (
                          <p className="text-[10px] text-amber-400 mb-2 flex items-center gap-1"><Calendar size={10}/> {post.scheduled_date}</p>
                        )}

                        <div className="flex gap-2 mt-auto pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {col.id !== 'idea' && (
                            <button onClick={() => movePost(post.id, COLUMNS[COLUMNS.findIndex(c => c.id === col.id) - 1].id)} className="bg-white/5 hover:bg-white/10 text-white p-1.5 rounded-md transition-colors"><ArrowLeft size={14}/></button>
                          )}
                          {col.id !== 'publicado' && (
                            <button onClick={() => movePost(post.id, COLUMNS[COLUMNS.findIndex(c => c.id === col.id) + 1].id)} className="bg-white/5 hover:bg-white/10 text-white p-1.5 rounded-md transition-colors ml-auto"><ArrowRight size={14}/></button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {colPosts.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-xs border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center gap-2">
                      <Icon size={24} className="opacity-50" />
                      <span>Sin ideas aquí</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL NUEVA IDEA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold text-white">Nueva Idea de Contenido</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPost} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Título</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Reel atardecer" className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Plataforma</label>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors">
                    <option value="Instagram" className="bg-slate-800">Instagram</option>
                    <option value="TikTok" className="bg-slate-800">TikTok</option>
                    <option value="Web" className="bg-slate-800">Página Web</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Barco (Opcional)</label>
                  <select value={boatId} onChange={(e) => setBoatId(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors">
                    <option value="">Ninguno</option>
                    {boats.map(b => <option key={b.id} value={b.id} className="bg-slate-800">{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Contenido / Caption</label>
                <textarea required rows={4} value={content} onChange={(e) => setContent(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors resize-none custom-scrollbar" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Fecha programada</label>
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-lg transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 order-1 sm:order-2">
                  {saving ? "Guardando..." : "Guardar Idea"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
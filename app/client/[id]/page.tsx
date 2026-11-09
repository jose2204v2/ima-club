"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/utils/client";
import { useParams } from "next/navigation";
import { toast, Toaster } from "sonner"; 
import { Anchor, Calendar, Clock, CheckCircle2, MessageSquare, Send, Check } from "lucide-react";
import { motion } from "framer-motion";

type Proposal = {
  id: string;
  date: string;
  time_slot: string;
  total_price: number;
  status: string;
  boats: { name: string } | null;
};

type Message = {
  id: string;
  sender_type: string;
  content: string;
  created_at: string;
};

export default function ClientPortalPage() {
  const params = useParams();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: prop, error: propError } = await supabase.from("proposals").select(`*, boats (name)`).eq("id", proposalId).single();
        if (propError) throw new Error("Error al cargar propuesta: " + propError.message);
        if (prop) setProposal(prop);

        const { data: initialConvs, error: convError } = await supabase.from("conversations").select("id").eq("proposal_id", proposalId).limit(1);
        if (convError) throw new Error("Error al buscar chat: " + convError.message);

        let conv = initialConvs && initialConvs.length > 0 ? initialConvs[0] : null;
        if (!conv) {
          const { data: newConv, error: createError } = await supabase.from("conversations").insert([{ proposal_id: proposalId }]).select("id").single();
          if (createError) throw new Error("Error al crear chat: " + createError.message);
          conv = newConv;
        }

        if (conv) {
          setConversationId(conv.id);
          const { data: msgs, error: msgsError } = await supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true });
          if (msgsError) throw new Error("Error al cargar mensajes: " + msgsError.message);
          setMessages(msgs || []);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar el portal");
      } finally {
        setLoading(false);
      }
    };
    if (proposalId) loadData();
  }, [proposalId, supabase]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`chat-client-${conversationId}`).on(
      'postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (!prev.find(m => m.id === newMsg.id)) return [...prev, newMsg];
          return prev;
        });
      }
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;
    setSending(true);
    const msgContent = newMessage;
    setNewMessage("");

    const { data, error } = await supabase.from("messages").insert([{
      conversation_id: conversationId, sender_type: "client", content: msgContent
    }]).select().single();

    if (error) {
      toast.error("Error al enviar: " + error.message);
      setNewMessage(msgContent);
    } else if (data) {
      setMessages((prev) => {
        if (!prev.find(m => m.id === data.id)) return [...prev, data];
        return prev;
      });
    }
    setSending(false);
  };

  const handleAccept = async () => {
    if (!window.confirm("¿Aceptas esta propuesta oficialmente?")) return;
    await supabase.from("proposals").update({ status: 'aceptada' }).eq("id", proposalId);
    setProposal(prev => prev ? { ...prev, status: 'aceptada' } : null);
    await supabase.from("notifications").insert([{ type: "propuesta_aceptada", content: `¡El cliente ha aceptado la propuesta del ${proposal?.boats?.name}!` }]);
    toast.success("¡Propuesta aceptada! Nos pondremos en contacto contigo.");
  };

  if (loading) return <div className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center">Cargando tu propuesta...</div>;
  if (!proposal) return <div className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center px-4 text-center">Propuesta no encontrada o expirada.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1120] via-[#111827] to-[#0B1120] text-white flex flex-col items-center py-8 md:py-12 px-4 selection:bg-blue-500/30">
      <Toaster theme="dark" position="bottom-right" richColors />
      
      <div className="w-full max-w-3xl space-y-6">
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4 md:mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 flex items-center justify-center gap-3 tracking-tight">
            <Anchor className="text-blue-500" size={40} /> IMA Club
          </h1>
          <p className="text-sm md:text-base text-slate-400">Tu propuesta de charter exclusivo</p>
        </motion.div>

        {/* TARJETA DE PROPUESTA CRISTAL */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 backdrop-blur-2xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
            <div>
              <p className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-wider">Embarcación</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{proposal.boats?.name}</h2>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto bg-[#0f172a] sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-0 border-white/5">
              <p className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-wider">Precio Total</p>
              <p className="text-3xl md:text-4xl font-bold text-emerald-400 tracking-tight">{Number(proposal.total_price).toLocaleString('es-ES')} €</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-[#0f172a] p-5 rounded-2xl mb-8 border border-white/5">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> Fecha</p>
              <p className="font-medium text-slate-200">{proposal.date}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Clock size={12}/> Horario</p>
              <p className="font-medium text-slate-200">{proposal.time_slot}</p>
            </div>
          </div>

          {proposal.status === 'borrador' ? (
            <button onClick={handleAccept} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all duration-300 text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] flex items-center justify-center gap-2">
              <CheckCircle2 size={24} /> Aceptar Propuesta
            </button>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-xl text-center">
              <p className="text-emerald-400 font-bold text-lg flex items-center justify-center gap-2"><Check size={20}/> ¡Propuesta Aceptada!</p>
              <p className="text-sm text-slate-300 mt-1">Nos pondremos en contacto contigo para el pago.</p>
            </div>
          )}
        </motion.div>

        {/* CHAT CRISTAL */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[calc(100vh-400px)] min-h-[350px] md:h-[450px] shadow-2xl">
          <div className="p-5 border-b border-white/10 bg-white/5 shrink-0 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><MessageSquare size={18}/></div>
            <div>
              <h3 className="font-bold text-white text-sm md:text-base">Habla con tu agente</h3>
              <p className="text-[10px] md:text-xs text-slate-400">Resuelve cualquier duda sobre tu reserva.</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 && <p className="text-center text-slate-500 text-sm mt-4">Envía un mensaje para comenzar.</p>}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 md:p-4 rounded-2xl text-sm ${
                  msg.sender_type === 'client' 
                    ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-600/20' 
                    : 'bg-white/10 text-slate-200 rounded-bl-none border border-white/5'
                }`}>
                  <p>{msg.content}</p>
                  <span className="text-[10px] opacity-70 block mt-1 text-right">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/5 flex gap-3 shrink-0">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe tu mensaje..." 
              className="flex-1 bg-[#0f172a] text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
            <button type="submit" disabled={sending} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center shrink-0">
              {sending ? "..." : <Send size={18} />}
            </button>
          </form>
        </motion.div>

      </div>
    </div>
  );
}
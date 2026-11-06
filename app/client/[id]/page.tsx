"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/utils/client";
import { useParams } from "next/navigation";
import { showToast } from "@/utils/toast"; // <-- IMPORTAMOS LOS TOASTS

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

  // 1. Cargar propuesta y chat
  useEffect(() => {
    const loadData = async () => {
      try {
        // Propuesta
        const { data: prop, error: propError } = await supabase
          .from("proposals")
          .select(`*, boats (name)`)
          .eq("id", proposalId)
          .single();
        
        if (propError) throw new Error("Error al cargar propuesta: " + propError.message);
        if (prop) setProposal(prop);

        // Conversación (Buscamos con limit(1) para evitar errores de duplicados)
        const { data: initialConvs, error: convError } = await supabase
          .from("conversations")
          .select("id")
          .eq("proposal_id", proposalId)
          .limit(1);

        if (convError) throw new Error("Error al buscar chat: " + convError.message);

        let conv = initialConvs && initialConvs.length > 0 ? initialConvs[0] : null;

        if (!conv) {
          // Si no existe, crearla
          const { data: newConv, error: createError } = await supabase
            .from("conversations")
            .insert([{ proposal_id: proposalId }])
            .select("id")
            .single();
          
          if (createError) throw new Error("Error al crear chat: " + createError.message);
          conv = newConv;
        }

        if (conv) {
          setConversationId(conv.id);
          // Mensajes
          const { data: msgs, error: msgsError } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true });
          
          if (msgsError) throw new Error("Error al cargar mensajes: " + msgsError.message);
          setMessages(msgs || []);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Error al cargar el portal", "error");
      } finally {
        setLoading(false);
      }
    };

    if (proposalId) loadData();
  }, [proposalId, supabase]);

  // 2. Tiempo real
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-client-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (!prev.find(m => m.id === newMsg.id)) return [...prev, newMsg];
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  // 3. Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Enviar mensaje
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    if (!conversationId) {
      showToast("El chat no se ha inicializado. Recarga la página.", "error");
      return;
    }

    setSending(true);
    const msgContent = newMessage;
    setNewMessage("");

    const { data, error } = await supabase.from("messages").insert([{
      conversation_id: conversationId,
      sender_type: "client",
      content: msgContent
    }]).select().single();

    if (error) {
      showToast("Error al enviar: " + error.message, "error");
      setNewMessage(msgContent);
    } else if (data) {
      setMessages((prev) => {
        if (!prev.find(m => m.id === data.id)) return [...prev, data];
        return prev;
      });
    }
    setSending(false);
  };

  // 5. Aceptar propuesta
  const handleAccept = async () => {
    if (!window.confirm("¿Aceptas esta propuesta oficialmente?")) return;
    
    await supabase.from("proposals").update({ status: 'aceptada' }).eq("id", proposalId);
    setProposal(prev => prev ? { ...prev, status: 'aceptada' } : null);
    
    await supabase.from("notifications").insert([{
      type: "propuesta_aceptada",
      content: `¡El cliente ha aceptado la propuesta del ${proposal?.boats?.name}!`
    }]);

    showToast("¡Propuesta aceptada! Nos pondremos en contacto contigo.", "success");
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Cargando tu propuesta...</div>;
  if (!proposal) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4 text-center">Propuesta no encontrada o expirada.</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center py-6 md:py-10 px-4">
      <div className="w-full max-w-3xl space-y-4 md:space-y-6">
        
        {/* Cabecera */}
        <div className="text-center mb-4 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">⛵ IMA Club</h1>
          <p className="text-sm md:text-base text-slate-400">Tu propuesta de charter exclusivo</p>
        </div>

        {/* Tarjeta Propuesta */}
        <div className="bg-slate-800 p-5 md:p-8 rounded-2xl border border-slate-700 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <p className="text-xs md:text-sm text-slate-400 mb-1">Embarcación</p>
              <h2 className="text-2xl md:text-3xl font-bold text-white">{proposal.boats?.name}</h2>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto bg-slate-900 sm:bg-transparent p-3 sm:p-0 rounded-lg">
              <p className="text-xs md:text-sm text-slate-400 mb-1">Precio Total</p>
              <p className="text-2xl md:text-3xl font-bold text-green-400">{Number(proposal.total_price).toLocaleString('es-ES')} €</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-900 p-4 rounded-xl mb-6">
            <div>
              <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold mb-1">Fecha</p>
              <p className="font-medium text-sm md:text-base">{proposal.date}</p>
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold mb-1">Horario</p>
              <p className="font-medium text-sm md:text-base">{proposal.time_slot}</p>
            </div>
          </div>

          {proposal.status === 'borrador' ? (
            <button onClick={handleAccept} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 md:py-4 rounded-xl transition-colors text-base md:text-lg shadow-lg shadow-blue-500/20">
              ✅ Aceptar Propuesta
            </button>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-center">
              <p className="text-green-400 font-bold text-lg">¡Propuesta Aceptada!</p>
              <p className="text-sm text-slate-300 mt-1">Nos pondremos en contacto contigo para el pago.</p>
            </div>
          )}
        </div>

        {/* Chat con el Agente */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-[60vh] md:h-[400px]">
          <div className="p-4 border-b border-slate-700 bg-slate-900 shrink-0">
            <h3 className="font-bold text-sm md:text-base">💬 Habla con tu agente</h3>
            <p className="text-[10px] md:text-xs text-slate-400">Resuelve cualquier duda sobre tu reserva.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && <p className="text-center text-slate-500 text-sm mt-4">Envía un mensaje para comenzar.</p>}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                  msg.sender_type === 'client' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'
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

          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-700 bg-slate-900 flex gap-2 shrink-0">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe tu mensaje..." 
              className="flex-1 bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 text-sm"
            />
            <button type="submit" disabled={sending} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm">
              {sending ? "..." : "Enviar"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createClient } from "@/utils/client";

type Message = {
  id: string;
  sender_type: string;
  content: string;
  created_at: string;
};

export default function ChatModal({ 
  isOpen, onClose, proposalId, clientName, onRead
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  proposalId: string; 
  clientName: string;
  onRead?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // 1. Cargar o crear la conversación
  useEffect(() => {
    if (!isOpen) return;
    
    const initChat = async () => {
      setLoading(true);
      // SOLUCIÓN: Cambiado 'let' por 'const' aquí
      const { data: convData } = await supabase
        .from("conversations")
        .select("id")
        .eq("proposal_id", proposalId)
        .limit(1);

      let conv = convData && convData.length > 0 ? convData[0] : null;

      if (!conv) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert([{ proposal_id: proposalId }])
          .select("id")
          .single();
        conv = newConv;
      }

      if (conv) {
        setConversationId(conv.id);
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });
        setMessages(msgs || []);

        // MARCAR COMO LEÍDO
        await supabase.from("conversations")
          .update({ agent_last_read_at: new Date().toISOString() })
          .eq("id", conv.id);
        if (onRead) onRead();
      }
      setLoading(false);
    };

    initChat();
  }, [isOpen, proposalId, supabase, onRead]);

  // 2. Tiempo real
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', 
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

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    setSending(true);
    const msgContent = newMessage;
    setNewMessage("");

    const { data, error } = await supabase.from("messages").insert([{
      conversation_id: conversationId,
      sender_type: "agent",
      content: msgContent
    }]).select().single();

    if (error) {
      alert("Error al enviar mensaje: " + error.message);
      setNewMessage(msgContent);
    } else if (data) {
      setMessages((prev) => {
        if (!prev.find(m => m.id === data.id)) return [...prev, data];
        return prev;
      });
    }
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[600px]">
        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900 shrink-0">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">💬 Chat con Cliente</h3>
            <p className="text-xs text-slate-400 mt-1">Propuesta: {clientName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-800">
          {loading ? (
            <p className="text-center text-slate-500 mt-10">Cargando chat...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-slate-500 mt-10 text-sm">No hay mensajes aún. Escribe el primero.</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                  msg.sender_type === 'agent' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'
                }`}>
                  <p>{msg.content}</p>
                  <span className="text-[10px] opacity-70 block mt-1 text-right">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-700 bg-slate-900 flex gap-2 shrink-0">
          <input 
            type="text" value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..." 
            className="flex-1 bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          <button type="submit" disabled={sending} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
            {sending ? "..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
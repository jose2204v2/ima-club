import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { lead } = await req.json();

    // 1. Buscar o crear el Cliente
    let clientId = "";
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('email', lead.email)
      .maybeSingle();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert([{ 
          first_name: lead.first_name, 
          last_name: lead.last_name, 
          email: lead.email, 
          phone: lead.phone 
        }])
        .select('id')
        .single();
      if (clientErr) throw new Error("Error creando cliente: " + clientErr.message);
      clientId = newClient.id;
    }

    // 2. Buscar el barco ideal
    const { data: boats } = await supabase.from('boats').select('*').eq('is_active', true);
    if (!boats || boats.length === 0) throw new Error("No hay barcos en la flota.");

    const requestedPax = parseInt(lead.personas) || 1;
    // SOLUCIÓN: Cambiado 'let' por 'const'
    const selectedBoat = boats.find(b => b.capacity >= requestedPax) || boats[0];

    // 3. Crear la Propuesta
    const proposalDate = lead.fecha || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .insert([{
        client_id: clientId,
        boat_id: selectedBoat.id,
        date: proposalDate,
        time_slot: lead.duracion || '10:00-13:30 (Morning)',
        base_price: selectedBoat.base_price,
        total_price: selectedBoat.base_price,
        status: 'borrador'
      }])
      .select('id')
      .single();

    if (propErr) throw new Error("Error creando propuesta: " + propErr.message);

    // 4. Crear el chat automáticamente
    await supabase.from('conversations').insert([{ proposal_id: proposal.id }]);

    // 5. Generar el mensaje con IA
    const portalLink = `${req.headers.get('origin')}/client/${proposal.id}`;
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Eres un agente comercial de IMA Club. Redacta un mensaje entusiasta para el cliente presentándole su propuesta formal. Incluye el enlace al final de forma amigable. No uses placeholders.' },
          { role: 'user', content: `Cliente: ${lead.first_name}. Barco: ${selectedBoat.name}. Precio: ${selectedBoat.base_price}€. Fecha: ${proposalDate}. Enlace: ${portalLink}` }
        ],
        temperature: 0.7,
      }),
    });

    const aiData = await response.json();
    const message = aiData.choices[0].message.content;

    // 6. Marcar el lead como "contactado"
    await supabase.from('leads').update({ status: 'contactado' }).eq('id', lead.id);

    return NextResponse.json({ 
      success: true, 
      proposalId: proposal.id, 
      boatName: selectedBoat.name,
      message 
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
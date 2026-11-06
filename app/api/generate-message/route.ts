import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializamos Supabase en el servidor para leer los barcos
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { lead } = await req.json();

    // 1. Traemos la flota de barcos disponibles
    const { data: boats } = await supabase
      .from('boats')
      .select('name, capacity, base_price')
      .eq('is_active', true);

    const flotaTexto = boats?.map(b => `- ${b.name} (Capacidad: ${b.capacity} pax, Precio base: ${b.base_price}€)`).join('\n') || 'No hay barcos registrados.';

    // 2. Configuramos el System Prompt con toda la lógica del cliente
    const systemPrompt = `Eres el Agente Comercial IA de IMA Club, una agencia de alquiler de yates en Ibiza.
    Tu tarea es analizar los datos de un Lead, evaluar su potencial comercial, recomendar un barco de nuestra flota y redactar un mensaje de WhatsApp/Email para el cliente.

    REGLAS ESTRICTAS:
    1. Devuelve ÚNICAMENTE un objeto JSON válido. No incluyas texto fuera del JSON.
    2. El JSON debe tener exactamente esta estructura:
    {
      "score": <número del 1 al 100 basado en presupuesto y claridad de datos>,
      "temperature": "<Caliente | Tibio | Frío>",
      "analysis": "<Breve análisis interno para el agente sobre el lead>",
      "recommended_boat": "<Nombre del barco recomendado o 'Ninguno'>",
      "objections": ["<Objeción 1 que podría tener el cliente>", "<Objeción 2>"],
      "message": "<El mensaje final listo para enviar al cliente>"
    }
    3. El "message" debe adaptarse al idioma del cliente (si el nombre o email parecen extranjeros, redacta en inglés; si no, en español).
    4. No inventes precios. Si el presupuesto es menor al precio base de los barcos, sugiere el más económico o indica que se puede ajustar.
    5. Firma el mensaje como "El equipo de IMA Club".
    6. Usa un tono entusiasta, profesional y adaptado al lujo de Ibiza con emojis marinos.`;

    const userPrompt = `Datos del Lead:
    - Nombre: ${lead.first_name} ${lead.last_name}
    - Email: ${lead.email || 'No especificado'}
    - Origen: ${lead.source}
    - Presupuesto aproximado: ${lead.budget ? lead.budget + ' €' : 'No especificado'}
    - Personas: ${lead.personas || 'No especificado'}
    - Fecha deseada: ${lead.fecha || 'No especificada'}
    - Duración: ${lead.duracion || 'No especificada'}

    Nuestra flota actual disponible:
    ${flotaTexto}

    Por favor, analiza al cliente y devuelve el JSON con el mensaje.`;

    // 3. Llamada a DeepSeek forzando salida JSON
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }, // Obliga a DeepSeek a devolver JSON
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error al conectar con DeepSeek');
    }

    const data = await response.json();
    
    // Parseamos el JSON que devuelve la IA
    const aiResponse = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(aiResponse);

  } catch (error: unknown) {
    console.error('Error en DeepSeek:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
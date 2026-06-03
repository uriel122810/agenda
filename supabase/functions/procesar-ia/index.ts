import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de preflight de CORS para admitir localhost y Netlify
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Inicializar Supabase Client usando los headers de la petición para heredar la autenticación
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Extraer parámetros (soporta texto plano o referencia al Storage)
    const { text, storagePath } = await req.json()
    let contentToProcess = text

    // Si nos pasan un path de storage, leemos el archivo
    if (storagePath) {
      const { data, error } = await supabaseClient.storage
        .from('reuniones-y-trabajos')
        .download(storagePath)
      
      if (error) throw error
      contentToProcess = await data.text()
    }

    if (!contentToProcess) {
      throw new Error("No se proveyó 'text' ni 'storagePath'")
    }

    // 3. Extraer la API Key de Gemini desde las variables de entorno (secrets)
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY no está configurada")
    }
    
    // 4. Invocar modelo económico de Gemini (gemini-1.5-flash)
    const systemPrompt = `Eres un asistente experto en analizar minutas de reuniones y datos para PazSuma. 
Debes analizar el texto proporcionado y devolver ESTRICTAMENTE un JSON con este formato:
{
  "resumenEjecutivo": "Un resumen ejecutivo conciso de la reunión o texto.",
  "datosGraficos": [
    { "nombre": "Dato 1", "valor": 100 },
    { "nombre": "Dato 2", "valor": 200 }
  ]
}
Extrae o inventa métricas numéricas razonables (ej. asistencia, tareas completadas, tiempo invertido) basadas en el texto para la sección datosGraficos. No incluyas nada más en tu respuesta.`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          { role: "user", parts: [{ text: contentToProcess }] }
        ],
        generationConfig: { 
          responseMimeType: "application/json" 
        }
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error("Error en la IA: " + err)
    }

    const aiData = await response.json()
    const textResult = aiData.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!textResult) {
      throw new Error("Respuesta de IA inesperada: " + JSON.stringify(aiData))
    }

    const resultJson = JSON.parse(textResult)

    // 5. Devolver el JSON final
    return new Response(JSON.stringify(resultJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

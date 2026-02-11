import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();

    // Fetch knowledge base using service role to bypass RLS
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: knowledgeItems } = await adminClient
      .from("ai_knowledge_base")
      .select("title, content")
      .eq("is_active", true);

    let knowledgeContext = "";
    if (knowledgeItems && knowledgeItems.length > 0) {
      knowledgeContext = "\n\nBASE DE CONHECIMENTO (use estas informações para responder):\n" +
        knowledgeItems.map((item: any) => `### ${item.title}\n${item.content}`).join("\n\n");
    }

    const SYSTEM_PROMPT = `Você é o Assistente TI da Esquadromil, especializado em suporte técnico de primeiro nível.

Suas responsabilidades:
1. Ajudar colaboradores com problemas técnicos comuns (computador, rede, impressora, sistemas, etc.)
2. Fornecer instruções claras e passo a passo
3. Identificar quando um problema precisa de intervenção do suporte TI

REGRAS IMPORTANTES:
- Seja sempre educado e profissional
- Use linguagem simples e acessível
- Forneça soluções práticas quando possível
- Quando o problema não puder ser resolvido remotamente ou precisar de intervenção técnica, sugira a abertura de um chamado

Quando identificar que é necessário abrir um chamado, responda com a seguinte estrutura JSON no final da mensagem:
\`\`\`json
{
  "sugerir_chamado": true,
  "titulo": "Título sugerido para o chamado",
  "descricao": "Descrição detalhada do problema",
  "categoria": "hardware|software|rede|acesso|outros"
}
\`\`\`

Só inclua o JSON quando realmente for necessário abrir um chamado.${knowledgeContext}`;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "Chave de API da IA não configurada. Entre em contato com o administrador." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calling AI Gateway...");

    const response = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Erro ao processar mensagem (${response.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages, autoCreateTicket, tiMode } = await req.json();

    // Auto-create ticket
    if (autoCreateTicket) {
      try {
        const { data: statuses } = await supabase.from("ticket_statuses").select("id").order("sort_order").limit(1);
        const statusId = statuses?.[0]?.id;
        if (statusId) {
          await supabase.from("tickets").insert({
            title: autoCreateTicket.titulo,
            description: autoCreateTicket.descricao,
            created_by: user.id,
            status_id: statusId,
          });
          return new Response(JSON.stringify({ message: "Chamado criado com sucesso! O time de TI foi notificado e irá resolver sua solicitação." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (ticketErr) {
        console.error("Error auto-creating ticket:", ticketErr);
      }
      return new Response(JSON.stringify({ message: "Erro ao criar chamado." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Build context based on mode
    let systemContext = "";

    if (tiMode) {
      // TI mode: fetch all system data
      const [ticketsRes, profilesRes, appointmentsRes, knowledgeRes] = await Promise.all([
        adminClient.from("tickets").select("id, title, description, status_id, urgency_id, category_id, created_by, assigned_to, created_at, closed_at").order("created_at", { ascending: false }).limit(50),
        adminClient.from("profiles").select("id, full_name, email, role, sector, is_active, last_access"),
        adminClient.from("appointments").select("id, visitor_name, scheduled_date, scheduled_time, status, user_id, vehicle_plate").order("scheduled_date", { ascending: false }).limit(30),
        adminClient.from("ai_knowledge_base").select("title, content").eq("is_active", true),
      ]);

      const [statusesRes, urgenciesRes, categoriesRes] = await Promise.all([
        adminClient.from("ticket_statuses").select("id, name").order("sort_order"),
        adminClient.from("ticket_urgencies").select("id, name").order("sort_order"),
        adminClient.from("ticket_categories").select("id, name"),
      ]);

      const statusMap = new Map((statusesRes.data || []).map((s: any) => [s.id, s.name]));
      const urgencyMap = new Map((urgenciesRes.data || []).map((u: any) => [u.id, u.name]));
      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.full_name]));

      const ticketsSummary = (ticketsRes.data || []).map((t: any) => 
        `- "${t.title}" | Status: ${statusMap.get(t.status_id) || '?'} | Urgência: ${urgencyMap.get(t.urgency_id) || 'N/A'} | Criado por: ${profileMap.get(t.created_by) || '?'} | ${t.created_at?.slice(0,10)}`
      ).join("\n");

      const usersSummary = (profilesRes.data || []).map((p: any) =>
        `- ${p.full_name} | ${p.email} | Perfil: ${p.role} | Setor: ${p.sector || 'N/A'} | Ativo: ${p.is_active ? 'Sim' : 'Não'}`
      ).join("\n");

      const appointmentsSummary = (appointmentsRes.data || []).map((a: any) =>
        `- ${a.visitor_name} | ${a.scheduled_date} ${a.scheduled_time} | Status: ${a.status} | Responsável: ${profileMap.get(a.user_id) || '?'}`
      ).join("\n");

      const knowledgeContext = (knowledgeRes.data || []).map((k: any) => `### ${k.title}\n${k.content}`).join("\n\n");

      systemContext = `\n\nDADOS DO SISTEMA EM TEMPO REAL:\n\n## CHAMADOS (últimos 50):\n${ticketsSummary || 'Nenhum chamado.'}\n\n## USUÁRIOS:\n${usersSummary || 'Nenhum usuário.'}\n\n## AGENDAMENTOS (últimos 30):\n${appointmentsSummary || 'Nenhum agendamento.'}\n\n## BASE DE CONHECIMENTO:\n${knowledgeContext || 'Vazia.'}`;
    } else {
      // Colaborador mode: knowledge base only
      const { data: knowledgeItems } = await adminClient.from("ai_knowledge_base").select("title, content").eq("is_active", true);
      if (knowledgeItems && knowledgeItems.length > 0) {
        systemContext = "\n\nBASE DE CONHECIMENTO (use estas informações para responder):\n" +
          knowledgeItems.map((item: any) => `### ${item.title}\n${item.content}`).join("\n\n");
      }
    }

    const SYSTEM_PROMPT = tiMode
      ? `Você é o Assistente IA do Painel TI da Esquadromil. Você tem acesso a todos os dados do sistema em tempo real.

Suas responsabilidades:
1. Responder perguntas sobre chamados, usuários, agendamentos e configurações
2. Fornecer análises e resumos dos dados
3. Ajudar na tomada de decisões sobre priorização de chamados
4. Identificar padrões e tendências

Seja direto, preciso e use os dados fornecidos para embasar suas respostas.${systemContext}`
      : `Você é o Assistente TI da Esquadromil, especializado em suporte técnico de primeiro nível.

Suas responsabilidades:
1. Ajudar colaboradores com problemas técnicos comuns
2. Fornecer instruções claras e passo a passo
3. Identificar quando um problema precisa de intervenção do suporte TI

REGRAS IMPORTANTES:
- Seja sempre educado e profissional
- Use linguagem simples e acessível
- Forneça soluções práticas quando possível
- Quando o problema não puder ser resolvido remotamente, sugira a abertura de um chamado

Quando identificar que é necessário abrir um chamado, responda com a seguinte estrutura JSON no final:
\`\`\`json
{
  "sugerir_chamado": true,
  "titulo": "Título sugerido para o chamado",
  "descricao": "Descrição detalhada do problema",
  "categoria": "hardware|software|rede|acesso|outros"
}
\`\`\`

Só inclua o JSON quando realmente for necessário abrir um chamado.${systemContext}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave de API da IA não configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro ao conectar com a IA." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
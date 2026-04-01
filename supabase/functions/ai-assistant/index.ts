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
          const { data: ticket } = await supabase.from("tickets").insert({
            title: autoCreateTicket.titulo,
            description: autoCreateTicket.descricao,
            created_by: user.id,
            status_id: statusId,
          }).select().single();

          if (ticket) {
            const adminClient = createClient(supabaseUrl, serviceKey);
            const { data: tiUsers } = await adminClient.from("profiles").select("id").eq("role", "ti");
            if (tiUsers) {
              for (const ti of tiUsers) {
                await adminClient.from("notifications").insert({
                  user_id: ti.id,
                  title: "Novo chamado aberto",
                  message: `${autoCreateTicket.titulo}`,
                  type: "ticket",
                  entity_type: "ticket",
                  entity_id: ticket.id,
                });
              }
            }
          }

          return new Response(JSON.stringify({ message: "Chamado criado com sucesso! O time de TI foi notificado." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (ticketErr) {
        console.error("Error auto-creating ticket:", ticketErr);
      }
      return new Response(JSON.stringify({ message: "Erro ao criar chamado." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    let systemContext = "";

    if (tiMode) {
      const [ticketsRes, profilesRes, appointmentsRes, knowledgeRes] = await Promise.all([
        adminClient.from("tickets").select("id, title, description, status_id, urgency_id, category_id, created_by, assigned_to, created_at, closed_at").order("created_at", { ascending: false }).limit(50),
        adminClient.from("profiles").select("id, full_name, email, role, sector, is_active, last_access"),
        adminClient.from("appointments").select("id, visitor_name, scheduled_date, scheduled_time, status, user_id, vehicle_plate").order("scheduled_date", { ascending: false }).limit(30),
        adminClient.from("ai_knowledge_base").select("title, content").eq("is_active", true),
      ]);

      const [statusesRes, urgenciesRes] = await Promise.all([
        adminClient.from("ticket_statuses").select("id, name").order("sort_order"),
        adminClient.from("ticket_urgencies").select("id, name").order("sort_order"),
      ]);

      const statusMap = new Map((statusesRes.data || []).map((s: any) => [s.id, s.name]));
      const urgencyMap = new Map((urgenciesRes.data || []).map((u: any) => [u.id, u.name]));
      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.full_name]));

      const ticketsSummary = (ticketsRes.data || []).map((t: any) =>
        `- "${t.title}" | Status: ${statusMap.get(t.status_id) || '?'} | Urgência: ${urgencyMap.get(t.urgency_id) || 'N/A'} | Criado por: ${profileMap.get(t.created_by) || '?'} | ${t.created_at?.slice(0, 10)}`
      ).join("\n");

      const usersSummary = (profilesRes.data || []).map((p: any) =>
        `- ${p.full_name} | ${p.email} | Perfil: ${p.role} | Setor: ${p.sector || 'N/A'} | Ativo: ${p.is_active ? 'Sim' : 'Não'}`
      ).join("\n");

      const appointmentsSummary = (appointmentsRes.data || []).map((a: any) =>
        `- ${a.visitor_name} | ${a.scheduled_date} ${a.scheduled_time} | Status: ${a.status} | Responsável: ${profileMap.get(a.user_id) || '?'}`
      ).join("\n");

      const knowledgeContext = (knowledgeRes.data || []).map((k: any) => `### ${k.title}\n${k.content}`).join("\n\n");

      systemContext = `\n\nDADOS DO SISTEMA EM TEMPO REAL:\n\n## CHAMADOS (últimos 50):\n${ticketsSummary || 'Nenhum.'}\n\n## USUÁRIOS:\n${usersSummary || 'Nenhum.'}\n\n## AGENDAMENTOS (últimos 30):\n${appointmentsSummary || 'Nenhum.'}\n\n## BASE DE CONHECIMENTO:\n${knowledgeContext || 'Vazia.'}`;
    } else {
      const { data: knowledgeItems } = await adminClient.from("ai_knowledge_base").select("title, content").eq("is_active", true);
      if (knowledgeItems && knowledgeItems.length > 0) {
        systemContext = "\n\nBASE DE CONHECIMENTO:\n" + knowledgeItems.map((item: any) => `### ${item.title}\n${item.content}`).join("\n\n");
      }
    }

    const SYSTEM_PROMPT = tiMode
      ? `Você é o Assistente IA do Painel TI da Esquadromil. Você tem acesso a todos os dados do sistema.
Responda perguntas sobre chamados, usuários, agendamentos. Forneça análises e resumos. Seja direto e preciso.
Quando receber imagens, analise-as detalhadamente. Quando receber PDFs ou documentos, extraia e analise o conteúdo.${systemContext}`
      : `Você é o Assistente TI da Esquadromil. Ajude colaboradores com problemas técnicos.
Forneça soluções práticas. Quando receber imagens (prints de erro, fotos de equipamentos), analise-as para diagnosticar o problema.
Quando necessário, sugira abrir chamado com JSON:
\`\`\`json
{"sugerir_chamado": true, "titulo": "...", "descricao": "..."}
\`\`\`${systemContext}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave de API da IA não configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use gemini-2.5-flash for multimodal support (images)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde um momento e tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

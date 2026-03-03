import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || (roleData.role !== "guarita" && roleData.role !== "ti")) {
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { qr_code, action } = await req.json();

    if (!qr_code) {
      return new Response(
        JSON.stringify({ error: "QR Code não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Find appointment by QR code using admin client to bypass RLS
    const { data: appointment, error: appointmentError } = await adminClient
      .from("appointments")
      .select("*")
      .eq("qr_code", qr_code)
      .single();

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ valid: false, error: "QR Code inválido ou não encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, email, sector")
      .eq("id", appointment.user_id)
      .single();

    const now = new Date();

    if (appointment.qr_expires_at && new Date(appointment.qr_expires_at) < now) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "QR Code expirado",
          appointment: {
            visitor_name: appointment.visitor_name,
            scheduled_date: appointment.scheduled_date,
            scheduled_time: appointment.scheduled_time,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (appointment.exit_at) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "QR Code já utilizado (visitante já saiu)",
          appointment: {
            visitor_name: appointment.visitor_name,
            entry_at: appointment.entry_at,
            exit_at: appointment.exit_at,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "entry") {
      if (appointment.entry_at) {
        return new Response(
          JSON.stringify({ valid: false, error: "Entrada já registrada", appointment: { visitor_name: appointment.visitor_name, entry_at: appointment.entry_at } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await adminClient
        .from("appointments")
        .update({ entry_at: now.toISOString(), status: "in_progress" })
        .eq("id", appointment.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Erro ao registrar entrada" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          valid: true,
          action: "entry",
          message: "Entrada registrada com sucesso",
          appointment: {
            id: appointment.id,
            visitor_name: appointment.visitor_name,
            visitor_document: appointment.visitor_document,
            purpose: appointment.purpose,
            scheduled_time: appointment.scheduled_time,
            duration_minutes: appointment.duration_minutes,
            colaborador: profile?.full_name,
            sector: profile?.sector,
            entry_at: now.toISOString(),
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "exit") {
      if (!appointment.entry_at) {
        return new Response(
          JSON.stringify({ valid: false, error: "Entrada não registrada. Registre a entrada primeiro." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await adminClient
        .from("appointments")
        .update({ exit_at: now.toISOString(), status: "completed" })
        .eq("id", appointment.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Erro ao registrar saída" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const entryTime = new Date(appointment.entry_at);
      const durationMinutes = Math.round((now.getTime() - entryTime.getTime()) / 60000);

      return new Response(
        JSON.stringify({
          valid: true,
          action: "exit",
          message: "Saída registrada com sucesso",
          appointment: {
            id: appointment.id,
            visitor_name: appointment.visitor_name,
            entry_at: appointment.entry_at,
            exit_at: now.toISOString(),
            duration_minutes: durationMinutes,
            colaborador: profile?.full_name,
            sector: profile?.sector,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          valid: true,
          message: "QR Code válido",
          appointment: {
            id: appointment.id,
            visitor_name: appointment.visitor_name,
            visitor_document: appointment.visitor_document,
            purpose: appointment.purpose,
            scheduled_date: appointment.scheduled_date,
            scheduled_time: appointment.scheduled_time,
            duration_minutes: appointment.duration_minutes,
            status: appointment.status,
            entry_at: appointment.entry_at,
            colaborador: profile?.full_name,
            sector: profile?.sector,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

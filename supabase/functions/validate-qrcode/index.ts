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

    // Check if user is guarita
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

    // Find appointment by QR code
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        *,
        profiles:user_id (full_name, email, sector)
      `)
      .eq("qr_code", qr_code)
      .single();

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "QR Code inválido ou não encontrado" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const scheduledDate = new Date(appointment.scheduled_date);
    const [hours, minutes] = appointment.scheduled_time.split(":").map(Number);
    scheduledDate.setHours(hours, minutes, 0, 0);

    const endTime = new Date(scheduledDate);
    endTime.setMinutes(endTime.getMinutes() + appointment.duration_minutes);

    // Check if QR code has expired
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

    // Check if already checked out
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

    // Process action
    if (action === "entry") {
      if (appointment.entry_at) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "Entrada já registrada",
            appointment: {
              visitor_name: appointment.visitor_name,
              entry_at: appointment.entry_at,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Register entry
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ 
          entry_at: now.toISOString(),
          status: "in_progress"
        })
        .eq("id", appointment.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Erro ao registrar entrada" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log the action
      await supabase.from("audit_logs").insert({
        action: "appointment_entry",
        entity_type: "appointment",
        entity_id: appointment.id,
        user_id: user.id,
        details: {
          visitor_name: appointment.visitor_name,
          colaborador: appointment.profiles?.full_name,
          sector: appointment.profiles?.sector,
        },
      });

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
            colaborador: appointment.profiles?.full_name,
            sector: appointment.profiles?.sector,
            entry_at: now.toISOString(),
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "exit") {
      if (!appointment.entry_at) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "Entrada não registrada. Registre a entrada primeiro.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Register exit
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ 
          exit_at: now.toISOString(),
          status: "completed"
        })
        .eq("id", appointment.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Erro ao registrar saída" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate duration
      const entryTime = new Date(appointment.entry_at);
      const durationMs = now.getTime() - entryTime.getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      // Log the action
      await supabase.from("audit_logs").insert({
        action: "appointment_exit",
        entity_type: "appointment",
        entity_id: appointment.id,
        user_id: user.id,
        details: {
          visitor_name: appointment.visitor_name,
          colaborador: appointment.profiles?.full_name,
          sector: appointment.profiles?.sector,
          duration_minutes: durationMinutes,
        },
      });

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
            colaborador: appointment.profiles?.full_name,
            sector: appointment.profiles?.sector,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Just validate
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
            colaborador: appointment.profiles?.full_name,
            sector: appointment.profiles?.sector,
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

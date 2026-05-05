import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateUserPayload {
  action: "create";
  email: string;
  password: string;
  full_name: string;
  sector: string;
  role: "ti" | "guarita" | "colaborador";
}

interface UpdateUserPayload {
  action: "update";
  user_id: string;
  full_name?: string;
  sector?: string;
  role?: "ti" | "guarita" | "colaborador";
  is_active?: boolean;
}

interface ResetPasswordPayload {
  action: "reset_password";
  user_id: string;
  new_password: string;
}

interface DeleteUserPayload {
  action: "delete";
  user_id: string;
}

type Payload = CreateUserPayload | UpdateUserPayload | ResetPasswordPayload | DeleteUserPayload;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autorização não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user token to verify role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user: currentUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !currentUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is TI role
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (roleError || roleData?.role !== "ti") {
      console.error("Role error:", roleError, "Role:", roleData?.role);
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores TI podem gerenciar usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for user management
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const payload: Payload = await req.json();
    console.log("Action:", payload.action);

    switch (payload.action) {
      case "create": {
        const { email, password, full_name, sector, role } = payload;

        // Create auth user
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createError) {
          console.error("Create user error:", createError);
          let errorMessage = "Erro ao criar usuário";
          if (createError.message.includes("already been registered")) {
            errorMessage = "Este e-mail já está cadastrado no sistema";
          }
          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create profile (store tracked_password for TI visibility)
        const { error: profileError } = await adminClient
          .from("profiles")
          .insert({
            id: newUser.user.id,
            email,
            full_name,
            sector,
            role,
            is_active: true,
            tracked_password: password,
          } as any);

        if (profileError) {
          console.error("Profile error:", profileError);
          // Rollback: delete the auth user
          await adminClient.auth.admin.deleteUser(newUser.user.id);
          return new Response(
            JSON.stringify({ error: "Erro ao criar perfil do usuário" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log action
        await adminClient.from("audit_logs").insert({
          user_id: currentUser.id,
          action: "user_created",
          entity_type: "user",
          entity_id: newUser.user.id,
          details: { email, full_name, sector, role },
        });

        console.log("User created successfully:", newUser.user.id);
        return new Response(
          JSON.stringify({ success: true, user_id: newUser.user.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        const { user_id, full_name, sector, role, is_active } = payload;

        const updateData: Record<string, unknown> = {};
        if (full_name !== undefined) updateData.full_name = full_name;
        if (sector !== undefined) updateData.sector = sector;
        if (role !== undefined) updateData.role = role;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { error: updateError } = await adminClient
          .from("profiles")
          .update(updateData)
          .eq("id", user_id);

        if (updateError) {
          console.error("Update error:", updateError);
          return new Response(
            JSON.stringify({ error: "Erro ao atualizar usuário" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log action
        await adminClient.from("audit_logs").insert({
          user_id: currentUser.id,
          action: "user_updated",
          entity_type: "user",
          entity_id: user_id,
          details: updateData,
        });

        console.log("User updated successfully:", user_id);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_password": {
        const { user_id, new_password } = payload;

        const { error: resetError } = await adminClient.auth.admin.updateUserById(
          user_id,
          { password: new_password }
        );

        // Update tracked_password mirror for TI visibility
        await adminClient.from("profiles").update({ tracked_password: new_password } as any).eq("id", user_id);

        if (resetError) {
          console.error("Reset password error:", resetError);
          return new Response(
            JSON.stringify({ error: "Erro ao redefinir senha" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log action
        await adminClient.from("audit_logs").insert({
          user_id: currentUser.id,
          action: "password_reset",
          entity_type: "user",
          entity_id: user_id,
          details: { reset_by: currentUser.email },
        });

        console.log("Password reset successfully for:", user_id);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { user_id } = payload;

        // Get user info before deletion for audit
        const { data: userProfile } = await adminClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", user_id)
          .single();

        // Delete from auth (cascade will handle profiles via trigger if set up)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);

        if (deleteError) {
          console.error("Delete error:", deleteError);
          return new Response(
            JSON.stringify({ error: "Erro ao excluir usuário" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log action
        await adminClient.from("audit_logs").insert({
          user_id: currentUser.id,
          action: "user_deleted",
          entity_type: "user",
          entity_id: user_id,
          details: { email: userProfile?.email, full_name: userProfile?.full_name },
        });

        console.log("User deleted successfully:", user_id);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

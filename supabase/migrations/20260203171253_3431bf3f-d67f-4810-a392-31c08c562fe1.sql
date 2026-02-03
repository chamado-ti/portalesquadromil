-- Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('ti', 'guarita', 'colaborador');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'colaborador',
    sector TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_access TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (for RLS helper functions - avoids recursion)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    UNIQUE(user_id, role)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_categories table
CREATE TABLE public.ticket_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_urgencies table
CREATE TABLE public.ticket_urgencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    response_time_minutes INTEGER NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_statuses table
CREATE TABLE public.ticket_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tickets table
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status_id UUID NOT NULL REFERENCES public.ticket_statuses(id),
    category_id UUID REFERENCES public.ticket_categories(id),
    urgency_id UUID REFERENCES public.ticket_urgencies(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    is_problem BOOLEAN,
    ai_conversation JSONB,
    attachments TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Create ticket_messages table (chat interno por chamado)
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    attachments TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table (agendamentos)
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    visitor_name TEXT NOT NULL,
    visitor_document TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    purpose TEXT,
    qr_code TEXT UNIQUE,
    qr_expires_at TIMESTAMP WITH TIME ZONE,
    entry_at TIMESTAMP WITH TIME ZONE,
    exit_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointment_messages table (chat com guarita)
CREATE TABLE public.appointment_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security Definer Functions (to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, check_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid AND role = check_role
    );
$$;

CREATE OR REPLACE FUNCTION public.is_ti()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'ti');
$$;

CREATE OR REPLACE FUNCTION public.is_guarita()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'guarita');
$$;

CREATE OR REPLACE FUNCTION public.is_colaborador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'colaborador');
$$;

-- Trigger to sync profiles role with user_roles
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delete existing role
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    -- Insert new role
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, NEW.role);
    RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_role
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role();

-- Trigger for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default data
INSERT INTO public.ticket_statuses (name, color, sort_order) VALUES
    ('Novo', '#0EA5E9', 1),
    ('Em Andamento', '#F59E0B', 2),
    ('Aguardando', '#8B5CF6', 3),
    ('Finalizado', '#22C55E', 4);

INSERT INTO public.ticket_urgencies (name, response_time_minutes, color, sort_order) VALUES
    ('Baixa', 60, '#22C55E', 1),
    ('Média', 45, '#F59E0B', 2),
    ('Alta', 15, '#EF4444', 3),
    ('Crítica', 5, '#DC2626', 4);

INSERT INTO public.ticket_categories (name, description) VALUES
    ('Hardware', 'Problemas com equipamentos físicos'),
    ('Software', 'Problemas com programas e sistemas'),
    ('Rede', 'Problemas de conectividade'),
    ('Acesso', 'Problemas de login e permissões'),
    ('Outros', 'Outros tipos de solicitação');

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_urgencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "TI can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_ti());

CREATE POLICY "TI can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (public.is_ti());

CREATE POLICY "TI can update profiles" ON public.profiles
    FOR UPDATE USING (public.is_ti());

CREATE POLICY "TI can delete profiles" ON public.profiles
    FOR DELETE USING (public.is_ti());

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- RLS Policies for user_roles (internal use)
CREATE POLICY "Roles readable by authenticated" ON public.user_roles
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for audit_logs
CREATE POLICY "TI can view all audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_ti());

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- RLS Policies for tickets
CREATE POLICY "TI can view all tickets" ON public.tickets
    FOR SELECT USING (public.is_ti());

CREATE POLICY "Users can view own tickets" ON public.tickets
    FOR SELECT USING (created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Authenticated can create tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "TI can update all tickets" ON public.tickets
    FOR UPDATE USING (public.is_ti());

CREATE POLICY "Users can update own tickets" ON public.tickets
    FOR UPDATE USING (created_by = auth.uid());

-- RLS Policies for ticket_messages
CREATE POLICY "Users can view messages of their tickets" ON public.ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets 
            WHERE tickets.id = ticket_messages.ticket_id 
            AND (tickets.created_by = auth.uid() OR tickets.assigned_to = auth.uid() OR public.is_ti())
        )
    );

CREATE POLICY "Users can send messages to their tickets" ON public.ticket_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.tickets 
            WHERE tickets.id = ticket_messages.ticket_id 
            AND (tickets.created_by = auth.uid() OR tickets.assigned_to = auth.uid() OR public.is_ti())
        )
    );

-- RLS Policies for reference tables (read by all authenticated)
CREATE POLICY "Categories readable by authenticated" ON public.ticket_categories
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Statuses readable by authenticated" ON public.ticket_statuses
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Urgencies readable by authenticated" ON public.ticket_urgencies
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "TI can manage categories" ON public.ticket_categories
    FOR ALL USING (public.is_ti());

CREATE POLICY "TI can manage statuses" ON public.ticket_statuses
    FOR ALL USING (public.is_ti());

CREATE POLICY "TI can manage urgencies" ON public.ticket_urgencies
    FOR ALL USING (public.is_ti());

-- RLS Policies for appointments
CREATE POLICY "TI can view all appointments" ON public.appointments
    FOR SELECT USING (public.is_ti());

CREATE POLICY "Guarita can view all appointments" ON public.appointments
    FOR SELECT USING (public.is_guarita());

CREATE POLICY "Users can view own appointments" ON public.appointments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated can create appointments" ON public.appointments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "TI can update all appointments" ON public.appointments
    FOR UPDATE USING (public.is_ti());

CREATE POLICY "Guarita can update appointments" ON public.appointments
    FOR UPDATE USING (public.is_guarita());

CREATE POLICY "Users can update own appointments" ON public.appointments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own appointments" ON public.appointments
    FOR DELETE USING (user_id = auth.uid() OR public.is_ti());

-- RLS Policies for appointment_messages
CREATE POLICY "Users can view appointment messages" ON public.appointment_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.appointments 
            WHERE appointments.id = appointment_messages.appointment_id 
            AND (appointments.user_id = auth.uid() OR public.is_guarita() OR public.is_ti())
        )
    );

CREATE POLICY "Users can send appointment messages" ON public.appointment_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.appointments 
            WHERE appointments.id = appointment_messages.appointment_id 
            AND (appointments.user_id = auth.uid() OR public.is_guarita() OR public.is_ti())
        )
    );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (user_id = auth.uid());

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_messages;

-- Create indexes for performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX idx_tickets_status ON public.tickets(status_id);
CREATE INDEX idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX idx_appointments_user ON public.appointments(user_id);
CREATE INDEX idx_appointments_date ON public.appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
-- Garantir REPLICA IDENTITY FULL para emitir payload completo em UPDATE/DELETE
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_messages REPLICA IDENTITY FULL;
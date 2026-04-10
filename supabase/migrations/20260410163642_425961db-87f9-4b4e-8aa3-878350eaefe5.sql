
-- 1. Create all tables first (no cross-references in policies yet)
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.group_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, name)
);

CREATE TABLE public.group_tag_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.group_tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tag_id, user_id)
);

CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  tag_mention uuid REFERENCES public.group_tags(id) ON DELETE SET NULL,
  attachments text[] DEFAULT '{}',
  is_deleted boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  is_pinned boolean NOT NULL DEFAULT false,
  pin_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.group_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.group_tags(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS on all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_tag_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_tickets ENABLE ROW LEVEL SECURITY;

-- 3. Now create policies (all tables exist)

-- Groups policies
CREATE POLICY "TI can manage all groups" ON public.groups FOR ALL USING (is_ti());
CREATE POLICY "Members can view their groups" ON public.groups FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.group_tag_members gtm
      JOIN public.group_tags gt ON gt.id = gtm.tag_id
      WHERE gt.group_id = groups.id AND gtm.user_id = auth.uid()
    )
  ));

-- Group Tags policies
CREATE POLICY "TI can manage tags" ON public.group_tags FOR ALL USING (is_ti());
CREATE POLICY "Members can view tags" ON public.group_tags FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Group Tag Members policies
CREATE POLICY "TI can manage tag members" ON public.group_tag_members FOR ALL USING (is_ti());
CREATE POLICY "Users can view own memberships" ON public.group_tag_members FOR SELECT
  USING (user_id = auth.uid() OR is_ti());

-- Group Messages policies
CREATE POLICY "TI can manage all messages" ON public.group_messages FOR ALL USING (is_ti());
CREATE POLICY "Members can view group messages" ON public.group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_tag_members gtm
      JOIN public.group_tags gt ON gt.id = gtm.tag_id
      WHERE gt.group_id = group_messages.group_id AND gtm.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can send messages" ON public.group_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.group_tag_members gtm
      JOIN public.group_tags gt ON gt.id = gtm.tag_id
      WHERE gt.group_id = group_messages.group_id AND gtm.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own messages" ON public.group_messages FOR UPDATE
  USING (sender_id = auth.uid() OR is_ti());

-- Group Tickets policies
CREATE POLICY "TI can manage group tickets" ON public.group_tickets FOR ALL USING (is_ti());
CREATE POLICY "Tag members can view group tickets" ON public.group_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_tag_members gtm
      WHERE gtm.tag_id = group_tickets.tag_id AND gtm.user_id = auth.uid()
    ) OR is_ti()
  );
CREATE POLICY "Members can create group tickets" ON public.group_tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- 5. Indexes
CREATE INDEX idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX idx_group_messages_created_at ON public.group_messages(created_at);
CREATE INDEX idx_group_tag_members_user_id ON public.group_tag_members(user_id);
CREATE INDEX idx_group_tag_members_tag_id ON public.group_tag_members(tag_id);
CREATE INDEX idx_group_tags_group_id ON public.group_tags(group_id);

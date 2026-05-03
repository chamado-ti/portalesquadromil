export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_agent_access: {
        Row: {
          access_type: string
          agent_id: string
          created_at: string
          id: string
          target_value: string
        }
        Insert: {
          access_type: string
          agent_id: string
          created_at?: string
          id?: string
          target_value: string
        }
        Update: {
          access_type?: string
          agent_id?: string
          created_at?: string
          id?: string
          target_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_access_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_conversations: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          messages: Json
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          messages?: Json
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          messages?: Json
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_modules: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          module_key: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          module_key: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          module_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_modules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_skills: {
        Row: {
          agent_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_shared: boolean | null
          name: string
          parameters: Json | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name: string
          parameters?: Json | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          parameters?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_skills_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          api_key: string | null
          api_provider: string
          created_at: string
          created_by: string | null
          db_access_level: string
          db_tables: string[] | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          memory_enabled: boolean
          model: string
          name: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_provider?: string
          created_at?: string
          created_by?: string | null
          db_access_level?: string
          db_tables?: string[] | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          memory_enabled?: boolean
          model?: string
          name: string
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_provider?: string
          created_at?: string
          created_by?: string | null
          db_access_level?: string
          db_tables?: string[] | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          memory_enabled?: boolean
          model?: string
          name?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string | null
          id: string
          messages: Json
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_knowledge_base: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      appointment_messages: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          duration_minutes: number
          entry_at: string | null
          exit_at: string | null
          id: string
          notes: string | null
          purpose: string | null
          qr_code: string | null
          qr_expires_at: string | null
          scheduled_date: string
          scheduled_time: string
          status: string
          updated_at: string
          user_id: string
          vehicle_plate: string | null
          visitor_document: string | null
          visitor_name: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          entry_at?: string | null
          exit_at?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string
          updated_at?: string
          user_id: string
          vehicle_plate?: string | null
          visitor_document?: string | null
          visitor_name: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          entry_at?: string | null
          exit_at?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_plate?: string | null
          visitor_document?: string | null
          visitor_name?: string
        }
        Relationships: []
      }
      audit_items: {
        Row: {
          auditor_id: string | null
          checklist: Json | null
          created_at: string | null
          evidence_urls: string[] | null
          id: string
          notes: string | null
          process_id: string | null
          report_url: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          auditor_id?: string | null
          checklist?: Json | null
          created_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          notes?: string | null
          process_id?: string | null
          report_url?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          auditor_id?: string | null
          checklist?: Json | null
          created_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          notes?: string | null
          process_id?: string | null
          report_url?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_items_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      group_messages: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string
          edited_at: string | null
          group_id: string
          id: string
          is_deleted: boolean
          is_pinned: boolean
          pin_expires_at: string | null
          reactions: Json
          reply_to_id: string | null
          sender_id: string
          tag_mention: string | null
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string
          edited_at?: string | null
          group_id: string
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          pin_expires_at?: string | null
          reactions?: Json
          reply_to_id?: string | null
          sender_id: string
          tag_mention?: string | null
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string
          edited_at?: string | null
          group_id?: string
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          pin_expires_at?: string | null
          reactions?: Json
          reply_to_id?: string | null
          sender_id?: string
          tag_mention?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_tag_mention_fkey"
            columns: ["tag_mention"]
            isOneToOne: false
            referencedRelation: "group_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      group_reads: {
        Row: {
          group_id: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_tag_members: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_tag_members_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "group_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      group_tags: {
        Row: {
          color: string
          created_at: string
          group_id: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          group_id: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          group_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_tags_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_tickets: {
        Row: {
          created_at: string
          id: string
          message_id: string
          tag_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          tag_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          tag_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_tickets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_tickets_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "group_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      kanban_boards: {
        Row: {
          allowed_sectors: string[] | null
          allowed_users: string[] | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          allowed_sectors?: string[] | null
          allowed_users?: string[] | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          allowed_sectors?: string[] | null
          allowed_users?: string[] | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kanban_cards: {
        Row: {
          assigned_to: string | null
          board_id: string
          column_id: string
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          board_id: string
          column_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          board_id?: string
          column_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          board_id: string
          color: string | null
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          board_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          board_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      module_settings: {
        Row: {
          allowed_roles: string[] | null
          allowed_sectors: string[] | null
          allowed_users: string[] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          module_key: string
          module_name: string
          updated_at: string
        }
        Insert: {
          allowed_roles?: string[] | null
          allowed_sectors?: string[] | null
          allowed_users?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          module_key: string
          module_name: string
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[] | null
          allowed_sectors?: string[] | null
          allowed_users?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          module_key?: string
          module_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      processes: {
        Row: {
          allowed_viewers: string[] | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          status: string | null
          steps: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          allowed_viewers?: string[] | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: string | null
          steps?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          allowed_viewers?: string[] | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          steps?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_access: string | null
          role: Database["public"]["Enums"]["app_role"]
          sector: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_access?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sector?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_access?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sector?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          ai_analysis: Json | null
          category: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          mitigation: string | null
          process_id: string | null
          risk_level: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          category?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          mitigation?: string | null
          process_id?: string | null
          risk_level?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          category?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          mitigation?: string | null
          process_id?: string | null
          risk_level?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          sector: string | null
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          sector?: string | null
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          sector?: string | null
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ti_files: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string
          description: string | null
          file_type: string | null
          file_url: string | null
          folder: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          folder?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          folder?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      ticket_urgencies: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          response_time_minutes: number
          sort_order: number
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          response_time_minutes: number
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          response_time_minutes?: number
          sort_order?: number
        }
        Relationships: []
      }
      tickets: {
        Row: {
          ai_conversation: Json | null
          assigned_to: string | null
          attachments: string[] | null
          category_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_problem: boolean | null
          status_id: string
          title: string
          updated_at: string
          urgency_id: string | null
        }
        Insert: {
          ai_conversation?: Json | null
          assigned_to?: string | null
          attachments?: string[] | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_problem?: boolean | null
          status_id: string
          title: string
          updated_at?: string
          urgency_id?: string | null
        }
        Update: {
          ai_conversation?: Json | null
          assigned_to?: string | null
          attachments?: string[] | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_problem?: boolean | null
          status_id?: string
          title?: string
          updated_at?: string
          urgency_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "ticket_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_urgency_id_fkey"
            columns: ["urgency_id"]
            isOneToOne: false
            referencedRelation: "ticket_urgencies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credentials: {
        Row: {
          created_at: string
          id: string
          service_email: string
          service_name: string
          service_password: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_email: string
          service_name: string
          service_password: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_email?: string
          service_name?: string
          service_password?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          check_role: Database["public"]["Enums"]["app_role"]
          user_uuid: string
        }
        Returns: boolean
      }
      is_colaborador: { Args: never; Returns: boolean }
      is_guarita: { Args: never; Returns: boolean }
      is_ti: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "ti" | "guarita" | "colaborador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["ti", "guarita", "colaborador"],
    },
  },
} as const

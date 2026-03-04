export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          role: 'user' | 'admin'
          credits: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          role?: 'user' | 'admin'
          credits?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          role?: 'user' | 'admin'
          credits?: number
          created_at?: string
          updated_at?: string
        }
      }
      custom_lenses: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          description: string | null
          system_prompt: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string
          description?: string | null
          system_prompt: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string
          description?: string | null
          system_prompt?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          title: string | null
          raw_content: string
          char_count: number
          source_type: 'text' | 'voice'
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          raw_content: string
          char_count?: number
          source_type?: 'text' | 'voice'
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          raw_content?: string
          char_count?: number
          source_type?: 'text' | 'voice'
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payment_orders: {
        Row: {
          id: string
          user_id: string
          out_trade_no: string
          platform_order: string | null
          package_name: string
          amount_fen: number
          credits_granted: number
          payment_method: string | null
          status: 'pending' | 'paid' | 'failed' | 'refunded'
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          out_trade_no: string
          platform_order?: string | null
          package_name: string
          amount_fen: number
          credits_granted: number
          payment_method?: string | null
          status?: 'pending' | 'paid' | 'failed' | 'refunded'
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          out_trade_no?: string
          platform_order?: string | null
          package_name?: string
          amount_fen?: number
          credits_granted?: number
          payment_method?: string | null
          status?: 'pending' | 'paid' | 'failed' | 'refunded'
          paid_at?: string | null
          created_at?: string
        }
      }
      insights: {
        Row: {
          id: string
          document_id: string
          user_id: string
          lens_type: 'requirements' | 'meeting' | 'review' | 'risk' | 'change' | 'postmortem' | 'tech' | 'custom'
          custom_lens_id: string | null
          result: string
          model: string
          prompt_version: string
          input_chars: number | null
          input_tokens: number | null
          output_tokens: number | null
          credits_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          lens_type: 'requirements' | 'meeting' | 'review' | 'risk' | 'change' | 'postmortem' | 'tech' | 'custom'
          custom_lens_id?: string | null
          result: string
          model?: string
          prompt_version?: string
          input_chars?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          credits_cost: number
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          lens_type?: 'requirements' | 'meeting' | 'review' | 'risk' | 'change' | 'postmortem' | 'tech' | 'custom'
          custom_lens_id?: string | null
          result?: string
          model?: string
          prompt_version?: string
          input_chars?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          credits_cost?: number
          created_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          balance_after: number
          type: 'payment' | 'manual_grant' | 'consumed' | 'admin_deduct' | 'refund'
          description: string | null
          related_insight_id: string | null
          related_order_id: string | null
          operated_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          balance_after: number
          type: 'payment' | 'manual_grant' | 'consumed' | 'admin_deduct' | 'refund'
          description?: string | null
          related_insight_id?: string | null
          related_order_id?: string | null
          operated_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          balance_after?: number
          type?: 'payment' | 'manual_grant' | 'consumed' | 'admin_deduct' | 'refund'
          description?: string | null
          related_insight_id?: string | null
          related_order_id?: string | null
          operated_by?: string | null
          created_at?: string
        }
      }
      feedbacks: {
        Row: {
          id: string
          user_id: string
          type: 'payment' | 'bug' | 'feature' | 'other'
          title: string
          content: string
          context_url: string | null
          related_order_id: string | null
          related_insight_id: string | null
          status: 'pending' | 'processing' | 'resolved' | 'closed'
          admin_note: string | null
          handled_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'payment' | 'bug' | 'feature' | 'other'
          title: string
          content: string
          context_url?: string | null
          related_order_id?: string | null
          related_insight_id?: string | null
          status?: 'pending' | 'processing' | 'resolved' | 'closed'
          admin_note?: string | null
          handled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'payment' | 'bug' | 'feature' | 'other'
          title?: string
          content?: string
          context_url?: string | null
          related_order_id?: string | null
          related_insight_id?: string | null
          status?: 'pending' | 'processing' | 'resolved' | 'closed'
          admin_note?: string | null
          handled_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      system_prompts: {
        Row: {
          id: string
          lens_type: string
          version: string
          system_prompt: string
          is_active: boolean
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lens_type: string
          version: string
          system_prompt: string
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lens_type?: string
          version?: string
          system_prompt?: string
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          type: 'info' | 'warning' | 'maintenance'
          is_active: boolean
          expires_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          type?: 'info' | 'warning' | 'maintenance'
          is_active?: boolean
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          type?: 'info' | 'warning' | 'maintenance'
          is_active?: boolean
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      deduct_credits: {
        Args: {
          p_user_id: string
          p_cost: number
          p_description: string
          p_related_insight_id?: string | null
        }
        Returns: Json
      }
    }
    Enums: Record<string, never>
  }
}

// 便捷类型别名
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

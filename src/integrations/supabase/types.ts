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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_tokens: {
        Row: {
          agent_framework: string | null
          category: string | null
          chain_id: string | null
          coingecko_id: string
          created_at: string
          current_price_usd: number | null
          description: string | null
          display_order: number | null
          image_url: string | null
          is_featured: boolean | null
          last_scanned_at: string | null
          last_synced_at: string | null
          market_cap_rank: number | null
          market_cap_usd: number | null
          name: string
          price_change_24h_pct: number | null
          symbol: string
          token_address: string | null
          updated_at: string
          volume_24h_usd: number | null
        }
        Insert: {
          agent_framework?: string | null
          category?: string | null
          chain_id?: string | null
          coingecko_id: string
          created_at?: string
          current_price_usd?: number | null
          description?: string | null
          display_order?: number | null
          image_url?: string | null
          is_featured?: boolean | null
          last_scanned_at?: string | null
          last_synced_at?: string | null
          market_cap_rank?: number | null
          market_cap_usd?: number | null
          name: string
          price_change_24h_pct?: number | null
          symbol: string
          token_address?: string | null
          updated_at?: string
          volume_24h_usd?: number | null
        }
        Update: {
          agent_framework?: string | null
          category?: string | null
          chain_id?: string | null
          coingecko_id?: string
          created_at?: string
          current_price_usd?: number | null
          description?: string | null
          display_order?: number | null
          image_url?: string | null
          is_featured?: boolean | null
          last_scanned_at?: string | null
          last_synced_at?: string | null
          market_cap_rank?: number | null
          market_cap_usd?: number | null
          name?: string
          price_change_24h_pct?: number | null
          symbol?: string
          token_address?: string | null
          updated_at?: string
          volume_24h_usd?: number | null
        }
        Relationships: []
      }
      anonymous_scan_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: unknown
          success: boolean | null
          token_address: string | null
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
          token_address?: string | null
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
          token_address?: string | null
        }
        Relationships: []
      }
      copilot_events: {
        Row: {
          available: Json | null
          created_at: string | null
          id: string
          latency_ms: number | null
          limited: boolean | null
          query: string | null
          token_address: string | null
          type: string
        }
        Insert: {
          available?: Json | null
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          limited?: boolean | null
          query?: string | null
          token_address?: string | null
          type: string
        }
        Update: {
          available?: Json | null
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          limited?: boolean | null
          query?: string | null
          token_address?: string | null
          type?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          plan: string | null
          pro_scan_limit: number | null
          scans_used: number | null
          source: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name?: string | null
          plan?: string | null
          pro_scan_limit?: number | null
          scans_used?: number | null
          source?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          plan?: string | null
          pro_scan_limit?: number | null
          scans_used?: number | null
          source?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      "Token Reports": {
        Row: {
          chain_id: number | null
          created_at: string | null
          generated_by: string | null
          id: string | null
          report_content: string | null
          token_address: string | null
          token_name: string | null
          token_symbol: string | null
          updated_at: string | null
        }
        Insert: {
          chain_id?: number | null
          created_at?: string | null
          generated_by?: string | null
          id?: string | null
          report_content?: string | null
          token_address?: string | null
          token_name?: string | null
          token_symbol?: string | null
          updated_at?: string | null
        }
        Update: {
          chain_id?: number | null
          created_at?: string | null
          generated_by?: string | null
          id?: string | null
          report_content?: string | null
          token_address?: string | null
          token_name?: string | null
          token_symbol?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      token_community_cache: {
        Row: {
          active_channels: string[] | null
          chain_id: string
          discord_members: number | null
          score: number | null
          team_visibility: string | null
          telegram_members: number | null
          token_address: string
          twitter_followers: number | null
          twitter_growth_7d: number | null
          twitter_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          active_channels?: string[] | null
          chain_id?: string
          discord_members?: number | null
          score?: number | null
          team_visibility?: string | null
          telegram_members?: number | null
          token_address: string
          twitter_followers?: number | null
          twitter_growth_7d?: number | null
          twitter_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active_channels?: string[] | null
          chain_id?: string
          discord_members?: number | null
          score?: number | null
          team_visibility?: string | null
          telegram_members?: number | null
          token_address?: string
          twitter_followers?: number | null
          twitter_growth_7d?: number | null
          twitter_verified?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_community_cache_token_address_chain_id_fkey"
            columns: ["token_address", "chain_id"]
            isOneToOne: true
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address", "chain_id"]
          },
        ]
      }
      token_data_cache: {
        Row: {
          chain_id: string
          circulating_supply: number | null
          coingecko_id: string | null
          created_at: string | null
          current_price_usd: number | null
          description: string | null
          github_url: string | null
          launch_date: string | null
          logo_url: string | null
          market_cap_usd: number | null
          name: string | null
          price_change_24h: number | null
          symbol: string | null
          token_address: string
          total_value_locked_usd: string | null
          twitter_handle: string | null
          website_url: string | null
        }
        Insert: {
          chain_id?: string
          circulating_supply?: number | null
          coingecko_id?: string | null
          created_at?: string | null
          current_price_usd?: number | null
          description?: string | null
          github_url?: string | null
          launch_date?: string | null
          logo_url?: string | null
          market_cap_usd?: number | null
          name?: string | null
          price_change_24h?: number | null
          symbol?: string | null
          token_address: string
          total_value_locked_usd?: string | null
          twitter_handle?: string | null
          website_url?: string | null
        }
        Update: {
          chain_id?: string
          circulating_supply?: number | null
          coingecko_id?: string | null
          created_at?: string | null
          current_price_usd?: number | null
          description?: string | null
          github_url?: string | null
          launch_date?: string | null
          logo_url?: string | null
          market_cap_usd?: number | null
          name?: string | null
          price_change_24h?: number | null
          symbol?: string | null
          token_address?: string
          total_value_locked_usd?: string | null
          twitter_handle?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      token_description_overrides: {
        Row: {
          created_at: string
          description: string
          token_address: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          token_address: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          token_address?: string
          updated_at?: string
        }
        Relationships: []
      }
      token_development_cache: {
        Row: {
          chain_id: string
          commits_30d: number | null
          contributors_count: number | null
          forks: number | null
          github_repo: string | null
          is_archived: boolean | null
          is_open_source: boolean | null
          language: string | null
          last_commit: string | null
          open_issues: number | null
          repo_created_at: string | null
          roadmap_progress: string | null
          score: number | null
          stars: number | null
          token_address: string
          updated_at: string | null
        }
        Insert: {
          chain_id?: string
          commits_30d?: number | null
          contributors_count?: number | null
          forks?: number | null
          github_repo?: string | null
          is_archived?: boolean | null
          is_open_source?: boolean | null
          language?: string | null
          last_commit?: string | null
          open_issues?: number | null
          repo_created_at?: string | null
          roadmap_progress?: string | null
          score?: number | null
          stars?: number | null
          token_address: string
          updated_at?: string | null
        }
        Update: {
          chain_id?: string
          commits_30d?: number | null
          contributors_count?: number | null
          forks?: number | null
          github_repo?: string | null
          is_archived?: boolean | null
          is_open_source?: boolean | null
          language?: string | null
          last_commit?: string | null
          open_issues?: number | null
          repo_created_at?: string | null
          roadmap_progress?: string | null
          score?: number | null
          stars?: number | null
          token_address?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_development_cache_token_address_chain_id_fkey"
            columns: ["token_address", "chain_id"]
            isOneToOne: true
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address", "chain_id"]
          },
        ]
      }
      token_liquidity_cache: {
        Row: {
          cex_listings: number | null
          chain_id: string
          dex_depth_status: string | null
          holder_distribution: string | null
          liquidity_locked_days: number | null
          score: number | null
          token_address: string
          trading_volume_24h_usd: number | null
          updated_at: string | null
        }
        Insert: {
          cex_listings?: number | null
          chain_id?: string
          dex_depth_status?: string | null
          holder_distribution?: string | null
          liquidity_locked_days?: number | null
          score?: number | null
          token_address: string
          trading_volume_24h_usd?: number | null
          updated_at?: string | null
        }
        Update: {
          cex_listings?: number | null
          chain_id?: string
          dex_depth_status?: string | null
          holder_distribution?: string | null
          liquidity_locked_days?: number | null
          score?: number | null
          token_address?: string
          trading_volume_24h_usd?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_liquidity_cache_token_address_chain_id_fkey"
            columns: ["token_address", "chain_id"]
            isOneToOne: true
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address", "chain_id"]
          },
        ]
      }
      token_reports: {
        Row: {
          chain_id: string
          created_at: string | null
          generated_by: string | null
          id: string
          report_content: Json
          token_address: string
          token_name: string
          token_symbol: string
          updated_at: string | null
        }
        Insert: {
          chain_id?: string
          created_at?: string | null
          generated_by?: string | null
          id?: string
          report_content: Json
          token_address: string
          token_name: string
          token_symbol: string
          updated_at?: string | null
        }
        Update: {
          chain_id?: string
          created_at?: string | null
          generated_by?: string | null
          id?: string
          report_content?: Json
          token_address?: string
          token_name?: string
          token_symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      token_risk_reports: {
        Row: {
          chain_id: string
          created_at: string
          generated_by: string | null
          id: string
          report_content: Json
          token_address: string
          updated_at: string
        }
        Insert: {
          chain_id?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          report_content: Json
          token_address: string
          updated_at?: string
        }
        Update: {
          chain_id?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          report_content?: Json
          token_address?: string
          updated_at?: string
        }
        Relationships: []
      }
      token_scans: {
        Row: {
          chain_id: string
          id: string
          is_anonymous: boolean | null
          pro_scan: boolean | null
          scanned_at: string | null
          score_total: number | null
          token_address: string | null
          user_id: string | null
        }
        Insert: {
          chain_id?: string
          id?: string
          is_anonymous?: boolean | null
          pro_scan?: boolean | null
          scanned_at?: string | null
          score_total?: number | null
          token_address?: string | null
          user_id?: string | null
        }
        Update: {
          chain_id?: string
          id?: string
          is_anonymous?: boolean | null
          pro_scan?: boolean | null
          scanned_at?: string | null
          score_total?: number | null
          token_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_scans_token_address_chain_id_fkey"
            columns: ["token_address", "chain_id"]
            isOneToOne: false
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address", "chain_id"]
          },
        ]
      }
      token_security_cache: {
        Row: {
          access_control: boolean | null
          audit_status: string | null
          can_mint: boolean | null
          chain_id: string
          contract_verified: boolean | null
          freeze_authority: boolean | null
          honeypot_detected: boolean | null
          is_blacklisted: boolean | null
          is_liquidity_locked: boolean | null
          is_proxy: boolean | null
          liquidity_lock_info: string | null
          liquidity_percentage: number | null
          multisig_status: string | null
          ownership_renounced: boolean | null
          score: number | null
          token_address: string
          updated_at: string | null
          webacy_flags: Json | null
          webacy_risk_score: number | null
          webacy_severity: string | null
        }
        Insert: {
          access_control?: boolean | null
          audit_status?: string | null
          can_mint?: boolean | null
          chain_id?: string
          contract_verified?: boolean | null
          freeze_authority?: boolean | null
          honeypot_detected?: boolean | null
          is_blacklisted?: boolean | null
          is_liquidity_locked?: boolean | null
          is_proxy?: boolean | null
          liquidity_lock_info?: string | null
          liquidity_percentage?: number | null
          multisig_status?: string | null
          ownership_renounced?: boolean | null
          score?: number | null
          token_address: string
          updated_at?: string | null
          webacy_flags?: Json | null
          webacy_risk_score?: number | null
          webacy_severity?: string | null
        }
        Update: {
          access_control?: boolean | null
          audit_status?: string | null
          can_mint?: boolean | null
          chain_id?: string
          contract_verified?: boolean | null
          freeze_authority?: boolean | null
          honeypot_detected?: boolean | null
          is_blacklisted?: boolean | null
          is_liquidity_locked?: boolean | null
          is_proxy?: boolean | null
          liquidity_lock_info?: string | null
          liquidity_percentage?: number | null
          multisig_status?: string | null
          ownership_renounced?: boolean | null
          score?: number | null
          token_address?: string
          updated_at?: string | null
          webacy_flags?: Json | null
          webacy_risk_score?: number | null
          webacy_severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_security_cache_token_address_chain_id_fkey"
            columns: ["token_address", "chain_id"]
            isOneToOne: true
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address", "chain_id"]
          },
        ]
      }
      token_tokenomics_cache: {
        Row: {
          actual_circulating_supply: number | null
          burn_addresses_found: string[] | null
          burn_events_detected: boolean | null
          burn_mechanism: boolean | null
          chain_id: string
          circulating_supply: number | null
          data_confidence_score: number | null
          dex_liquidity_usd: number | null
          distribution_gini_coefficient: number | null
          distribution_score: string | null
          holder_concentration_risk: string | null
          inflation_rate: number | null
          last_holder_analysis: string | null
          major_dex_pairs: Json | null
          score: number | null
          supply_cap: number | null
          token_address: string
          top_holders_count: number | null
          total_supply: number | null
          treasury_addresses: string[] | null
          treasury_usd: number | null
          tvl_usd: number | null
          updated_at: string | null
          vesting_schedule: string | null
        }
        Insert: {
          actual_circulating_supply?: number | null
          burn_addresses_found?: string[] | null
          burn_events_detected?: boolean | null
          burn_mechanism?: boolean | null
          chain_id?: string
          circulating_supply?: number | null
          data_confidence_score?: number | null
          dex_liquidity_usd?: number | null
          distribution_gini_coefficient?: number | null
          distribution_score?: string | null
          holder_concentration_risk?: string | null
          inflation_rate?: number | null
          last_holder_analysis?: string | null
          major_dex_pairs?: Json | null
          score?: number | null
          supply_cap?: number | null
          token_address: string
          top_holders_count?: number | null
          total_supply?: number | null
          treasury_addresses?: string[] | null
          treasury_usd?: number | null
          tvl_usd?: number | null
          updated_at?: string | null
          vesting_schedule?: string | null
        }
        Update: {
          actual_circulating_supply?: number | null
          burn_addresses_found?: string[] | null
          burn_events_detected?: boolean | null
          burn_mechanism?: boolean | null
          chain_id?: string
          circulating_supply?: number | null
          data_confidence_score?: number | null
          dex_liquidity_usd?: number | null
          distribution_gini_coefficient?: number | null
          distribution_score?: string | null
          holder_concentration_risk?: string | null
          inflation_rate?: number | null
          last_holder_analysis?: string | null
          major_dex_pairs?: Json | null
          score?: number | null
          supply_cap?: number | null
          token_address?: string
          top_holders_count?: number | null
          total_supply?: number | null
          treasury_addresses?: string[] | null
          treasury_usd?: number | null
          tvl_usd?: number | null
          updated_at?: string | null
          vesting_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_tokenomics_cache_token_address_chain_id_fkey"
            columns: ["token_address", "chain_id"]
            isOneToOne: true
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address", "chain_id"]
          },
        ]
      }
      twitter_profile_cache: {
        Row: {
          followers_count: number | null
          growth_7d: number | null
          is_verified: boolean | null
          last_updated: string | null
          twitter_handle: string
        }
        Insert: {
          followers_count?: number | null
          growth_7d?: number | null
          is_verified?: boolean | null
          last_updated?: string | null
          twitter_handle: string
        }
        Update: {
          followers_count?: number | null
          growth_7d?: number | null
          is_verified?: boolean | null
          last_updated?: string | null
          twitter_handle?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      hubspot_contact_data: {
        Row: {
          email: string | null
          last_scan_date: string | null
          name: string | null
          plan: string | null
          pro_scan_limit: number | null
          pro_subscriber: boolean | null
          scan_credits_remaining: number | null
          scans_used: number | null
          signup_date: string | null
          user_id: string | null
        }
        Insert: {
          email?: never
          last_scan_date?: never
          name?: never
          plan?: string | null
          pro_scan_limit?: number | null
          pro_subscriber?: never
          scan_credits_remaining?: never
          scans_used?: number | null
          signup_date?: string | null
          user_id?: string | null
        }
        Update: {
          email?: never
          last_scan_date?: never
          name?: never
          plan?: string | null
          pro_scan_limit?: number | null
          pro_subscriber?: never
          scan_credits_remaining?: never
          scans_used?: number | null
          signup_date?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_admin_hubspot_data: {
        Args: never
        Returns: {
          email: string
          last_scan_date: string
          name: string
          plan: string
          pro_scan_limit: number
          pro_subscriber: boolean
          scan_credits_remaining: number
          scans_used: number
          signup_date: string
          user_id: string
        }[]
      }
      get_admin_user_data: {
        Args: { _caller_user_id: string }
        Returns: {
          created_at: string
          email: string
          id: string
          is_admin: boolean
          last_sign_in_at: string
          name: string
          plan: string
          pro_scan_limit: number
          role: Database["public"]["Enums"]["app_role"]
          scans_used: number
          status: string
        }[]
      }
      get_user_email_for_hubspot: { Args: { user_id: string }; Returns: string }
      get_user_hubspot_data: {
        Args: { target_user_id: string }
        Returns: {
          email: string
          last_scan_date: string
          name: string
          plan: string
          pro_scan_limit: number
          pro_subscriber: boolean
          scan_credits_remaining: number
          scans_used: number
          signup_date: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_token_sitemap: { Args: never; Returns: undefined }
      sync_all_users_to_hubspot: { Args: never; Returns: undefined }
      sync_all_users_to_hubspot_debug: { Args: never; Returns: Json }
      upsert_subscriber_by_email: {
        Args: {
          user_email: string
          user_name?: string
          user_plan?: string
          user_source?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

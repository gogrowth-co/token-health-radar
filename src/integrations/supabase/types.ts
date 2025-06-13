export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      token_community_cache: {
        Row: {
          active_channels: string[] | null
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
            foreignKeyName: "token_community_cache_token_address_fkey"
            columns: ["token_address"]
            isOneToOne: true
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address"]
          },
        ]
      }
      token_data_cache: {
        Row: {
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
      token_development_cache: {
        Row: {
          commits_30d: number | null
          contributors_count: number | null
          github_repo: string | null
          is_open_source: boolean | null
          last_commit: string | null
          roadmap_progress: string | null
          score: number | null
          token_address: string
          updated_at: string | null
        }
        Insert: {
          commits_30d?: number | null
          contributors_count?: number | null
          github_repo?: string | null
          is_open_source?: boolean | null
          last_commit?: string | null
          roadmap_progress?: string | null
          score?: number | null
          token_address: string
          updated_at?: string | null
        }
        Update: {
          commits_30d?: number | null
          contributors_count?: number | null
          github_repo?: string | null
          is_open_source?: boolean | null
          last_commit?: string | null
          roadmap_progress?: string | null
          score?: number | null
          token_address?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_development_cache_token_address_fkey"
            columns: ["token_address"]
            isOneToOne: true
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address"]
          },
        ]
      }
      token_liquidity_cache: {
        Row: {
          cex_listings: number | null
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
            foreignKeyName: "token_liquidity_cache_token_address_fkey"
            columns: ["token_address"]
            isOneToOne: true
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address"]
          },
        ]
      }
      token_scans: {
        Row: {
          id: string
          pro_scan: boolean | null
          scanned_at: string | null
          score_total: number | null
          token_address: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          pro_scan?: boolean | null
          scanned_at?: string | null
          score_total?: number | null
          token_address?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          pro_scan?: boolean | null
          scanned_at?: string | null
          score_total?: number | null
          token_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_scans_token_address_fkey"
            columns: ["token_address"]
            isOneToOne: false
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address"]
          },
        ]
      }
      token_security_cache: {
        Row: {
          audit_status: string | null
          can_mint: boolean | null
          freeze_authority: boolean | null
          honeypot_detected: boolean | null
          multisig_status: string | null
          ownership_renounced: boolean | null
          score: number | null
          token_address: string
          updated_at: string | null
        }
        Insert: {
          audit_status?: string | null
          can_mint?: boolean | null
          freeze_authority?: boolean | null
          honeypot_detected?: boolean | null
          multisig_status?: string | null
          ownership_renounced?: boolean | null
          score?: number | null
          token_address: string
          updated_at?: string | null
        }
        Update: {
          audit_status?: string | null
          can_mint?: boolean | null
          freeze_authority?: boolean | null
          honeypot_detected?: boolean | null
          multisig_status?: string | null
          ownership_renounced?: boolean | null
          score?: number | null
          token_address?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_security_cache_token_address_fkey"
            columns: ["token_address"]
            isOneToOne: true
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address"]
          },
        ]
      }
      token_tokenomics_cache: {
        Row: {
          burn_mechanism: boolean | null
          circulating_supply: number | null
          distribution_score: string | null
          score: number | null
          supply_cap: number | null
          token_address: string
          treasury_usd: number | null
          tvl_usd: number | null
          updated_at: string | null
          vesting_schedule: string | null
        }
        Insert: {
          burn_mechanism?: boolean | null
          circulating_supply?: number | null
          distribution_score?: string | null
          score?: number | null
          supply_cap?: number | null
          token_address: string
          treasury_usd?: number | null
          tvl_usd?: number | null
          updated_at?: string | null
          vesting_schedule?: string | null
        }
        Update: {
          burn_mechanism?: boolean | null
          circulating_supply?: number | null
          distribution_score?: string | null
          score?: number | null
          supply_cap?: number | null
          token_address?: string
          treasury_usd?: number | null
          tvl_usd?: number | null
          updated_at?: string | null
          vesting_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_tokenomics_cache_token_address_fkey"
            columns: ["token_address"]
            isOneToOne: true
            referencedRelation: "token_data_cache"
            referencedColumns: ["token_address"]
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
      get_user_email_for_hubspot: {
        Args: { user_id: string }
        Returns: string
      }
      sync_all_users_to_hubspot: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

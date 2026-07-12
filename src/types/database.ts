export type UserRole = "owner" | "viewer";
export type Unit = "manager" | "reselling" | "agency" | "trading";
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "escalated";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type TradingMode = "paper" | "live";
export type LogLevel = "info" | "warn" | "error";
export type InventoryStatus = "sourcing" | "listed" | "sold" | "delisted";
export type Marketplace = "vinted" | "depop";
export type ListingStatus = "draft" | "pending_review" | "active" | "sold" | "delisted";
export type BuyerMessageStatus = "pending_draft" | "drafted" | "sent";
export type ClientStatus = "lead" | "proposal" | "active" | "delivered" | "billed";
export type DeliverableKind = "content" | "code" | "other";
export type DeliverableStatus = "pending_draft" | "drafted" | "approved" | "delivered";
export type OutreachChannel = "email" | "dm";
export type OutreachStatus = "pending_draft" | "drafted" | "sent";
export type InvoiceStatus = "draft" | "sent" | "overdue" | "paid";
export type TradeSide = "long" | "short";
export type TradeStatus = "open" | "closed" | "vetoed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          id: number;
          agents_paused: boolean;
          paused_at: string | null;
          paused_by: string | null;
          trading_mode: TradingMode;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["system_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["system_settings"]["Row"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          unit: Unit;
          type: string;
          status: TaskStatus;
          assigned_agent: string | null;
          priority: number;
          payload: Record<string, unknown>;
          result: Record<string, unknown> | null;
          error: string | null;
          retry_count: number;
          due_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unit: Unit;
          type: string;
          status?: TaskStatus;
          assigned_agent?: string | null;
          priority?: number;
          payload?: Record<string, unknown>;
          result?: Record<string, unknown> | null;
          error?: string | null;
          retry_count?: number;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      agent_logs: {
        Row: {
          id: string;
          agent: string;
          unit: Unit;
          task_id: string | null;
          action: string;
          detail: Record<string, unknown>;
          level: LogLevel;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent: string;
          unit: Unit;
          task_id?: string | null;
          action: string;
          detail?: Record<string, unknown>;
          level?: LogLevel;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_logs"]["Insert"]>;
        Relationships: [];
      };
      approvals: {
        Row: {
          id: string;
          unit: Unit;
          kind: string;
          task_id: string | null;
          title: string;
          summary: string | null;
          before: Record<string, unknown> | null;
          after: Record<string, unknown> | null;
          status: ApprovalStatus;
          requested_by: string;
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit: Unit;
          kind: string;
          task_id?: string | null;
          title: string;
          summary?: string | null;
          before?: Record<string, unknown> | null;
          after?: Record<string, unknown> | null;
          status?: ApprovalStatus;
          requested_by: string;
          decided_by?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["approvals"]["Insert"]>;
        Relationships: [];
      };
      agent_budgets: {
        Row: {
          agent: string;
          unit: Unit;
          max_actions_per_day: number | null;
          actions_today: number;
          max_tokens_per_day: number | null;
          tokens_today: number;
          period_start: string;
          updated_at: string;
        };
        Insert: {
          agent: string;
          unit: Unit;
          max_actions_per_day?: number | null;
          actions_today?: number;
          max_tokens_per_day?: number | null;
          tokens_today?: number;
          period_start?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_budgets"]["Insert"]>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          sku: string;
          title: string;
          brand: string | null;
          category: string | null;
          condition: string | null;
          description: string | null;
          cost_price: number;
          supplier_id: string | null;
          quantity_on_hand: number;
          reorder_point: number | null;
          photo_url: string | null;
          status: InventoryStatus;
          acquired_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          title: string;
          brand?: string | null;
          category?: string | null;
          condition?: string | null;
          description?: string | null;
          cost_price?: number;
          supplier_id?: string | null;
          quantity_on_hand?: number;
          reorder_point?: number | null;
          photo_url?: string | null;
          status?: InventoryStatus;
          acquired_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inventory_items"]["Insert"]>;
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          inventory_item_id: string;
          marketplace: Marketplace;
          external_url: string | null;
          title: string | null;
          description: string | null;
          category: string | null;
          keywords: string[] | null;
          list_price: number | null;
          currency: string;
          competitor_price: number | null;
          min_margin_pct: number;
          max_discount_pct: number;
          status: ListingStatus;
          listed_at: string | null;
          sold_at: string | null;
          sold_price: number | null;
          marketplace_fee: number | null;
          shipping_cost: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          inventory_item_id: string;
          marketplace: Marketplace;
          external_url?: string | null;
          title?: string | null;
          description?: string | null;
          category?: string | null;
          keywords?: string[] | null;
          list_price?: number | null;
          currency?: string;
          competitor_price?: number | null;
          min_margin_pct?: number;
          max_discount_pct?: number;
          status?: ListingStatus;
          listed_at?: string | null;
          sold_at?: string | null;
          sold_price?: number | null;
          marketplace_fee?: number | null;
          shipping_cost?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["listings"]["Insert"]>;
        Relationships: [];
      };
      buyer_messages: {
        Row: {
          id: string;
          listing_id: string;
          from_buyer: string;
          draft_reply: string | null;
          is_negative: boolean | null;
          status: BuyerMessageStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          from_buyer: string;
          draft_reply?: string | null;
          is_negative?: boolean | null;
          status?: BuyerMessageStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["buyer_messages"]["Insert"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          contact_name: string | null;
          contact_email: string | null;
          status: ClientStatus;
          value: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_name?: string | null;
          contact_email?: string | null;
          status?: ClientStatus;
          value?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      deliverables: {
        Row: {
          id: string;
          client_id: string;
          kind: DeliverableKind;
          title: string;
          brief: string | null;
          draft_content: string | null;
          qa_notes: string | null;
          status: DeliverableStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          kind?: DeliverableKind;
          title: string;
          brief?: string | null;
          draft_content?: string | null;
          qa_notes?: string | null;
          status?: DeliverableStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deliverables"]["Insert"]>;
        Relationships: [];
      };
      outreach_messages: {
        Row: {
          id: string;
          client_id: string;
          channel: OutreachChannel;
          to_contact: string | null;
          subject: string | null;
          draft_body: string | null;
          status: OutreachStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          channel?: OutreachChannel;
          to_contact?: string | null;
          subject?: string | null;
          draft_body?: string | null;
          status?: OutreachStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outreach_messages"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          client_id: string;
          amount: number;
          currency: string;
          status: InvoiceStatus;
          due_date: string | null;
          sent_at: string | null;
          paid_at: string | null;
          reminder_draft: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          amount: number;
          currency?: string;
          status?: InvoiceStatus;
          due_date?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          reminder_draft?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      trading_risk_rules: {
        Row: {
          id: number;
          starting_equity: number;
          max_daily_loss_pct: number;
          max_drawdown_pct: number;
          max_position_size: number;
          max_concurrent_trades: number;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["trading_risk_rules"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["trading_risk_rules"]["Row"]>;
        Relationships: [];
      };
      trades: {
        Row: {
          id: string;
          symbol: string;
          side: TradeSide;
          quantity: number;
          entry_price: number;
          exit_price: number | null;
          entry_at: string;
          exit_at: string | null;
          status: TradeStatus;
          rationale_entry: string | null;
          rationale_exit: string | null;
          pnl: number | null;
          veto_reason: string | null;
          alpaca_order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          side: TradeSide;
          quantity: number;
          entry_price: number;
          exit_price?: number | null;
          entry_at?: string;
          exit_at?: string | null;
          status?: TradeStatus;
          rationale_entry?: string | null;
          rationale_exit?: string | null;
          pnl?: number | null;
          veto_reason?: string | null;
          alpaca_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trades"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

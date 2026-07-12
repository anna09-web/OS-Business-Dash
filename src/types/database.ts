export type UserRole = "owner" | "viewer";
export type Unit = "manager" | "reselling" | "agency" | "trading";
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "escalated";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type TradingMode = "paper" | "live";
export type LogLevel = "info" | "warn" | "error";

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

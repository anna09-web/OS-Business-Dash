export type UserRole = "owner" | "viewer";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TransactionType = "income" | "expense";

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
          automations_paused: boolean;
          paused_at: string | null;
          paused_by: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["system_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["system_settings"]["Row"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          due_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          type: TransactionType;
          category: string;
          description: string | null;
          amount: number;
          occurred_on: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: TransactionType;
          category: string;
          description?: string | null;
          amount: number;
          occurred_on?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

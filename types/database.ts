export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          age: number | null;
          level: number;
          total_words_learned: number;
          total_practice_time: number;
          accuracy_rate: number;
          current_streak: number;
          longest_streak: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          age?: number | null;
          level?: number;
          total_words_learned?: number;
          total_practice_time?: number;
          accuracy_rate?: number;
          current_streak?: number;
          longest_streak?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          age?: number | null;
          level?: number;
          total_words_learned?: number;
          total_practice_time?: number;
          accuracy_rate?: number;
          current_streak?: number;
          longest_streak?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      learning_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_type: "chat" | "practice";
          words_practiced: string[];
          correct_pronunciations: number;
          total_attempts: number;
          session_duration: number;
          accuracy_rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_type: "chat" | "practice";
          words_practiced: string[];
          correct_pronunciations: number;
          total_attempts: number;
          session_duration: number;
          accuracy_rate: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_type?: "chat" | "practice";
          words_practiced?: string[];
          correct_pronunciations?: number;
          total_attempts?: number;
          session_duration?: number;
          accuracy_rate?: number;
          created_at?: string;
        };
      };
      word_progress: {
        Row: {
          id: string;
          user_id: string;
          word: string;
          difficulty: "easy" | "medium" | "hard";
          times_practiced: number;
          times_correct: number;
          last_practiced: string;
          mastery_level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          word: string;
          difficulty: "easy" | "medium" | "hard";
          times_practiced?: number;
          times_correct?: number;
          last_practiced?: string;
          mastery_level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          word?: string;
          difficulty?: "easy" | "medium" | "hard";
          times_practiced?: number;
          times_correct?: number;
          last_practiced?: string;
          mastery_level?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string;
          icon: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string;
          icon: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_type?: string;
          title?: string;
          description?: string;
          icon?: string;
          earned_at?: string;
        };
      };
      daily_goals: {
        Row: {
          id: string;
          user_id: string;
          goal_type: "words" | "time" | "accuracy";
          target_value: number;
          current_value: number;
          goal_date: string;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_type: "words" | "time" | "accuracy";
          target_value: number;
          current_value?: number;
          goal_date: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_type?: "words" | "time" | "accuracy";
          target_value?: number;
          current_value?: number;
          goal_date?: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      app_settings: {
        Row: {
          id: string;
          user_id: string;
          sound_enabled: boolean;
          notifications_enabled: boolean;
          dark_mode: boolean;
          speech_rate: number;
          difficulty_level: "beginner" | "intermediate" | "advanced";
          daily_word_goal: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sound_enabled?: boolean;
          notifications_enabled?: boolean;
          dark_mode?: boolean;
          speech_rate?: number;
          difficulty_level?: "beginner" | "intermediate" | "advanced";
          daily_word_goal?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sound_enabled?: boolean;
          notifications_enabled?: boolean;
          dark_mode?: boolean;
          speech_rate?: number;
          difficulty_level?: "beginner" | "intermediate" | "advanced";
          daily_word_goal?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

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
      coding_problems: {
        Row: {
          category: string
          constraints: string | null
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          examples: Json | null
          id: string
          is_public: boolean | null
          solution: string | null
          starter_code: Json | null
          test_cases: Json | null
          title: string
        }
        Insert: {
          category: string
          constraints?: string | null
          created_at?: string
          description: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          examples?: Json | null
          id?: string
          is_public?: boolean | null
          solution?: string | null
          starter_code?: Json | null
          test_cases?: Json | null
          title: string
        }
        Update: {
          category?: string
          constraints?: string | null
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          examples?: Json | null
          id?: string
          is_public?: boolean | null
          solution?: string | null
          starter_code?: Json | null
          test_cases?: Json | null
          title?: string
        }
        Relationships: []
      }
      coding_rounds: {
        Row: {
          company_name: string | null
          created_at: string
          difficulty: string
          id: string
          language: string
          questions: Json
          status: string
          target_role: string
          time_remaining_seconds: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          language?: string
          questions?: Json
          status?: string
          target_role: string
          time_remaining_seconds?: number | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          language?: string
          questions?: Json
          status?: string
          target_role?: string
          time_remaining_seconds?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coding_submissions: {
        Row: {
          ai_review: Json | null
          code: string
          id: string
          language: string
          memory_kb: number | null
          problem_id: string
          runtime_ms: number | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string
          test_results: Json | null
          user_id: string
        }
        Insert: {
          ai_review?: Json | null
          code: string
          id?: string
          language: string
          memory_kb?: number | null
          problem_id: string
          runtime_ms?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          test_results?: Json | null
          user_id: string
        }
        Update: {
          ai_review?: Json | null
          code?: string
          id?: string
          language?: string
          memory_kb?: number | null
          problem_id?: string
          runtime_ms?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          test_results?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_submissions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "coding_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_answers: {
        Row: {
          ai_feedback: Json | null
          answer_text: string | null
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          interview_id: string
          question_id: string
          score: number | null
        }
        Insert: {
          ai_feedback?: Json | null
          answer_text?: string | null
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          interview_id: string
          question_id: string
          score?: number | null
        }
        Update: {
          ai_feedback?: Json | null
          answer_text?: string | null
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          interview_id?: string
          question_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_answers_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          category: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          expected_answer: string | null
          id: string
          interview_id: string
          question_order: number
          question_text: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          expected_answer?: string | null
          id?: string
          interview_id: string
          question_order?: number
          question_text: string
        }
        Update: {
          category?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          expected_answer?: string | null
          id?: string
          interview_id?: string
          question_order?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          company_description: string | null
          company_name: string | null
          completed_at: string | null
          created_at: string
          currency: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes: number | null
          experience_required: string | null
          feedback: Json | null
          id: string
          job_description: string | null
          mode: Database["public"]["Enums"]["interview_mode"]
          overall_score: number | null
          requirements: string | null
          resume_url: string | null
          salary_max: number | null
          salary_min: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["interview_status"]
          target_role: string | null
          title: string
          type: Database["public"]["Enums"]["interview_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_description?: string | null
          company_name?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes?: number | null
          experience_required?: string | null
          feedback?: Json | null
          id?: string
          job_description?: string | null
          mode?: Database["public"]["Enums"]["interview_mode"]
          overall_score?: number | null
          requirements?: string | null
          resume_url?: string | null
          salary_max?: number | null
          salary_min?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["interview_status"]
          target_role?: string | null
          title: string
          type?: Database["public"]["Enums"]["interview_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_description?: string | null
          company_name?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes?: number | null
          experience_required?: string | null
          feedback?: Json | null
          id?: string
          job_description?: string | null
          mode?: Database["public"]["Enums"]["interview_mode"]
          overall_score?: number | null
          requirements?: string | null
          resume_url?: string | null
          salary_max?: number | null
          salary_min?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["interview_status"]
          target_role?: string | null
          title?: string
          type?: Database["public"]["Enums"]["interview_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          apply_url: string | null
          company: string
          company_logo: string | null
          created_at: string
          currency: string | null
          description: string | null
          experience_max: number | null
          experience_min: number | null
          id: string
          is_active: boolean | null
          job_type: string | null
          location: string | null
          posted_at: string | null
          requirements: Json | null
          salary_max: number | null
          salary_min: number | null
          skills_required: string[] | null
          source: string | null
          title: string
        }
        Insert: {
          apply_url?: string | null
          company: string
          company_logo?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          experience_max?: number | null
          experience_min?: number | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          location?: string | null
          posted_at?: string | null
          requirements?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          source?: string | null
          title: string
        }
        Update: {
          apply_url?: string | null
          company?: string
          company_logo?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          experience_max?: number | null
          experience_min?: number | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          location?: string | null
          posted_at?: string | null
          requirements?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          experience_years: number | null
          full_name: string | null
          github_url: string | null
          headline: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          portfolio_url: string | null
          skills: string[] | null
          target_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          full_name?: string | null
          github_url?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          target_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          full_name?: string | null
          github_url?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          target_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          coding_submission_id: string | null
          created_at: string
          data: Json | null
          id: string
          improvements: Json | null
          interview_id: string | null
          overall_score: number | null
          recommendations: Json | null
          report_type: string
          strengths: Json | null
          title: string
          user_id: string
        }
        Insert: {
          coding_submission_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          improvements?: Json | null
          interview_id?: string | null
          overall_score?: number | null
          recommendations?: Json | null
          report_type: string
          strengths?: Json | null
          title: string
          user_id: string
        }
        Update: {
          coding_submission_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          improvements?: Json | null
          interview_id?: string | null
          overall_score?: number | null
          recommendations?: Json | null
          report_type?: string
          strengths?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_coding_submission_id_fkey"
            columns: ["coding_submission_id"]
            isOneToOne: false
            referencedRelation: "coding_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          ats_score: number | null
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          parsed_data: Json | null
          skill_gaps: Json | null
          suggestions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          parsed_data?: Json | null
          skill_gaps?: Json | null
          suggestions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ats_score?: number | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          parsed_data?: Json | null
          skill_gaps?: Json | null
          suggestions?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          applied_at: string | null
          created_at: string
          id: string
          job_id: string
          match_score: number | null
          notes: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          id?: string
          job_id: string
          match_score?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          id?: string
          job_id?: string
          match_score?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      difficulty_level: "easy" | "medium" | "hard"
      interview_mode: "text" | "voice" | "avatar"
      interview_status: "setup" | "in_progress" | "completed" | "cancelled"
      interview_type: "behavioral" | "technical" | "system_design" | "mixed"
      job_status:
        | "active"
        | "saved"
        | "applied"
        | "interviewing"
        | "rejected"
        | "offered"
      submission_status:
        | "pending"
        | "running"
        | "accepted"
        | "wrong_answer"
        | "time_limit"
        | "runtime_error"
        | "compilation_error"
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
      difficulty_level: ["easy", "medium", "hard"],
      interview_mode: ["text", "voice", "avatar"],
      interview_status: ["setup", "in_progress", "completed", "cancelled"],
      interview_type: ["behavioral", "technical", "system_design", "mixed"],
      job_status: [
        "active",
        "saved",
        "applied",
        "interviewing",
        "rejected",
        "offered",
      ],
      submission_status: [
        "pending",
        "running",
        "accepted",
        "wrong_answer",
        "time_limit",
        "runtime_error",
        "compilation_error",
      ],
    },
  },
} as const

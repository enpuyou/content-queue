export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  email_token?: string; // For email-to-save feature
}

export interface ContentItem {
  id: string;
  user_id: string;
  original_url: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  content_type: string | null;
  tags: string[] | null;
  full_text: string | null;
  word_count: number | null;
  reading_time_minutes: number | null;
  is_read: boolean;
  is_archived: boolean;
  read_position?: number;
  reading_status: "unread" | "in_progress" | "read" | "archived";
  processing_status: string;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  content_count?: number;
}

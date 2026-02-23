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
  summary?: string | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  auto_tags?: string[] | null;
  full_text: string | null;
  word_count: number | null;
  reading_time_minutes: number | null;
  is_academic?: boolean;
  content_type: "article" | "video" | "pdf" | "tweet" | "unknown";
  content_vertical: "general" | "academic" | "recipe" | "repository" | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vertical_metadata?: Record<string, any>;
  author: string | null;
  published_date: string | null;
  is_read: boolean;
  is_archived: boolean;
  read_position?: number;
  reading_status: "unread" | "in_progress" | "read" | "archived";
  processing_status: string;
  processing_error?: string;
  created_at: string;
  updated_at: string;
}

export interface VinylTrack {
  position: string;
  title: string;
  duration: string | null;
}

export interface VinylVideo {
  title: string | null;
  uri: string;
  duration: number | null;
}

export interface VinylRecord {
  id: string;
  user_id: string;
  discogs_url: string;
  discogs_release_id: number | null;
  title: string | null;
  artist: string | null;
  label: string | null;
  catalog_number: string | null;
  year: number | null;
  cover_url: string | null;
  genres: string[];
  styles: string[];
  tracklist: VinylTrack[];
  videos: VinylVideo[];
  notes: string | null;
  rating: number | null;
  tags: string[];
  status: "collection" | "wantlist" | "library";
  processing_status: string;
  processing_error: string | null;
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

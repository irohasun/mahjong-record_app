// Enhanced Authentication Types

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  social_links: Record<string, any>;
  preferences: UserPreferences;
  privacy_settings: PrivacySettings;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  game_settings: {
    default_game_type: '東風戦' | '東南戦';
    auto_save: boolean;
    show_advanced_stats: boolean;
  };
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  show_email: boolean;
  show_stats: boolean;
  allow_friend_requests: boolean;
}

export interface EnhancedAccount {
  id: string;
  username: string;
  email: string | null;
  email_verified: boolean;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  preferred_language: string;
  timezone: string;
  last_login_at: string | null;
  status: 'active' | 'suspended' | 'deleted';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_premium: boolean;
  purchase_date: string | null;
  monthly_game_count: number;
  last_reset_date: string;
}

export interface UserRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  created_at: string;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_info: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  last_accessed_at: string;
  created_at: string;
}

export interface AuthContextType {
  user: EnhancedAccount | null;
  profile: UserProfile | null;
  permissions: string[];
  loading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateAccount: (updates: Partial<EnhancedAccount>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  username?: string;
  display_name?: string;
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}
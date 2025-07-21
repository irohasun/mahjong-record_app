import { supabase } from '@/lib/supabase';
import { UserProfile, UserPreferences, PrivacySettings } from '@/types/auth';

export class ProfileService {
  static async getProfile(userId: string): Promise<UserProfile> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      return profile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw new Error('プロフィールの取得に失敗しました');
    }
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      // First try to update existing profile
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { data: updatedProfile, error } = await supabase
          .from('user_profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return updatedProfile;
      } else {
        // Create new profile
        const { data: newProfile, error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            ...updates,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return newProfile;
      }
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw new Error('プロフィールの更新に失敗しました');
    }
  }

  static async createDefaultProfile(userId: string, displayName?: string): Promise<UserProfile> {
    try {
      const defaultPreferences: UserPreferences = {
        language: 'ja',
        timezone: 'Asia/Tokyo',
        theme: 'auto',
        notifications: {
          email: true,
          push: true,
          marketing: false,
        },
        game_settings: {
          default_game_type: '東南戦',
          auto_save: true,
          show_advanced_stats: true,
        },
      };

      const defaultPrivacySettings: PrivacySettings = {
        profile_visibility: 'private',
        show_email: false,
        show_stats: true,
        allow_friend_requests: true,
      };

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          display_name: displayName || 'プレイヤー',
          preferences: defaultPreferences,
          privacy_settings: defaultPrivacySettings,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return profile;
    } catch (error) {
      console.error('Failed to create default profile:', error);
      throw new Error('デフォルトプロフィールの作成に失敗しました');
    }
  }

  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_permissions', { user_id: userId });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return ['read_own_data', 'write_own_data']; // Default permissions
    }
  }

  static async assignRole(userId: string, roleName: string): Promise<void> {
    try {
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('name', roleName)
        .single();

      if (roleError) {
        throw roleError;
      }

      const { error: assignError } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: role.id,
        });

      if (assignError && assignError.code !== '23505') { // Ignore duplicate key errors
        throw assignError;
      }
    } catch (error) {
      console.error('Failed to assign role:', error);
      throw new Error('ロールの割り当てに失敗しました');
    }
  }

  static async removeRole(userId: string, roleName: string): Promise<void> {
    try {
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('name', roleName)
        .single();

      if (roleError) {
        throw roleError;
      }

      const { error } = await supabase
        .from('user_role_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', role.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to remove role:', error);
      throw new Error('ロールの削除に失敗しました');
    }
  }

  static async getUserRoles(userId: string): Promise<string[]> {
    try {
      const { data: assignments, error } = await supabase
        .from('user_role_assignments')
        .select(`
          user_roles(name)
        `)
        .eq('user_id', userId)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (error) {
        throw error;
      }

      return assignments?.map(a => a.user_roles.name) || [];
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return [];
    }
  }

  static async deleteProfile(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
      throw new Error('プロフィールの削除に失敗しました');
    }
  }
}
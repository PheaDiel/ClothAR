import { supabase } from './supabase';
import { User, NotificationSettings, PasswordResetRequest, AccountDeletionRequest, DataExportRequest } from '../types';

export class ProfileService {
  /**
   * Update user profile information
   */
  static async updateProfile(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          phone: updates.phone,
          full_name: updates.full_name,
          date_of_birth: updates.date_of_birth,
          gender: updates.gender,
          province_code: updates.province_code,
          province_name: updates.province_name,
          city_code: updates.city_code,
          city_name: updates.city_name,
          barangay: updates.barangay,
          measurements: updates.measurements,
          profile_complete: updates.profileComplete,
          avatar_url: updates.avatar_url,
          marketing_email_consent: updates.marketing_email_consent,
          notification_settings: updates.notification_settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(settings: NotificationSettings): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_settings: settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Notification settings update error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload avatar to Supabase Storage
   */
  static async uploadAvatar(imageUri: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create unique filename
      const fileExt = imageUri.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const updateResult = await this.updateProfile({ avatar_url: publicUrl });
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      return { success: true, url: publicUrl };
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete avatar from storage and profile
   */
  static async deleteAvatar(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get current profile to find avatar URL
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (profile?.avatar_url) {
        // Extract filename from URL
        const urlParts = profile.avatar_url.split('/');
        const fileName = urlParts[urlParts.length - 1];

        // Delete from storage
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${fileName}`]);
      }

      // Update profile to remove avatar URL
      const updateResult = await this.updateProfile({ avatar_url: undefined });
      return updateResult;
    } catch (error: any) {
      console.error('Avatar delete error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'clothar://reset-password',
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Password reset request error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update password (requires current session)
   */
  static async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Update password_changed_at in profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ password_changed_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Password update error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request account deletion
   */
  static async requestAccountDeletion(request: AccountDeletionRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      if (!request.confirm_deletion) {
        return { success: false, error: 'Account deletion must be confirmed' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          account_deletion_requested: true,
          account_deletion_requested_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Account deletion request error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request data export
   */
  static async requestDataExport(request: DataExportRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          data_export_requested: true,
          data_export_requested_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Data export request error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user data for export
   */
  static async exportUserData(includeSensitive: boolean = false): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Get user preferences
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get user favorites
      const { data: favorites } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id);

      const exportData = {
        profile: includeSensitive ? profile : {
          ...profile,
          // Remove sensitive fields unless explicitly requested
          two_factor_secret: undefined,
          account_locked_until: undefined,
          failed_login_attempts: undefined,
        },
        preferences,
        favorites,
        exported_at: new Date().toISOString(),
      };

      return { success: true, data: exportData };
    } catch (error: any) {
      console.error('Data export error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        return { success: false, error: 'User email not found' };
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Email verification send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update verification status
   */
  static async updateVerificationStatus(status: 'verified' | 'reminded'): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const updates: any = {
        verification_status: status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'reminded') {
        updates.verification_reminder_sent_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Verification status update error:', error);
      return { success: false, error: error.message };
    }
  }
}
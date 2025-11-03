import { supabase } from './supabase';
import { Measurement } from '../types';

export class MeasurementService {
  /**
   * Get all measurements for the current user
   */
  static async getUserMeasurements(): Promise<{ success: boolean; measurements?: Measurement[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: measurements, error } = await supabase
        .from('user_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, measurements };
    } catch (error: any) {
      console.error('Get user measurements error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new measurement profile
   */
  static async createMeasurement(measurementData: {
    name: string;
    measurements: Record<string, number>;
    notes?: string;
    isDefault?: boolean;
  }): Promise<{ success: boolean; measurement?: Measurement; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // If setting as default, unset other defaults
      if (measurementData.isDefault) {
        await supabase
          .from('user_measurements')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data: measurement, error } = await supabase
        .from('user_measurements')
        .insert({
          user_id: user.id,
          name: measurementData.name,
          measurements: measurementData.measurements,
          notes: measurementData.notes,
          is_default: measurementData.isDefault || false,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, measurement };
    } catch (error: any) {
      console.error('Create measurement error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing measurement profile
   */
  static async updateMeasurement(
    measurementId: string,
    updates: Partial<{
      name: string;
      measurements: Record<string, number>;
      notes: string;
      isDefault: boolean;
    }>
  ): Promise<{ success: boolean; measurement?: Measurement; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await supabase
          .from('user_measurements')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data: measurement, error } = await supabase
        .from('user_measurements')
        .update({
          name: updates.name,
          measurements: updates.measurements,
          notes: updates.notes,
          is_default: updates.isDefault,
          updated_at: new Date().toISOString(),
        })
        .eq('id', measurementId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, measurement };
    } catch (error: any) {
      console.error('Update measurement error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a measurement profile
   */
  static async deleteMeasurement(measurementId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('user_measurements')
        .delete()
        .eq('id', measurementId)
        .eq('user_id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Delete measurement error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get default measurement for user
   */
  static async getDefaultMeasurement(): Promise<{ success: boolean; measurement?: Measurement; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: measurement, error } = await supabase
        .from('user_measurements')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

      return { success: true, measurement };
    } catch (error: any) {
      console.error('Get default measurement error:', error);
      return { success: false, error: error.message };
    }
  }
}
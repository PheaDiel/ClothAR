import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImagePickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  mediaTypes?: ImagePicker.MediaTypeOptions;
  base64?: boolean;
}

export class StorageService {
  private static readonly BUCKET_NAME = 'product-images';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /**
   * Request camera permissions
   */
  static async requestCameraPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request media library permissions
   */
  static async requestMediaLibraryPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Pick image from camera
   */
  static async pickFromCamera(options: ImagePickerOptions = {}): Promise<ImagePicker.ImagePickerResult> {
    const hasPermission = await this.requestCameraPermissions();
    if (!hasPermission) {
      throw new Error('Camera permission is required');
    }

    return await ImagePicker.launchCameraAsync({
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect ?? [4, 3],
      quality: options.quality ?? 0.8,
      base64: options.base64 ?? false,
      mediaTypes: options.mediaTypes ?? ImagePicker.MediaTypeOptions.Images,
    });
  }

  /**
   * Pick image from media library
   */
  static async pickFromLibrary(options: ImagePickerOptions = {}): Promise<ImagePicker.ImagePickerResult> {
    const hasPermission = await this.requestMediaLibraryPermissions();
    if (!hasPermission) {
      throw new Error('Media library permission is required');
    }

    return await ImagePicker.launchImageLibraryAsync({
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect ?? [4, 3],
      quality: options.quality ?? 0.8,
      allowsMultipleSelection: options.allowsMultipleSelection ?? false,
      base64: options.base64 ?? false,
      mediaTypes: options.mediaTypes ?? ImagePicker.MediaTypeOptions.Images,
    });
  }

  /**
   * Compress and resize image
   */
  static async compressImage(uri: string, options: {
    compress?: number;
    format?: ImageManipulator.SaveFormat;
    resize?: { width: number; height: number };
  } = {}): Promise<string> {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      options.resize ? [{ resize: options.resize }] : [],
      {
        compress: options.compress ?? 0.8,
        format: options.format ?? ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipResult.uri;
  }

  /**
   * Validate image file
   */
  static validateImage(uri: string, fileSize?: number): { valid: boolean; error?: string } {
    // Check file size
    if (fileSize && fileSize > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size must be less than ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    // Check file extension
    const extension = uri.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: 'Only JPG, PNG, and WebP images are allowed'
      };
    }

    return { valid: true };
  }

  /**
   * Check if current user has admin privileges
   */
  private static async checkIfUserIsAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, role_status')
        .eq('id', user.id)
        .single();

      return profile?.role === 'admin' || profile?.role === 'shop_owner';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Upload image via Edge Function for admin users (secure)
   */
  private static async uploadViaEdgeFunction(
    uri: string,
    fileName: string,
    folder: 'products' | 'virtual-tryon' = 'products'
  ): Promise<UploadResult> {
    try {
      console.log('🔄 StorageService: Uploading via Edge Function for admin...');

      // Get file blob and read as base64
      const response = await fetch(uri);
      const blob = await response.blob();

      // Convert blob to base64 using FileReader (works in React Native)
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(blob);
      });

      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'User not authenticated' };
      }

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('admin-upload', {
        body: {
          fileName,
          folder,
          fileData: base64Data,
          contentType: blob.type
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('❌ Edge Function error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('❌ Edge Function returned error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('✅ Edge Function upload successful');
      return { success: true, url: data.url };

    } catch (error: any) {
      console.error('❌ Edge Function upload exception:', error);
      return { success: false, error: error.message || 'Edge Function upload failed' };
    }
  }

  /**
   * Upload image to Supabase Storage with fallback handling
   */
  static async uploadImage(
    uri: string,
    fileName: string,
    folder: 'products' | 'virtual-tryon' = 'products'
  ): Promise<UploadResult> {
    try {
      console.log('🔄 StorageService: Starting image upload process...');
      console.log('📁 Upload details:', { uri, fileName, folder });

      // Check if user is admin - if so, use secure Edge Function
      const isAdmin = await this.checkIfUserIsAdmin();
      if (isAdmin) {
        console.log('👑 User is admin, using secure Edge Function upload');
        return this.uploadViaEdgeFunction(uri, fileName, folder);
      }

      console.log('👤 User is not admin, using standard upload with RLS policies');

      // Get file info
      console.log('🔄 StorageService: Fetching image blob...');
      const response = await fetch(uri);
      const blob = await response.blob();
      console.log('✅ StorageService: Blob fetched, size:', blob.size, 'type:', blob.type);

      // Validate image
      const validation = this.validateImage(uri, blob.size);
      if (!validation.valid) {
        console.error('❌ StorageService: Image validation failed:', validation.error);
        return { success: false, error: validation.error };
      }
      console.log('✅ StorageService: Image validation passed');

      // Compress image for upload (preserve original aspect ratio)
      console.log('🔄 StorageService: Compressing image...');
      const compressedUri = await this.compressImage(uri, {
        compress: 0.8,
        // Remove fixed resize to preserve original scale/aspect ratio
      });
      console.log('✅ StorageService: Image compressed');

      // Get compressed blob - React Native compatible approach
      const compressedResponse = await fetch(compressedUri);
      const compressedBlob = await compressedResponse.blob();

      // Convert blob to Uint8Array for Supabase upload (React Native compatible)
      const arrayBuffer = await new Promise<Uint8Array>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as ArrayBuffer;
          resolve(new Uint8Array(result));
        };
        reader.onerror = () => reject(new Error('Failed to read compressed file'));
        reader.readAsArrayBuffer(compressedBlob);
      });

      console.log('✅ StorageService: Compressed blob ready, size:', compressedBlob.size);

      // Generate unique filename
      const timestamp = Date.now();
      const extension = fileName.split('.').pop() || 'jpg';
      const uniqueFileName = `${folder}/${timestamp}_${Math.random().toString(36).substring(2)}.${extension}`;
      console.log('📝 StorageService: Generated filename:', uniqueFileName);

      // Check Supabase connection with timeout
      console.log('🔄 StorageService: Checking Supabase connection...');
      try {
        const connectionTest = Promise.race([
          supabase.storage.from(this.BUCKET_NAME).list('', { limit: 1 }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 15000) // Increased timeout
          )
        ]);

        const { data: testData, error: testError } = await connectionTest as any;
        if (testError) {
          console.error('❌ StorageService: Supabase connection test failed:', testError);
          console.error('❌ Error details:', {
            message: testError.message,
            statusCode: testError.statusCode,
            details: testError.details
          });

          // Check if it's a network issue vs permission issue
          if (testError.message?.includes('fetch') || testError.message?.includes('network')) {
            return { success: false, error: 'Network connection failed. Please check your internet connection and try again.' };
          } else if (testError.message?.includes('permission') || testError.message?.includes('policy')) {
            return { success: false, error: 'Access denied. Please contact administrator.' };
          } else {
            return { success: false, error: `Connection test failed: ${testError.message}` };
          }
        }
        console.log('✅ StorageService: Supabase connection OK');
      } catch (connError: any) {
        console.error('❌ StorageService: Supabase connection exception:', connError);
        if (connError.message === 'Connection timeout') {
          return { success: false, error: 'Network timeout. Please check your internet connection and try again.' };
        }
        return { success: false, error: `Network error: ${connError.message}` };
      }

      // Upload to Supabase Storage with timeout
      console.log('🔄 StorageService: Uploading to Supabase Storage...');
      try {
        const uploadPromise = supabase.storage
          .from(this.BUCKET_NAME)
          .upload(uniqueFileName, arrayBuffer, {
            contentType: compressedBlob.type,
            upsert: false
          });

        const uploadWithTimeout = Promise.race([
          uploadPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Upload timeout')), 30000)
          )
        ]);

        const { data, error } = await uploadWithTimeout as any;

        if (error) {
          console.error('❌ StorageService: Upload error:', error);
          console.error('❌ StorageService: Error details:', {
            message: error.message,
            statusCode: error.statusCode,
            error: error.error
          });

          // Provide more specific error messages
          if (error.message?.includes('JWT')) {
            return { success: false, error: 'Authentication error. Please log out and log back in.' };
          } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
            return { success: false, error: 'Permission denied. Please contact administrator.' };
          } else if (error.message?.includes('storage') || error.message?.includes('bucket')) {
            return { success: false, error: 'Storage configuration error. Please contact administrator.' };
          }

          return { success: false, error: error.message };
        }

        console.log('✅ StorageService: Upload successful, data:', data);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(uniqueFileName);

        console.log('✅ StorageService: Public URL generated:', urlData.publicUrl);

        return {
          success: true,
          url: urlData.publicUrl
        };

      } catch (uploadError: any) {
        console.error('❌ StorageService: Upload timeout or exception:', uploadError);
        if (uploadError.message === 'Upload timeout') {
          return { success: false, error: 'Upload timeout. Please check your internet connection and try again.' };
        }
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }

    } catch (error: any) {
      console.error('❌ StorageService: Image upload exception:', error);
      console.error('❌ StorageService: Exception details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Provide user-friendly error messages
      if (error.message?.includes('Network request failed')) {
        return { success: false, error: 'Network request failed. Please check your internet connection and try again.' };
      } else if (error.message?.includes('timeout')) {
        return { success: false, error: 'Request timeout. Please try again.' };
      }

      return {
        success: false,
        error: error.message || 'Failed to upload image'
      };
    }
  }

  /**
   * Upload multiple images with retry logic
   */
  static async uploadMultipleImages(
    uris: string[],
    folder: 'products' | 'virtual-tryon' = 'products',
    onProgress?: (completed: number, total: number) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    let completed = 0;

    for (const uri of uris) {
      const fileName = `image_${completed + 1}.jpg`;

      // Retry logic for failed uploads
      let result: UploadResult;
      let attempts = 0;
      const maxAttempts = 3;

      do {
        attempts++;
        console.log(`🔄 StorageService: Upload attempt ${attempts}/${maxAttempts} for image ${completed + 1}`);
        result = await this.uploadImage(uri, fileName, folder);

        if (!result.success && attempts < maxAttempts) {
          console.log(`⏳ StorageService: Upload failed, retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } while (!result.success && attempts < maxAttempts);

      results.push(result);
      completed++;
      onProgress?.(completed, uris.length);
    }

    return results;
  }

  /**
   * Delete image from storage
   */
  static async deleteImage(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract file path from URL
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const folder = urlParts[urlParts.length - 2];

      if (!fileName || !folder) {
        return { success: false, error: 'Invalid image URL' };
      }

      const filePath = `${folder}/${fileName}`;

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error: any) {
      console.error('Image delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete image'
      };
    }
  }

  /**
   * Test basic connectivity to Supabase
   */
  static async testConnectivity(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('🔄 StorageService: Testing Supabase connectivity...');

      // Test 1: Basic Supabase client connection
      console.log('🔄 Testing basic Supabase client...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Session test failed:', sessionError);
        return { success: false, error: 'Authentication error', details: sessionError };
      }
      console.log('✅ Session test passed');

      // Test 2: Storage bucket access
      console.log('🔄 Testing storage bucket access...');
      const { data: listData, error: listError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 });

      if (listError) {
        console.error('❌ Storage list test failed:', listError);
        return { success: false, error: 'Storage access error', details: listError };
      }
      console.log('✅ Storage access test passed');

      // Test 3: Network connectivity to Supabase URL
      console.log('🔄 Testing network connectivity...');
      const supabaseUrl = 'https://cllrgwibouypimgccfng.supabase.co'; // From .env
      const testResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbHJnd2lib3V5cGltZ2NjZm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NzQ5OTcsImV4cCI6MjA3NTI1MDk5N30.eFBPyDT8jpDBB15yrvKRkweVB4tBSKI2ENFbSIPj0sM',
        },
      });

      if (!testResponse.ok) {
        console.error('❌ Network test failed:', testResponse.status, testResponse.statusText);
        return { success: false, error: 'Network connectivity error', details: { status: testResponse.status, statusText: testResponse.statusText } };
      }
      console.log('✅ Network connectivity test passed');

      return { success: true };

    } catch (error: any) {
      console.error('❌ Connectivity test exception:', error);
      return {
        success: false,
        error: 'Connectivity test failed',
        details: {
          message: error.message,
          name: error.name,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Get image picker options for different use cases
   */
  static getImagePickerOptions(forVirtualTryOn = false): ImagePickerOptions {
    if (forVirtualTryOn) {
      return {
        allowsEditing: true,
        aspect: [1, 1], // Square for virtual try-on overlays
        quality: 0.9, // Higher quality for PNG overlays
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      };
    }

    return {
      allowsEditing: true,
      aspect: [4, 3], // Standard photo aspect ratio
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    };
  }
}
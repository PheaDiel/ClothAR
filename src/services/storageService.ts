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
   * Upload image to Supabase Storage
   */
  static async uploadImage(
    uri: string,
    fileName: string,
    folder: 'products' | 'virtual-tryon' = 'products'
  ): Promise<UploadResult> {
    try {
      // Get file info
      const response = await fetch(uri);
      const blob = await response.blob();

      // Validate image
      const validation = this.validateImage(uri, blob.size);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Compress image for upload
      const compressedUri = await this.compressImage(uri, {
        compress: 0.8,
        resize: { width: 1200, height: 1200 } // Max dimensions
      });

      // Get compressed blob
      const compressedResponse = await fetch(compressedUri);
      const compressedBlob = await compressedResponse.blob();

      // Generate unique filename
      const timestamp = Date.now();
      const extension = fileName.split('.').pop() || 'jpg';
      const uniqueFileName = `${folder}/${timestamp}_${Math.random().toString(36).substring(2)}.${extension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(uniqueFileName, compressedBlob, {
          contentType: compressedBlob.type,
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(uniqueFileName);

      return {
        success: true,
        url: urlData.publicUrl
      };

    } catch (error: any) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload image'
      };
    }
  }

  /**
   * Upload multiple images
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
      const result = await this.uploadImage(uri, fileName, folder);
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
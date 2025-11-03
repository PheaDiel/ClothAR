-- Migration 05: Supabase Storage Setup
-- Run this in your Supabase SQL Editor to set up storage buckets

-- ============================================
-- Create Storage Buckets
-- ============================================

-- Create avatars bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create ar-models bucket for AR clothing models (future use)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ar-models',
  'ar-models',
  true,
  52428800, -- 50MB limit for 3D models
  ARRAY['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']
);

-- ============================================
-- Storage Policies for Avatars
-- ============================================

-- Allow users to view all avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- Storage Policies for AR Models (Future Use)
-- ============================================

-- Allow public access to AR models
CREATE POLICY "AR models are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'ar-models');

-- Allow authenticated tailors/shop owners to upload AR models
CREATE POLICY "Tailors and shop owners can upload AR models" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ar-models'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('tailor', 'shop_owner')
      AND role_status = 'approved'
    )
  );

-- Allow tailors/shop owners to update their AR models
CREATE POLICY "Tailors and shop owners can update AR models" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ar-models'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('tailor', 'shop_owner')
      AND role_status = 'approved'
    )
  );

-- Allow tailors/shop owners to delete their AR models
CREATE POLICY "Tailors and shop owners can delete AR models" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ar-models'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('tailor', 'shop_owner')
      AND role_status = 'approved'
    )
  );

COMMENT ON POLICY "Avatar images are publicly accessible" ON storage.objects IS 'Allows public access to user avatar images';
COMMENT ON POLICY "Users can upload their own avatar" ON storage.objects IS 'Allows authenticated users to upload avatars to their own folder';
COMMENT ON POLICY "AR models are publicly accessible" ON storage.objects IS 'Allows public access to AR clothing models for try-on features';
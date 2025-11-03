-- Migration 04: Enhanced Profiles for Account Management
-- Run this in your Supabase SQL Editor after 03-functions-triggers.sql

-- ============================================
-- Enhanced Profiles Table
-- ============================================

-- Add optional metadata fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Account management fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_email_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email": {"orders": true, "promotions": false, "updates": true},
  "push": {"orders": true, "promotions": false}
}'::jsonb;

-- Verification system (email only, no SMS)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'reminded'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_reminder_sent_at TIMESTAMPTZ;

-- Two-factor authentication (future implementation)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Account management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_deletion_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_deletion_requested_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_export_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_export_requested_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.full_name IS 'Optional full name for enhanced personalization';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'Optional date of birth for age verification and personalization';
COMMENT ON COLUMN public.profiles.gender IS 'Optional gender preference for personalization';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar stored in Supabase Storage';
COMMENT ON COLUMN public.profiles.marketing_email_consent IS 'User consent for marketing emails';
COMMENT ON COLUMN public.profiles.notification_settings IS 'Granular notification preferences for email and push';
COMMENT ON COLUMN public.profiles.verification_status IS 'Email verification status: pending, verified, or reminded';
COMMENT ON COLUMN public.profiles.two_factor_enabled IS 'Whether two-factor authentication is enabled';
COMMENT ON COLUMN public.profiles.account_deletion_requested IS 'Whether user has requested account deletion';
COMMENT ON COLUMN public.profiles.data_export_requested IS 'Whether user has requested data export';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_account_deletion ON public.profiles(account_deletion_requested) WHERE account_deletion_requested = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_data_export ON public.profiles(data_export_requested) WHERE data_export_requested = TRUE;

-- ============================================
-- Clothing Items Table for AR Features
-- ============================================

CREATE TABLE IF NOT EXISTS public.clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- shirt, pants, dress, etc.
  description TEXT,
  sizes JSONB, -- available sizes with measurements
  colors JSONB, -- available colors with hex codes
  images JSONB, -- array of image URLs
  ar_model_url TEXT, -- URL to AR model file
  price DECIMAL(10,2),
  in_stock BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view clothing items" ON public.clothing_items
  FOR SELECT USING (true);

-- Create indexes
CREATE INDEX idx_clothing_items_category ON public.clothing_items(category);
CREATE INDEX idx_clothing_items_in_stock ON public.clothing_items(in_stock) WHERE in_stock = TRUE;

COMMENT ON TABLE public.clothing_items IS 'Catalog of clothing items for AR try-on features';

-- ============================================
-- User Preferences Table for AR
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  preferred_styles TEXT[], -- casual, formal, sporty, etc.
  favorite_colors TEXT[], -- color preferences
  body_type TEXT, -- ectomorph, mesomorph, endomorph
  skin_tone TEXT, -- for color matching
  budget_range JSONB, -- min/max price preferences
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_preferences IS 'User style and preference data for AR recommendations';

-- ============================================
-- User Favorites Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clothing_item_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, clothing_item_id)
);

-- Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own favorites" ON public.user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON public.user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON public.user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_item_id ON public.user_favorites(clothing_item_id);

COMMENT ON TABLE public.user_favorites IS 'User favorite clothing items for quick access';

-- ============================================
-- Update Trigger for Enhanced Profiles
-- ============================================

-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    phone,
    role,
    role_status,
    email_verified,
    phone_verified,
    password_changed_at,
    verification_status,
    full_name,
    date_of_birth,
    gender,
    marketing_email_consent
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' = 'customer' THEN 'approved'
      ELSE 'pending'
    END,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
    FALSE,
    NOW(),
    CASE
      WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified'
      ELSE 'pending'
    END,
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN NEW.raw_user_meta_data->>'date_of_birth' != '' THEN (NEW.raw_user_meta_data->>'date_of_birth')::DATE
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'gender',
    COALESCE((NEW.raw_user_meta_data->>'marketing_email_consent')::BOOLEAN, FALSE)
  );

  -- Log the registration
  PERFORM public.log_audit_event(
    NEW.id,
    'user_registered',
    'user',
    NEW.id::TEXT,
    jsonb_build_object(
      'email', NEW.email,
      'role', COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates enhanced profile and logs audit event when new user registers';
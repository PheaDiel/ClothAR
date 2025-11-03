import { createClient } from '@supabase/supabase-js'
import { supabaseConfig } from '../config/env'

// Use centralized configuration
const supabaseUrl = supabaseConfig.url
const supabaseAnonKey = supabaseConfig.anonKey

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Admin client for server-side operations (use with caution)
export const supabaseAdmin = supabaseConfig.serviceRoleKey
  ? createClient(supabaseUrl, supabaseConfig.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null
// @deno-types="https://deno.land/x/types/deno.d.ts"

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Type definitions for Deno global
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface UploadRequest {
  fileName: string
  folder: string
  fileData: string // base64 encoded file
  contentType: string
}

Deno.serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Create admin client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if user has admin/shop_owner role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, role_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!['admin', 'shop_owner'].includes(profile.role) || profile.role_status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const { fileName, folder, fileData, contentType }: UploadRequest = await req.json()

    if (!fileName || !folder || !fileData || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Convert base64 to blob
    const fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0))

    // Generate unique filename
    const timestamp = Date.now()
    const extension = fileName.split('.').pop() || 'jpg'
    const uniqueFileName = `${folder}/${timestamp}_${Math.random().toString(36).substring(2)}.${extension}`

    // Upload file using admin client
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(uniqueFileName, fileBuffer, {
        contentType: contentType,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(uniqueFileName)

    return new Response(JSON.stringify({
      success: true,
      url: urlData.publicUrl,
      fileName: uniqueFileName
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
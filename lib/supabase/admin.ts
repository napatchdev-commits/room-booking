import { createClient } from '@supabase/supabase-js';

function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim();
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  clean = clean.replace(/\/+$/, '');
  return clean;
}

export function getAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase URL or Key is not configured in environment variables');
  }

  return createClient(
    supabaseUrl || 'https://jwttjfiocgdxijgxhrww.supabase.co',
    serviceRoleKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dHRqZmlvY2dkeGlqZ3hocnd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTczOTEsImV4cCI6MjEwMzQ5MzM5MX0.TWSGakc526mR7mmkshAs7Pu_jkukBOZvP48huf2brl0',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

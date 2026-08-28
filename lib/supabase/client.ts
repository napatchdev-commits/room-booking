import { createBrowserClient } from '@supabase/ssr';

function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim();
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  clean = clean.replace(/\/+$/, '');
  return clean;
}

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jwttjfiocgdxijgxhrww.supabase.co';
  const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dHRqZmlvY2dkeGlqZ3hocnd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTczOTEsImV4cCI6MjEwMzQ5MzM5MX0.TWSGakc526mR7mmkshAs7Pu_jkukBOZvP48huf2brl0';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

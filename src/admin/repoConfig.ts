export function isSupabaseConfigured(url?: string): boolean {
  return !!url && url.includes('.supabase.co') && !url.includes('placeholder');
}

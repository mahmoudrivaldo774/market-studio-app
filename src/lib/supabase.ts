import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''

export function getSupabaseConfigurationError(): string | null {
  if (!supabaseUrl || !supabasePublishableKey) {
    return 'إعدادات الاتصال بقاعدة البيانات ناقصة. تحقق من VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY.'
  }

  try {
    const parsedUrl = new URL(supabaseUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
      return 'عنوان Supabase غير صحيح. تحقق من قيمة VITE_SUPABASE_URL.'
    }
  } catch {
    return 'عنوان Supabase غير صحيح. تحقق من قيمة VITE_SUPABASE_URL.'
  }

  return null
}

if (getSupabaseConfigurationError()) {
  console.warn('Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
})

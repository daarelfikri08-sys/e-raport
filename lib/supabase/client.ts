import { createBrowserClient } from '@supabase/ssr'

function getConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Konfigurasi Supabase belum lengkap. Atur NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }
  return { url, key }
}

export function createClient() {
  const { url, key } = getConfiguration()
  return createBrowserClient(url, key)
}

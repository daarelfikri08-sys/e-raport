'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [configurationError, setConfigurationError] = useState(false)
  useEffect(() => {
    try {
      const supabase = createClient()
      void supabase.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false) })
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setLoading(false) })
      return () => listener.subscription.unsubscribe()
    } catch { setConfigurationError(true); setLoading(false) }
  }, [])
  return { user, loading, configurationError }
}

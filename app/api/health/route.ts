import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  let validUrl = false
  let projectHost: string | null = null
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl)
      validUrl = url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')
      projectHost = validUrl ? url.hostname : null
    } catch {
      validUrl = false
    }
  }

  let authReachable = false
  let authStatus: number | null = null
  if (validUrl && supabaseUrl && anonKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`, {
        headers: { apikey: anonKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      })
      authStatus = response.status
      authReachable = response.ok
    } catch {
      authReachable = false
    }
  }

  const configured = Boolean(validUrl && anonKey && serviceRoleKey)
  return NextResponse.json(
    {
      ok: configured && authReachable,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
      configured: {
        supabaseUrl: Boolean(supabaseUrl),
        anonKey: Boolean(anonKey),
        serviceRoleKey: Boolean(serviceRoleKey),
      },
      supabase: {
        validUrl,
        projectHost,
        authReachable,
        authStatus,
      },
    },
    {
      status: configured && authReachable ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { destinationForRole, isAppRole, type AppRole } from '@/lib/auth/helpers'

type CookieToSet = { name: string; value: string; options: CookieOptions }

const protectedPrefixes: ReadonlyArray<{ prefix: string; role: AppRole }> = [
  { prefix: '/admin', role: 'admin' },
  { prefix: '/teacher', role: 'teacher' },
  { prefix: '/homeroom', role: 'homeroom_teacher' },
]

export async function middleware(request: NextRequest) {
  const match = protectedPrefixes.find(({ prefix }) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`))
  const isLogin = request.nextUrl.pathname === '/login'
  if (!match && !isLogin) return NextResponse.next()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return redirectWithCookies(request, '/configuration-error', [])

  let response = NextResponse.next({ request })
  const pendingCookies: CookieToSet[] = []
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: CookieToSet[]) {
        pendingCookies.push(...cookiesToSet)
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return match ? redirectWithCookies(request, '/login', pendingCookies) : response

  const { data: profile, error } = await supabase.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle()
  const valid = !error && profile?.is_active === true && isAppRole(profile.role)

  if (isLogin) return valid ? redirectWithCookies(request, destinationForRole(profile.role), pendingCookies) : response
  if (!valid || profile.role !== match?.role) return redirectWithCookies(request, '/unauthorized', pendingCookies)
  return response
}

function redirectWithCookies(request: NextRequest, pathname: string, cookies: CookieToSet[]) {
  const response = NextResponse.redirect(new URL(pathname, request.url))
  cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}

export const config = { matcher: ['/login', '/admin/:path*', '/teacher/:path*', '/homeroom/:path*'] }

import type { ReactNode } from 'react'
import type { AuthProfile } from '@/lib/auth/helpers'
import Footer from './Footer'
import Header from './Header'
import Sidebar from './Sidebar'

export default function DashboardShell({ profile, children }: { profile: AuthProfile; children: ReactNode }) {
  return <div className="min-h-screen"><a href="#main-content" className="sr-only z-50 rounded-lg bg-white p-4 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Lewati ke konten utama</a><Sidebar role={profile.role} /><div className="flex min-h-screen min-w-0 flex-col lg:ml-72"><Header profile={profile} /><main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 p-5 sm:p-8 lg:p-10">{children}</main><Footer /></div></div>
}

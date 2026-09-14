'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, BookOpen, ClipboardCheck, FileSpreadsheet, GraduationCap, LayoutDashboard, Menu, School, Settings, UserRound, Users, X } from 'lucide-react'
import type { AppRole } from '@/lib/auth/helpers'

interface NavigationItem { label: string; href: string; icon: ComponentType<{ className?: string }> }

export const navigation: Record<AppRole, NavigationItem[]> = {
  admin: [
    { label: 'Ringkasan', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Guru', href: '/admin/teachers', icon: Users },
    { label: 'Siswa', href: '/admin/students', icon: UserRound },
    { label: 'Kelas', href: '/admin/classes', icon: School },
    { label: 'Mata pelajaran', href: '/admin/subjects', icon: BookOpen },
    { label: 'Penugasan', href: '/admin/assignments', icon: ClipboardCheck },
    { label: 'Tahun pelajaran', href: '/admin/academic-years', icon: GraduationCap },
    { label: 'Jenis penilaian', href: '/admin/assessments', icon: FileSpreadsheet },
    { label: 'Monitoring', href: '/admin/monitoring', icon: BarChart3 },
    { label: 'Audit log', href: '/admin/audit-log', icon: ClipboardCheck },
    { label: 'Laporan', href: '/admin/reports', icon: FileSpreadsheet },
    { label: 'Pengaturan', href: '/admin/settings', icon: Settings },
  ],
  teacher: [
    { label: 'Ringkasan', href: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Kelas ajar', href: '/teacher/classes', icon: School },
    { label: 'Penilaian', href: '/teacher/grades', icon: ClipboardCheck },
    { label: 'Profil', href: '/teacher/profile', icon: UserRound },
  ],
  homeroom_teacher: [
    { label: 'Ringkasan', href: '/homeroom/dashboard', icon: LayoutDashboard },
    { label: 'Siswa', href: '/homeroom/students', icon: Users },
    { label: 'Nilai', href: '/homeroom/grades', icon: ClipboardCheck },
    { label: 'Ranking', href: '/homeroom/ranking', icon: BarChart3 },
    { label: 'Leger', href: '/homeroom/leger', icon: FileSpreadsheet },
    { label: 'Rapor', href: '/homeroom/reports', icon: BookOpen },
    { label: 'Profil', href: '/homeroom/profile', icon: UserRound },
  ],
}

export default function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const dialog = drawer.current
    const opener = trigger.current
    dialog?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const media = window.matchMedia('(min-width: 1024px)')
    const resize = () => { if (media.matches) setOpen(false) }
    media.addEventListener('change', resize)
    return () => { dialog?.close(); document.body.style.overflow = previous; media.removeEventListener('change', resize); if (!media.matches) opener?.focus() }
  }, [open])

  const content = <>
    <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6"><span className="rounded-2xl bg-teal-400 p-2.5 text-slate-950"><GraduationCap aria-hidden="true" className="h-6 w-6" /></span><div><p className="text-lg font-bold tracking-tight">E-Rapor</p><p className="text-xs text-slate-300">Ruang kerja akademik</p></div></div>
    <div className="mx-5 mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-[11px] uppercase tracking-widest text-slate-400">Akses Anda</p><p className="mt-1 text-sm font-semibold text-teal-200">{role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Guru mata pelajaran' : 'Wali kelas'}</p></div>
    <nav className="flex-1 overflow-y-auto p-4" aria-label="Navigasi dasbor">
      {['Utama', 'Akademik', 'Laporan & akun'].map(group => <div key={group} className="mb-5"><p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{group}</p>{navigation[role].filter(item => (item.href.endsWith('/dashboard') ? 'Utama' : /\/(profile|settings|reports|monitoring|ranking|leger)$/.test(item.href) ? 'Laporan & akun' : 'Akademik') === group).map(item => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const available = role === 'admin' ? !item.href.endsWith('/reports') : item.href.endsWith('/dashboard')
        return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={`mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-teal-300 text-slate-950' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}><item.icon className="h-4 w-4 shrink-0" /><span className="flex-1">{item.label}</span>{!available && <span className={`rounded px-1.5 py-0.5 text-[10px] ${active ? 'bg-slate-950/10' : 'bg-white/10 text-slate-300'}`}>Segera</span>}</Link>
      })}</div>)}
    </nav><p className="border-t border-white/10 px-6 py-4 text-xs leading-5 text-slate-300">Satu ruang untuk administrasi belajar.<br />Menu “Segera” belum tersedia.</p>
  </>

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)} className="fixed left-3 top-4 z-30 rounded-xl border bg-white p-3 shadow-sm lg:hidden" aria-label="Buka navigasi" aria-expanded={open} aria-controls="mobile-navigation">
        <Menu className="h-5 w-5" />
      </button>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-slate-950 text-white lg:flex">{content}</aside>
      <dialog ref={drawer} id="mobile-navigation" aria-label="Menu ruang kerja" onCancel={event => { event.preventDefault(); setOpen(false) }} onClick={event => { if (event.target === event.currentTarget) setOpen(false) }} className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[90vw] border-0 bg-slate-950 p-0 text-white shadow-2xl"><div className="flex h-full flex-col"><button autoFocus type="button" onClick={() => setOpen(false)} className="mx-4 mt-3 flex items-center justify-end gap-2 rounded-lg p-2 text-sm" aria-label="Tutup navigasi">Tutup <X className="h-5 w-5" /></button>{content}</div></dialog>
    </>
  )
}

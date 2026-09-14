'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Eye, EyeOff, GraduationCap, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Button from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Input'
import { destinationForRole, isAppRole } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().trim().email('Masukkan alamat email yang valid.'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter.'),
})

type LoginValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword(values)
      if (error || !data.user) {
        setFormError('Email atau kata sandi tidak sesuai.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role,is_active')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError || !profile || profile.is_active !== true || !isAppRole(profile.role)) {
        await supabase.auth.signOut()
        setFormError('Akun tidak aktif atau belum memiliki akses. Hubungi administrator sekolah.')
        return
      }

      router.replace(destinationForRole(profile.role))
      router.refresh()
    } catch {
      setFormError('Layanan belum dapat diakses. Periksa konfigurasi atau coba kembali nanti.')
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex xl:p-16"><div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" /><Link href="/" className="relative flex items-center gap-3 text-xl font-bold"><GraduationCap className="h-8 w-8 text-teal-300" /> E-Rapor</Link><div className="relative my-16 max-w-lg"><p className="text-xs font-semibold uppercase tracking-widest text-teal-300">Ruang kerja sekolah Anda</p><h2 className="mt-6 text-5xl font-bold leading-tight tracking-tight">Selamat datang<br />kembali.</h2><p className="mt-6 text-lg leading-8 text-slate-300">Langkah kecil untuk administrasi yang lebih tertib. Mulai dari ruang kerja yang sesuai dengan peran Anda.</p><div className="mt-10 flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"><ShieldCheck className="h-6 w-6 shrink-0 text-teal-300" /><p className="text-sm leading-6 text-slate-300">Akses menggunakan akun sekolah. Jangan bagikan kata sandi dan selalu keluar setelah menggunakan perangkat bersama.</p></div></div><p className="relative text-xs text-slate-400">Administrator · Guru mata pelajaran · Wali kelas</p></aside>
      <div className="flex flex-col justify-center px-5 py-10 sm:px-12"><Link href="/" className="mx-auto mb-7 flex w-full max-w-md items-center gap-2 text-sm text-slate-600 hover:text-teal-800"><ArrowLeft className="h-4 w-4" /> Kembali ke beranda</Link><section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9" aria-labelledby="login-title">
        <Link href="/" className="mb-8 flex items-center gap-3 font-semibold text-slate-900">
          <span className="rounded-lg bg-primary-600 p-2 text-white"><GraduationCap className="h-6 w-6" /></span>
          E-Rapor
        </Link>
        <h1 id="login-title" className="text-2xl font-bold text-slate-900">Masuk ke akun Anda</h1>
        <p className="mt-2 text-sm text-slate-600">Gunakan akun yang telah diberikan oleh sekolah.</p>

        {formError && <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextInput label="Email" type="email" autoComplete="email" placeholder="nama@sekolah.id" error={errors.email?.message} {...register('email')} />
          <div><TextInput label="Kata sandi" type={showPassword ? 'text' : 'password'} autoComplete="current-password" error={errors.password?.message} {...register('password')} /><button type="button" aria-controls="password" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-medium text-slate-600 hover:text-teal-800">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}</button></div>
          <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingText="Memeriksa akun...">Masuk</Button>
        </form>
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Jika mengalami kendala akses, hubungi administrator sekolah.</p>
      </section><p className="mx-auto mt-6 max-w-md text-center text-xs leading-5 text-slate-600">Peran Anda ditentukan oleh sekolah, bukan dipilih saat masuk.</p></div>
    </main>
  )
}

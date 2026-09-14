export default function ConfigurationErrorPage() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6"><section className="max-w-xl rounded-2xl border bg-white p-8"><h1 className="text-2xl font-bold">Konfigurasi aplikasi belum lengkap</h1><p className="mt-3 leading-7 text-slate-600">Administrator perlu mengatur NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY pada lingkungan aplikasi, kemudian menjalankan ulang layanan.</p></section></main>
}

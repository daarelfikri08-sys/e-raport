'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Input'
import type { SchoolSettings } from '@/types/database'
import { saveSettings } from '@/app/admin/settings/actions'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'school-assets'

type Status = { ok: boolean; message: string } | null

export default function SettingsForm({ settings }: { settings: SchoolSettings | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<Status>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(settings?.logo_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
      const path = `logo-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error

      const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const url = publicUrl.publicUrl
      setLogoPreview(url)
      setMessage({ ok: true, message: 'Logo/kop berhasil diunggah. Simpan pengaturan untuk menerapkan.' })
    } catch {
      setMessage({ ok: false, message: 'Unggah logo/kop gagal. Pastikan bucket "school-assets" sudah dibuat di Supabase Storage.' })
    } finally {
      setUploading(false)
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    const formData = new FormData(event.currentTarget)
    if (logoPreview) formData.set('logo_url', logoPreview)
    try {
      const result = await saveSettings(formData)
      setMessage(result)
      if (result.ok) router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-5 rounded-2xl border bg-white p-6" onSubmit={submit}>
      {settings && <input type="hidden" name="id" value={settings.id} />}

      {/* Logo / kop surat */}
      <div>
        <p className="text-sm font-medium text-slate-700">Logo / kop surat</p>
        <p className="mt-1 text-xs text-slate-500">Digunakan di bagian atas rapor dan dokumen akademik. Format PNG/JPG maksimal 2 MB.</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL logo dinamis dari storage/URL teks
              <img src={logoPreview} alt="Pratinjau logo" className="h-full w-full object-contain" />
            ) : <ImagePlus className="h-8 w-8 text-slate-300" />}
          </div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f) }} />
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" isLoading={uploading} loadingText="Mengunggah..." onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" /> Unggah Logo / Kop
            </Button>
            {logoPreview && <Button type="button" variant="ghost" className="text-red-700" onClick={() => setLogoPreview(null)}><Trash2 className="h-4 w-4" /> Hapus logo</Button>}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Nama {settings?.school_name ? settings.school_name : 'sekolah'}, NPSN, dan alamat tetap ditampilkan sebagai teks kop di bawah logo.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextInput name="school_name" label="Nama sekolah" required defaultValue={settings?.school_name ?? ''} />
        <TextInput name="school_npsn" label="NPSN" defaultValue={settings?.school_npsn ?? ''} />
        <TextInput name="school_phone" label="Telepon" defaultValue={settings?.school_phone ?? ''} />
        <TextInput name="school_email" type="email" label="Email" defaultValue={settings?.school_email ?? ''} />
        <TextInput name="school_website" type="url" label="Situs web (URL)" defaultValue={settings?.school_website ?? ''} />
        <TextInput name="principal_name" label="Nama kepala sekolah" defaultValue={settings?.principal_name ?? ''} />
        <TextInput name="principal_nip" label="NIP kepala sekolah" defaultValue={settings?.principal_nip ?? ''} />
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Alamat sekolah
        <textarea name="school_address" defaultValue={settings?.school_address ?? ''} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 p-3" />
      </label>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" name="ranking_enabled" defaultChecked={settings?.ranking_enabled ?? true} /> Aktifkan fitur peringkat
      </label>

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`rounded-lg px-4 py-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{message.message}</p>
      )}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <Button type="submit" isLoading={busy} loadingText="Menyimpan...">Simpan Pengaturan</Button>
        <Button type="button" variant="outline" onClick={() => router.refresh()}>Batal</Button>
      </div>
    </form>
  )
}
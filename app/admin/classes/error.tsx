'use client'

export default function ClassesError({ reset }: { reset: () => void }) {
  return <div role="alert" className="space-y-4 p-6"><p>Data kelas tidak dapat dimuat. Silakan coba lagi.</p><button className="btn-primary" onClick={reset}>Coba lagi</button></div>
}

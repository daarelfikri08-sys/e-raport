export function parseAdminQuery(params: { q?: string | string[]; page?: string | string[]; status?: string | string[] }) {
  const search = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : ''
  const page = typeof params.page === 'string' && /^[1-9]\d{0,6}$/.test(params.page) ? Number(params.page) : 1
  const status = params.status === 'active' || params.status === 'inactive' ? params.status : 'all'
  return { search, page, status }
}

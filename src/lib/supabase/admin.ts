import { createClient } from '@supabase/supabase-js'

// HANYA untuk dipakai di server (API Route / Server Action).
// Jangan pernah di-import dari Client Component: service role mem-bypass RLS.
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset')
    }

    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}
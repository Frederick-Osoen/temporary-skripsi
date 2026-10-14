import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Whitelist tujuan: tidak menerima URL bebas
  const next = searchParams.get('next') === '/reset-password' ? '/reset-password' : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('[auth/callback] exchangeCodeForSession:', error.message)
  }
  return NextResponse.redirect(`${origin}/login?error=link_invalid`)
}
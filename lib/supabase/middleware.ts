import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser() not getSession() - it's more secure and prevents spoofing
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // 1. If on /chat and NOT logged in -> Go to Login
  if (url.pathname.startsWith('/chat') && !user) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // 2. If on /auth and IS logged in -> Go to Chat
  if (url.pathname.startsWith('/auth') && user) {
    url.pathname = '/chat'
    // This is the most important part: we MUST pass the supabaseResponse cookies
    // to the redirect, otherwise the browser "forgets" we just logged in.
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie)
    })
    return response
  }

  return supabaseResponse
}

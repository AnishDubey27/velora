import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return [] // We only need setAll to set cookies on the response
          },
          setAll(cookiesToSet) {
            // This is handled by the middleware if we just redirect, but to be safe:
          },
        },
      }
    )

    // The standard way to exchange code in Route Handlers
    // Since we are just setting cookies on the response, it's easier to let the redirect
    // go through our middleware which handles cookie setting correctly, or set them here.
    // Actually, wait, the safest way in App Router is to set the cookies directly on the Response:
    let response = NextResponse.redirect(`${origin}${next}`)
    const supabaseWithCookies = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    
    const { error } = await supabaseWithCookies.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?message=Could not verify the code`)
}

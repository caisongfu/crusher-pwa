import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 无需登录即可访问的路由
const PUBLIC_ROUTES = ['/login', '/register']
// Webhook 回调路由（不需要 JWT）
const WEBHOOK_ROUTES = ['/api/payment/webhook']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request, headers: request.headers })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Webhook 直接放行
  if (WEBHOOK_ROUTES.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  // 获取当前用户（通过 getUser 而非 getSession，更安全）
  const { data: { user } } = await supabase.auth.getUser()

  // 公开路由：已登录则重定向到首页
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (user) {
      const redirectResponse = NextResponse.redirect(new URL('/', request.url))
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      return redirectResponse
    }
    supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return supabaseResponse
  }

  // 未登录：重定向到登录页，并主动清理浏览器 cookies
  if (!user) {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')

    // 清理所有可能的 Supabase cookies（防止重定向循环）
    redirectResponse.cookies.set('sb-access-token', '', { maxAge: 0, path: '/' })
    redirectResponse.cookies.set('sb-refresh-token', '', { maxAge: 0, path: '/' })

    return redirectResponse
  }

  // Admin 路由：额外验证角色
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const redirectResponse = NextResponse.redirect(new URL('/', request.url))
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      return redirectResponse
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

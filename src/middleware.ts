import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 无需登录即可访问的路由
const PUBLIC_ROUTES = ["/login", "/register"];
// Webhook 回调路由（不需要 JWT）
const WEBHOOK_ROUTES = ["/api/payment/webhook", "/api/auth/callback"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
    headers: request.headers,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Webhook 和 auth callback 直接放行
  if (WEBHOOK_ROUTES.some((route) => pathname.startsWith(route))) {
    return supabaseResponse;
  }

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 如果获取用户出错，尝试使用 session
  let currentUser = user || null;
  if (!currentUser) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    currentUser = session?.user || null;
  }
  // 公开路由：已登录则重定向到首页
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (currentUser) {
      const redirectResponse = NextResponse.redirect(new URL("/", request.url));
      redirectResponse.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
      );
      return redirectResponse;
    }
    supabaseResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    return supabaseResponse;
  }

  // 未登录：重定向到登录页
  if (!currentUser) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url)
    );
    redirectResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    return redirectResponse;
  }

  // Admin 路由：额外验证角色
  if (pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (profile?.role !== "admin") {
      const redirectResponse = NextResponse.redirect(new URL("/", request.url));
      redirectResponse.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
      );
      return redirectResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // 匹配所有路径，除了静态资源和 API 路由
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)|api).*)",
  ],
};

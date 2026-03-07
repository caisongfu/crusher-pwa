import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 无需登录即可访问的路由
const PUBLIC_ROUTES = ["/login", "/register"];
// Webhook 回调路由（不需要 JWT）
const WEBHOOK_ROUTES = ["/api/payment/webhook", "/api/auth/callback"];

// 管理员 IP 白名单（可选）
// 如果为空数组，则不启用 IP 白名单检查
// 支持单个 IP 和 CIDR 格式（例如：192.168.1.1, 10.0.0.0/24）
const ADMIN_IP_WHITELIST = (process.env.ADMIN_IP_WHITELIST || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter((ip) => ip.length > 0);

/**
 * 检查 IP 是否在 CIDR 范围内
 */
function isIPInRange(ip: string, cidr: string): boolean {
  const [range, prefixLength] = cidr.split("/");
  if (!prefixLength) {
    // 不是 CIDR，直接比较 IP
    return ip === range;
  }

  // CIDR 匹配
  const rangeParts = range.split(".").map(Number);
  const ipParts = ip.split(".").map(Number);
  const prefix = parseInt(prefixLength, 10);

  let ipNum = 0;
  let rangeNum = 0;

  for (let i = 0; i < 4; i++) {
    ipNum = (ipNum << 8) + ipParts[i];
    rangeNum = (rangeNum << 8) + rangeParts[i];
  }

  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * 检查 IP 是否在白名单中
 */
function isIPAllowed(ip: string): boolean {
  // 如果白名单为空，允许所有 IP
  if (ADMIN_IP_WHITELIST.length === 0) {
    return true;
  }

  // 检查 IP 是否在白名单中
  return ADMIN_IP_WHITELIST.some((allowedIP) => isIPInRange(ip, allowedIP));
}

/**
 * 获取客户端真实 IP
 */
function getClientIP(request: NextRequest): string {
  // 尝试从多个 header 中获取真实 IP
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  // x-forwarded-for 可能包含多个 IP，取第一个
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    if (ips.length > 0) {
      return ips[0];
    }
  }

  // 优先级：cf-connecting-ip > x-real-ip > x-forwarded-for
  return cfConnectingIP || realIP || forwarded || "unknown";
}

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
          supabaseResponse = NextResponse.next({ request });
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

  const currentUser = user || null;

  // 公开路由：已登录则重定向到首页
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (currentUser) {
      const redirectResponse = NextResponse.redirect(new URL("/", request.url));
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
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
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    redirectResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    return redirectResponse;
  }

  // 检查用户是否被禁止登录
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("disable_type, role")
    .eq("id", currentUser.id)
    .single();

  if (userProfile?.disable_type === "login_disabled") {
    await supabase.auth.signOut();
    const redirectResponse = NextResponse.redirect(
      new URL("/login?error=account_disabled", request.url)
    );
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    redirectResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    return redirectResponse;
  }

  // Admin 路由：额外验证角色（复用上面已查到的 userProfile）
  if (pathname.startsWith("/admin")) {
    if (userProfile?.role !== "admin") {
      const redirectResponse = NextResponse.redirect(new URL("/", request.url));
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      redirectResponse.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
      );
      return redirectResponse;
    }

    // 检查 IP 白名单
    if (ADMIN_IP_WHITELIST.length > 0) {
      const clientIP = getClientIP(request);

      if (!isIPAllowed(clientIP)) {
        console.warn(
          `[IP Whitelist] Blocked admin access from IP: ${clientIP}, allowed IPs: ${ADMIN_IP_WHITELIST.join(", ")}`
        );

        const redirectResponse = NextResponse.redirect(
          new URL("/?error=ip_not_allowed", request.url)
        );
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        redirectResponse.headers.set(
          "Cache-Control",
          "no-store, no-cache, must-revalidate"
        );
        return redirectResponse;
      }

      console.log(
        `[IP Whitelist] Allowed admin access from IP: ${clientIP}`
      );
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

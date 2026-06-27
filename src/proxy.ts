import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(path)
  ) {
    return NextResponse.next();
  }

  try {
    let response = NextResponse.next({ request });
    response.headers.set("x-proxy", "ran:" + path);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            response.headers.set("x-proxy", "ran:" + path);
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isPublic = path === "/" || path.startsWith("/auth");

    if (!isPublic && !isAllowed(user?.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      const r = NextResponse.redirect(url);
      r.headers.set("x-proxy", "gate:" + path);
      return r;
    }

    response.headers.set("x-proxy", "pass:" + path + ":" + (user?.email ?? "none"));
    return response;
  } catch (e) {
    const r = NextResponse.next();
    r.headers.set("x-proxy", "err:" + (e instanceof Error ? e.message : "x"));
    return r;
  }
}

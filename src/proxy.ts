import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/auth";

/**
 * Rafraîchit la session Supabase ET protège les routes :
 * - publiques : "/", "/auth/*", "/api/*" (les API ont leur propre auth : token MCP / CRON_SECRET)
 * - tout le reste exige un utilisateur connecté ET autorisé (allowlist), sinon redirection vers "/".
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Ne rien exécuter entre createServerClient et getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" || path.startsWith("/auth") || path.startsWith("/api");

  if (!isPublic && !isAllowed(user?.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const r = NextResponse.redirect(url);
    r.headers.set("x-proxy", `gate:${path}`);
    return r;
  }

  response.headers.set("x-proxy", `pass:${path}:${user?.email ?? "none"}`);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};

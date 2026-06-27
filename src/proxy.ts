import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/auth";

/**
 * Rafraîchit la session Supabase ET protège les routes :
 * - publiques : "/", "/auth/*" (les API ont leur propre auth : token MCP / CRON_SECRET)
 * - tout le reste exige un utilisateur connecté ET autorisé (allowlist), sinon redirection vers "/".
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Laisse passer les assets, le runtime Next et les routes API (auth propre).
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(path)
  ) {
    return NextResponse.next();
  }

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

  const isPublic = path === "/" || path.startsWith("/auth");

  if (!isPublic && !isAllowed(user?.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

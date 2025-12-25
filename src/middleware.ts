import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, type Locale } from "./i18n/config";

function getLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null;

  const languages = acceptLanguage.split(",").map((lang) => {
    const [code] = lang.trim().split(";");
    return code.split("-")[0].toLowerCase();
  });

  for (const lang of languages) {
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Check if locale cookie exists
  const localeCookie = request.cookies.get("locale")?.value;

  if (!localeCookie || !locales.includes(localeCookie as Locale)) {
    // Try to detect from browser
    const acceptLanguage = request.headers.get("accept-language");
    const detectedLocale = getLocaleFromAcceptLanguage(acceptLanguage) || defaultLocale;

    // Set cookie for future requests
    response.cookies.set("locale", detectedLocale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

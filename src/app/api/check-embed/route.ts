import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        // Solo profesores pueden verificar URLs
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { url } = body;

        if (!url || typeof url !== "string") {
            return NextResponse.json({
                allowed: false,
                reason: "URL inválida"
            });
        }

        // Validar formato de URL
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json({
                allowed: false,
                reason: "Formato de URL inválido"
            });
        }

        // URLs conocidas que SÍ permiten embedding
        const allowedDomains = [
            "youtube.com",
            "www.youtube.com",
            "youtu.be",
            "vimeo.com",
            "player.vimeo.com",
            "docs.google.com",
            "drive.google.com",
            "forms.google.com",
            "learningapps.org",
            "quizlet.com",
            "kahoot.it",
            "edpuzzle.com",
            "genially.com",
            "view.genially.com",
            "canva.com",
            "prezi.com",
            "slides.com",
            "codepen.io",
            "jsfiddle.net",
            "codesandbox.io",
            "scratch.mit.edu",
            "w3schools.com",
        ];

        const hostname = parsedUrl.hostname.toLowerCase();

        // Verificar si es un dominio conocido que permite embedding
        const isKnownAllowed = allowedDomains.some(domain =>
            hostname === domain || hostname.endsWith("." + domain)
        );

        if (isKnownAllowed) {
            return NextResponse.json({
                allowed: true,
                reason: "Sitio compatible con embedding",
                type: getResourceType(url)
            });
        }

        // Para otros sitios, verificar headers
        try {
            const response = await fetch(url, {
                method: "HEAD",
                redirect: "follow",
                signal: AbortSignal.timeout(5000)
            });

            const xFrameOptions = response.headers.get("x-frame-options");
            const csp = response.headers.get("content-security-policy");

            // X-Frame-Options bloquea iframes
            if (xFrameOptions) {
                const value = xFrameOptions.toLowerCase();
                if (value === "deny" || value === "sameorigin") {
                    return NextResponse.json({
                        allowed: false,
                        reason: "El sitio bloquea embedding (X-Frame-Options)"
                    });
                }
            }

            // CSP frame-ancestors también puede bloquear
            if (csp) {
                const cspLower = csp.toLowerCase();
                if (cspLower.includes("frame-ancestors 'none'") ||
                    cspLower.includes("frame-ancestors 'self'")) {
                    return NextResponse.json({
                        allowed: false,
                        reason: "El sitio bloquea embedding (Content-Security-Policy)"
                    });
                }
            }

            // No hay headers de bloqueo, probablemente funcione
            return NextResponse.json({
                allowed: true,
                reason: "Sin restricciones detectadas (puede funcionar)",
                type: getResourceType(url),
                warning: "Algunos sitios bloquean iframes de otras formas. Recomendamos probar."
            });

        } catch (fetchError) {
            // Error al verificar, no podemos confirmar
            return NextResponse.json({
                allowed: null,
                reason: "No se pudo verificar el sitio",
                warning: "Intenta con la URL de todos modos o usa un sitio conocido"
            });
        }

    } catch (error) {
        console.error("[CHECK_EMBED]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

function getResourceType(url: string): string {
    const urlLower = url.toLowerCase();

    // Videos
    if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be") ||
        urlLower.includes("vimeo.com")) {
        return "VIDEO";
    }

    // PDFs
    if (urlLower.endsWith(".pdf")) {
        return "PDF";
    }

    // Por defecto, URL
    return "URL";
}

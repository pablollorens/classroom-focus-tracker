import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const SECRET_KEY = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || "supersecretvalue123"
);

interface StudentTokenPayload {
    studentId: string;
    sessionId: string;
    username: string;
    role: string;
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("student_token")?.value;

        if (!token) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        let payload: StudentTokenPayload;
        try {
            const verified = await jwtVerify(token, SECRET_KEY);
            payload = verified.payload as unknown as StudentTokenPayload;
        } catch {
            return new NextResponse("Invalid token", { status: 401 });
        }

        if (payload.role !== "student") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const session = await prisma.session.findUnique({
            where: { id: payload.sessionId },
            include: {
                teacher: {
                    select: { email: true }
                },
                preparedLesson: {
                    include: {
                        exercises: {
                            orderBy: { orderIndex: "asc" },
                            include: {
                                resource: true
                            }
                        }
                    }
                }
            }
        });

        if (!session) {
            return new NextResponse("Session not found", { status: 404 });
        }

        if (!session.isActive) {
            return new NextResponse("Session ended", { status: 410 });
        }

        return NextResponse.json({
            session: {
                id: session.id,
                startedAt: session.startedAt,
                teacher: {
                    email: session.teacher.email
                }
            },
            lesson: {
                title: session.preparedLesson.title,
                exercises: session.preparedLesson.exercises.map(ex => {
                    // Si tiene Resource asociado, usarlo
                    if (ex.resource) {
                        return {
                            id: ex.id,
                            orderIndex: ex.orderIndex,
                            resource: {
                                id: ex.resource.id,
                                title: ex.resource.title,
                                type: ex.resource.type,
                                url: ex.resource.url,
                                content: ex.resource.content,
                                duration: ex.resource.duration
                            }
                        };
                    }
                    // Fallback: usar datos legacy del ejercicio (title, url)
                    if (ex.title && ex.url) {
                        const isYoutube = ex.url.includes("youtube.com") || ex.url.includes("youtu.be");
                        return {
                            id: ex.id,
                            orderIndex: ex.orderIndex,
                            resource: {
                                id: ex.id,
                                title: ex.title,
                                type: isYoutube ? "VIDEO" : "URL",
                                url: ex.url,
                                content: null,
                                duration: null
                            }
                        };
                    }
                    // Sin datos
                    return {
                        id: ex.id,
                        orderIndex: ex.orderIndex,
                        resource: null
                    };
                })
            }
        });

    } catch (error) {
        console.error("[SESSION_CONTENT_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

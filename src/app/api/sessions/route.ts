import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { groupId, preparedLessonId } = body;

        if (!groupId || !preparedLessonId) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const teacherId = (session.user as any).id;

        // Verify group ownership
        const group = await prisma.group.findUnique({
            where: { id: groupId }
        });

        if (!group || group.teacherId !== teacherId) {
            return new NextResponse("Forbidden (Group)", { status: 403 });
        }

        // Verify lesson ownership
        const lesson = await prisma.preparedLesson.findUnique({
            where: { id: preparedLessonId }
        });

        if (!lesson || lesson.teacherId !== teacherId) {
            return new NextResponse("Forbidden (Lesson)", { status: 403 });
        }

        // Create Session
        const newSession = await prisma.session.create({
            data: {
                teacherId: teacherId,
                groupId: groupId,
                preparedLessonId: preparedLessonId,
                isActive: true,
                password: Math.random().toString(36).slice(-6), // Simple temporary password
            }
        });

        return NextResponse.json(newSession);

    } catch (error) {
        console.error("[CREATE_SESSION]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

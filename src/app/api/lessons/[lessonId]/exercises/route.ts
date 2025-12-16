import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ lessonId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { lessonId } = await params;

    // Verify ownership
    const lesson = await prisma.preparedLesson.findUnique({
        where: { id: lessonId }
    });

    if (!lesson || lesson.teacherId !== (session.user as any).id) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {
        const body = await req.json();
        const { title, url } = body;

        // Get current exercise count to set orderIndex
        const currentCount = await prisma.exercise.count({
            where: { preparedLessonId: lessonId }
        });

        const exercise = await prisma.exercise.create({
            data: {
                title,
                url,
                orderIndex: currentCount,
                preparedLessonId: lessonId,
            },
        });

        return NextResponse.json(exercise);
    } catch (error) {
        console.error("[EXERCISE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

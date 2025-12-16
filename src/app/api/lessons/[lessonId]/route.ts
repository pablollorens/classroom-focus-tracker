import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ lessonId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { lessonId } = await params;

    try {
        const lesson = await prisma.preparedLesson.findUnique({
            where: { id: lessonId },
        });

        if (!lesson || lesson.teacherId !== (session.user as any).id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        await prisma.preparedLesson.delete({
            where: { id: lessonId },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[LESSON_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ lessonId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { lessonId } = await params;

    try {
        const lesson = await prisma.preparedLesson.findUnique({
            where: { id: lessonId },
            include: { exercises: { orderBy: { orderIndex: 'asc' } } }
        });

        if (!lesson || lesson.teacherId !== (session.user as any).id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        return NextResponse.json(lesson);
    } catch (error) {
        console.error("[LESSON_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

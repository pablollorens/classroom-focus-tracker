import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const lessons = await prisma.preparedLesson.findMany({
            where: {
                teacherId: (session.user as any).id,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                _count: {
                    select: { exercises: true }
                }
            }
        });

        return NextResponse.json(lessons);
    } catch (error) {
        console.error("[LESSONS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { title } = body;

        if (!title) {
            return new NextResponse("Title is required", { status: 400 });
        }

        const lesson = await prisma.preparedLesson.create({
            data: {
                title,
                teacherId: (session.user as any).id,
            },
        });

        return NextResponse.json(lesson);
    } catch (error) {
        console.error("[LESSONS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

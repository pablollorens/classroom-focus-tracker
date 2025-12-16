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
        const groups = await prisma.group.findMany({
            where: {
                teacherId: (session.user as any).id,
            },
            include: {
                _count: {
                    select: { students: true },
                },
                sessions: {
                    where: { isActive: true },
                    select: { id: true, preparedLesson: { select: { title: true } } },
                    take: 1
                }
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(groups);
    } catch (error) {
        console.error("[GROUPS_GET]", error);
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
        const { name } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        const group = await prisma.group.create({
            data: {
                name,
                teacherId: (session.user as any).id,
            },
        });

        return NextResponse.json(group);
    } catch (error) {
        console.error("[GROUPS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

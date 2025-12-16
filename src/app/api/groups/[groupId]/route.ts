import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { groupId } = await params;

    try {
        const group = await prisma.group.findUnique({
            where: {
                id: groupId,
            },
            include: {
                sessions: {
                    where: { isActive: true },
                    take: 1,
                    include: { preparedLesson: true }
                }
            }
        });

        if (!group) {
            return new NextResponse("Not Found", { status: 404 });
        }

        if (group.teacherId !== (session.user as any).id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        return NextResponse.json(group);
    } catch (error) {
        console.error("[GROUP_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { groupId } = await params;

    try {
        // Verify ownership
        const group = await prisma.group.findUnique({
            where: { id: groupId },
        });

        if (!group) {
            return new NextResponse("Not Found", { status: 404 });
        }

        if (group.teacherId !== (session.user as any).id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Delete group (students will cascade delete due to schema)
        await prisma.group.delete({
            where: { id: groupId },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[GROUP_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

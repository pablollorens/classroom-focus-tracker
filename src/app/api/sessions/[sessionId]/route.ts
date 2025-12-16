import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { sessionId } = await params;

    try {
        const sessionData = await prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                preparedLesson: true,
                group: true,
            }
        });

        if (!sessionData || sessionData.teacherId !== (session.user as any).id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        return NextResponse.json(sessionData);
    } catch (error) {
        console.error("[SESSION_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { sessionId } = await params;

    try {
        // Logic for "End Session" - maybe we just mark it inactive instead of deleting?
        // For now, let's mark it inactive
        await prisma.session.update({
            where: { id: sessionId },
            data: { isActive: false, endedAt: new Date() }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[SESSION_END]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkGroupOwnership(teacherId: string, groupId: string) {
    const group = await prisma.group.findUnique({
        where: { id: groupId },
    });
    return group && group.teacherId === teacherId;
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ groupId: string, studentId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { groupId, studentId } = await params;

    if (!(await checkGroupOwnership((session.user as any).id, groupId))) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {
        // Verify student belongs to group (extra safety)
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        });

        if (!student || student.groupId !== groupId) {
            return new NextResponse("Not Found", { status: 404 });
        }

        await prisma.student.delete({
            where: { id: studentId },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[STUDENT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

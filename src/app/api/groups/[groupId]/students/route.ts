
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper to check if teacher owns the group
async function checkGroupOwnership(teacherId: string, groupId: string) {
    const group = await prisma.group.findUnique({
        where: { id: groupId },
    });
    return group && group.teacherId === teacherId;
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { groupId } = await params;

    if (!(await checkGroupOwnership((session.user as any).id, groupId))) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {
        const students = await prisma.student.findMany({
            where: { groupId },
            orderBy: { lastName: "asc" },
        });
        return NextResponse.json(students);
    } catch (error) {
        console.error("[STUDENTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { groupId } = await params;

    if (!(await checkGroupOwnership((session.user as any).id, groupId))) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {
        const body = await req.json();
        const { username, firstName, lastName } = body;

        if (!username || !firstName || !lastName) {
            return new NextResponse("Missing fields", { status: 400 });
        }

        // Check for duplicate username within the group
        const existing = await prisma.student.findFirst({
            where: {
                groupId,
                username,
            },
        });

        if (existing) {
            return new NextResponse("Username already exists in this group", { status: 409 });
        }

        const student = await prisma.student.create({
            data: {
                username,
                firstName,
                lastName,
                groupId,
            },
        });

        return NextResponse.json(student);
    } catch (error) {
        console.error("[STUDENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

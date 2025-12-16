import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "student") {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { password } = body;

        if (!password) {
            return new NextResponse("Password is required", { status: 400 });
        }

        const studentId = (session.user as any).id;

        // 1. Find the student and their group
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: { group: true }
        });

        if (!student || !student.groupId) {
            return new NextResponse("Student has no group", { status: 400 });
        }

        // 2. Find ACTIVE session for this group
        const classroomSession = await prisma.session.findFirst({
            where: {
                groupId: student.groupId,
                isActive: true,
            },
            include: {
                preparedLesson: true
            }
        });

        if (!classroomSession) {
            return new NextResponse("No active session for your group", { status: 404 });
        }

        // 3. Verify Password
        if (classroomSession.password !== password) {
            return new NextResponse("Invalid Password", { status: 403 });
        }

        // 4. Create SessionAttendance record
        await prisma.sessionAttendance.upsert({
            where: {
                sessionId_studentId: {
                    sessionId: classroomSession.id,
                    studentId: student.id,
                }
            },
            create: {
                sessionId: classroomSession.id,
                studentId: student.id,
                currentStatus: "ACTIVE",
                lastHeartbeat: new Date(),
            },
            update: {
                currentStatus: "ACTIVE",
                lastHeartbeat: new Date(),
            }
        });

        // 5. Return success
        return NextResponse.json({
            sessionId: classroomSession.id,
            lessonTitle: classroomSession.preparedLesson.title,
        });

    } catch (error: any) {
        console.error("[STUDENT_SESSION_JOIN]", error);
        return new NextResponse(`Internal Error: ${error.message || error}`, { status: 500 });
    }
}

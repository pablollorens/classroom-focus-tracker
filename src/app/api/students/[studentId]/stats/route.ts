import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ studentId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { studentId } = await params;

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                activityLogs: true,
            },
        });

        if (!student) {
            return new NextResponse("Not Found", { status: 404 });
        }

        // --- Calculate Stats ---

        // 1. Total Activity Logs
        const totalLogs = student.activityLogs.length;

        // 2. Focus Score (% of ACTIVE logs)
        // Avoid division by zero
        const activeLogs = student.activityLogs.filter(log => log.status === "ACTIVE").length;
        const focusScore = totalLogs > 0 ? Math.round((activeLogs / totalLogs) * 100) : 0;

        // 3. Distractions (Count of AWAY/IDLE events)
        // Strictly counting events where status is NOT ACTIVE (IDLE, AWAY, OFFLINE)
        const distractions = student.activityLogs.filter(log => log.status === "AWAY" || log.status === "IDLE").length;

        // 4. Session History (Unique Session IDs from logs)
        // In a real app, we might query Session table directly if we track student attendance differently.
        // Here we assume if they have a log, they attended.
        const attendedSessionIds = Array.from(new Set(student.activityLogs.map(log => log.sessionId)));
        const totalSessions = attendedSessionIds.length;

        // Get details for the recent sessions (last 5)
        // We need to fetch session objects
        const recentSessions = await prisma.session.findMany({
            where: {
                id: { in: attendedSessionIds }
            },
            orderBy: { startedAt: 'desc' },
            take: 5,
            include: {
                preparedLesson: { select: { title: true } }
            }
        });

        const stats = {
            studentName: `${student.firstName} ${student.lastName}`,
            username: student.username,
            focusScore,
            totalSessions,
            distractions,
            recentSessions: recentSessions.map(s => ({
                id: s.id,
                date: s.startedAt,
                lessonTitle: s.preparedLesson?.title || "Untitled Lesson",
                // We could calculate per-session focus score here if needed
            }))
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error("[STUDENT_STATS]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

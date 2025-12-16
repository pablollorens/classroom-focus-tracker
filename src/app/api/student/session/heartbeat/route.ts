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
        const { sessionId, status } = body;

        if (!sessionId || !status) {
            return new NextResponse("Missing fields", { status: 400 });
        }

        // Update Attendance
        // We use updateMany because we don't have the unique ID readily available without querying, 
        // but we have the composite key in schema, so update works best with unique check or updateMany
        // actually we defined @@unique([sessionId, studentId]) so we can use update.

        const studentId = (session.user as any).id;



        // 1. Fetch current state
        const currentRecord = await prisma.sessionAttendance.findUnique({
            where: {
                sessionId_studentId: { sessionId, studentId }
            }
        });

        if (!currentRecord) {
            return new NextResponse("Record not found", { status: 404 });
        }

        const now = new Date();
        const isStatusChanged = currentRecord.currentStatus !== status;

        if (isStatusChanged) {
            // Calculate duration of the PREVIOUS state
            const durationSeconds = Math.round((now.getTime() - currentRecord.lastStatusChange.getTime()) / 1000);

            await prisma.$transaction([
                // Log the COMPLETED state (History)
                prisma.activityLog.create({
                    data: {
                        sessionId,
                        studentId,
                        status: currentRecord.currentStatus,
                        timestamp: currentRecord.lastStatusChange, // When it started
                        duration: durationSeconds // How long it lasted
                    }
                }),
                // Update Attendance Record
                prisma.sessionAttendance.update({
                    where: { sessionId_studentId: { sessionId, studentId } },
                    data: {
                        currentStatus: status,
                        lastHeartbeat: now,
                        lastStatusChange: now // Reset clock for new status
                    }
                })
            ]);
        } else {
            // Just update heartbeat
            await prisma.sessionAttendance.update({
                where: { sessionId_studentId: { sessionId, studentId } },
                data: { lastHeartbeat: now }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[HEARTBEAT_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

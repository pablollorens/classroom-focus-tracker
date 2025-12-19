import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const SECRET_KEY = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || "supersecretvalue123"
);

interface StudentTokenPayload {
    studentId: string;
    sessionId: string;
    username: string;
    role: string;
}

export async function POST(req: Request) {
    try {
        // Get student token from cookie
        const cookieStore = await cookies();
        const token = cookieStore.get("student_token")?.value;

        if (!token) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verify JWT
        let payload: StudentTokenPayload;
        try {
            const verified = await jwtVerify(token, SECRET_KEY);
            payload = verified.payload as unknown as StudentTokenPayload;
        } catch {
            return new NextResponse("Invalid token", { status: 401 });
        }

        if (payload.role !== "student") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { sessionId, status } = body;

        if (!sessionId || !status) {
            return new NextResponse("Missing fields", { status: 400 });
        }

        // Verify the sessionId matches the token
        if (sessionId !== payload.sessionId) {
            return new NextResponse("Session mismatch", { status: 403 });
        }

        const studentId = payload.studentId;

        // 1. Fetch current state
        const currentRecord = await prisma.sessionAttendance.findUnique({
            where: {
                sessionId_studentId: { sessionId, studentId }
            }
        });

        if (!currentRecord) {
            // Create attendance record if it doesn't exist
            await prisma.sessionAttendance.create({
                data: {
                    sessionId,
                    studentId,
                    currentStatus: status,
                    lastHeartbeat: new Date(),
                    lastStatusChange: new Date(),
                }
            });
            return NextResponse.json({ success: true });
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

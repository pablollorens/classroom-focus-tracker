import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const session = await getServerSession(authOptions);
    const { sessionId } = await params;

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Fetch all attendance records for this session
        // Include student details
        const attendance = await prisma.sessionAttendance.findMany({
            where: {
                sessionId: sessionId,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                    }
                }
            },
            orderBy: {
                student: {
                    firstName: 'asc'
                }
            }
        });

        return NextResponse.json(attendance, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (error) {
        console.error("[ATTENDANCE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

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
        const cookieStore = await cookies();
        const token = cookieStore.get("student_token")?.value;

        if (!token) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

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
        const { raised } = body;

        if (typeof raised !== "boolean") {
            return new NextResponse("Invalid request", { status: 400 });
        }

        await prisma.sessionAttendance.update({
            where: {
                sessionId_studentId: {
                    sessionId: payload.sessionId,
                    studentId: payload.studentId
                }
            },
            data: { handRaised: raised }
        });

        return NextResponse.json({ success: true, handRaised: raised });

    } catch (error) {
        console.error("[HAND_RAISE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

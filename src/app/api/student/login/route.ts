import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

const SECRET_KEY = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || "supersecretvalue123"
);

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: "Username and password are required" },
                { status: 400 }
            );
        }

        // 1. Find active session with this password
        const session = await prisma.session.findFirst({
            where: {
                password: password,
                isActive: true,
            },
            include: {
                group: {
                    include: {
                        students: true,
                    },
                },
            },
        });

        if (!session) {
            return NextResponse.json(
                { error: "Invalid session password or session not active" },
                { status: 401 }
            );
        }

        // 2. Verify student exists in the session's group
        const student = session.group.students.find(
            (s) => s.username.toLowerCase() === username.toLowerCase()
        );

        if (!student) {
            return NextResponse.json(
                { error: "Student not found in this class group" },
                { status: 401 }
            );
        }

        // 3. Generate JWT for student
        const token = await new SignJWT({
            studentId: student.id,
            sessionId: session.id,
            username: student.username,
            role: "student",
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("4h") // Session duration
            .sign(SECRET_KEY);

        // 4. Return success and token
        const response = NextResponse.json({ success: true, student });

        // Set cookie
        response.cookies.set("student_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });

        return response;

    } catch (error) {
        console.error("Student login error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

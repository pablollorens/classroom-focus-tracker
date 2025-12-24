import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function generateSessionPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// POST /api/scheduled-classes/[id]/start - Start a session from scheduled class
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the scheduled class
    const scheduledClass = await prisma.scheduledClass.findFirst({
      where: { id, teacherId: session.user.id },
    });

    if (!scheduledClass) {
      return NextResponse.json(
        { error: "Scheduled class not found" },
        { status: 404 }
      );
    }

    // Require group to be assigned before starting session
    if (!scheduledClass.groupId) {
      return NextResponse.json(
        { error: "Group must be assigned before starting a session" },
        { status: 400 }
      );
    }

    // Require lesson to be assigned before starting session
    if (!scheduledClass.preparedLessonId) {
      return NextResponse.json(
        { error: "Lesson must be assigned before starting a session" },
        { status: 400 }
      );
    }

    // Check if there's already an active session for this group
    const existingSession = await prisma.session.findFirst({
      where: {
        groupId: scheduledClass.groupId,
        isActive: true,
      },
    });

    if (existingSession) {
      return NextResponse.json(
        { error: "There is already an active session for this group" },
        { status: 409 }
      );
    }

    // Create the session
    const newSession = await prisma.session.create({
      data: {
        password: generateSessionPassword(),
        teacherId: session.user.id,
        groupId: scheduledClass.groupId,
        preparedLessonId: scheduledClass.preparedLessonId,
        isActive: true,
      },
    });

    // Fetch group and lesson names for response
    const [group, lesson] = await Promise.all([
      prisma.group.findUnique({ where: { id: scheduledClass.groupId }, select: { name: true } }),
      prisma.preparedLesson.findUnique({ where: { id: scheduledClass.preparedLessonId }, select: { title: true } }),
    ]);

    return NextResponse.json({
      sessionId: newSession.id,
      password: newSession.password,
      group: group?.name,
      lesson: lesson?.title,
    });
  } catch (error) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}

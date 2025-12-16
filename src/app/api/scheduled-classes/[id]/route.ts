import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/scheduled-classes/[id]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const scheduledClass = await prisma.scheduledClass.findFirst({
      where: { id, teacherId: session.user.id },
      include: {
        group: { select: { id: true, name: true } },
        preparedLesson: { select: { id: true, title: true } },
      },
    });

    if (!scheduledClass) {
      return NextResponse.json(
        { error: "Scheduled class not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(scheduledClass);
  } catch (error) {
    console.error("Error fetching scheduled class:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled class" },
      { status: 500 }
    );
  }
}

// PUT /api/scheduled-classes/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.scheduledClass.findFirst({
      where: { id, teacherId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Scheduled class not found" },
        { status: 404 }
      );
    }

    const scheduledClass = await prisma.scheduledClass.update({
      where: { id },
      data: {
        groupId: body.groupId ?? existing.groupId,
        preparedLessonId: body.preparedLessonId ?? existing.preparedLessonId,
        dayOfWeek: body.dayOfWeek !== undefined ? body.dayOfWeek : existing.dayOfWeek,
        specificDate: body.specificDate
          ? new Date(body.specificDate)
          : existing.specificDate,
        startTime: body.startTime ?? existing.startTime,
        duration: body.duration ?? existing.duration,
        isRecurring: body.isRecurring ?? existing.isRecurring,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
      include: {
        group: { select: { id: true, name: true } },
        preparedLesson: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(scheduledClass);
  } catch (error) {
    console.error("Error updating scheduled class:", error);
    return NextResponse.json(
      { error: "Failed to update scheduled class" },
      { status: 500 }
    );
  }
}

// DELETE /api/scheduled-classes/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.scheduledClass.findFirst({
      where: { id, teacherId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Scheduled class not found" },
        { status: 404 }
      );
    }

    await prisma.scheduledClass.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduled class:", error);
    return NextResponse.json(
      { error: "Failed to delete scheduled class" },
      { status: 500 }
    );
  }
}

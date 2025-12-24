import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/scheduled-classes
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart");
    const weekEnd = searchParams.get("weekEnd");

    const scheduledClasses = await prisma.scheduledClass.findMany({
      where: {
        teacherId: session.user.id,
        OR: [
          // Recurring classes (any week)
          { isRecurring: true },
          // Specific date classes within range
          {
            isRecurring: false,
            specificDate: {
              gte: weekStart ? new Date(weekStart) : undefined,
              lte: weekEnd ? new Date(weekEnd) : undefined,
            },
          },
        ],
      },
      include: {
        group: { select: { id: true, name: true } },
        preparedLesson: { select: { id: true, title: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(scheduledClasses);
  } catch (error) {
    console.error("Error fetching scheduled classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled classes" },
      { status: 500 }
    );
  }
}

// POST /api/scheduled-classes
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      groupId,
      preparedLessonId,
      dayOfWeek,
      specificDate,
      startTime,
      duration,
      isRecurring,
      notes,
    } = body;

    // Validations - preparedLessonId is now optional (can be assigned later)
    if (!startTime || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (isRecurring && dayOfWeek === undefined) {
      return NextResponse.json(
        { error: "dayOfWeek required for recurring classes" },
        { status: 400 }
      );
    }

    if (!isRecurring && !specificDate) {
      return NextResponse.json(
        { error: "specificDate required for non-recurring classes" },
        { status: 400 }
      );
    }

    // Verify ownership of group and lesson (if provided)
    if (preparedLessonId) {
      const lesson = await prisma.preparedLesson.findFirst({
        where: { id: preparedLessonId, teacherId: session.user.id },
      });

      if (!lesson) {
        return NextResponse.json(
          { error: "Lesson not found" },
          { status: 404 }
        );
      }
    }

    if (groupId) {
      const group = await prisma.group.findFirst({
        where: { id: groupId, teacherId: session.user.id },
      });
      if (!group) {
        return NextResponse.json(
          { error: "Group not found" },
          { status: 404 }
        );
      }
    }

    const scheduledClass = await prisma.scheduledClass.create({
      data: {
        teacher: { connect: { id: session.user.id } },
        ...(preparedLessonId && { preparedLesson: { connect: { id: preparedLessonId } } }),
        ...(groupId && { group: { connect: { id: groupId } } }),
        dayOfWeek: isRecurring ? dayOfWeek : null,
        specificDate: !isRecurring ? new Date(specificDate) : null,
        startTime,
        duration,
        isRecurring: isRecurring ?? false,
        notes: notes || null,
      },
      include: {
        group: { select: { id: true, name: true } },
        preparedLesson: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(scheduledClass, { status: 201 });
  } catch (error) {
    console.error("Error creating scheduled class:", error);
    return NextResponse.json(
      { error: "Failed to create scheduled class" },
      { status: 500 }
    );
  }
}
